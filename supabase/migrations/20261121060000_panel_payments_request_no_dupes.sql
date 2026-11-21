-- Prevent duplicate Clave dinamica requests when an approved OTP still exists,
-- and cancel leftover pending rows when OTP is used to enter Pagos.

UPDATE public.panel_payments_access p
SET status = 'cancelled'
WHERE p.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.panel_payments_access u
    WHERE u.requester_id = p.requester_id
      AND u.status = 'used'
      AND u.created_at < p.created_at
      AND u.approved_at > now() - interval '2 hours'
  );

CREATE OR REPLACE FUNCTION public.panel_payments_request_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_name text;
  v_rol text;
  v_msg public.panel_team_messages;
  v_req public.panel_payments_access;
  v_msg_exists boolean := false;
BEGIN
  IF v_uid IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo';
  END IF;
  IF public.is_panel_admin() THEN
    RAISE EXCEPTION 'Los administradores ya tienen acceso a Pagos';
  END IF;

  SELECT COALESCE(NULLIF(trim(p.nombre_visible), ''), NULLIF(trim(p.nombre), ''), 'Hunter'),
         COALESCE(p.rol, 'hunter')
    INTO v_name, v_rol
  FROM public.profiles p WHERE p.id = v_uid;

  -- Ya hay clave aprobada vigente: no crear otra solicitud
  SELECT * INTO v_req
  FROM public.panel_payments_access
  WHERE requester_id = v_uid
    AND status = 'approved'
    AND otp_expires_at > now()
  ORDER BY approved_at DESC NULLS LAST
  LIMIT 1;

  IF v_req.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'request_id', v_req.id,
      'reused', true,
      'already_approved', true
    );
  END IF;

  SELECT * INTO v_req
  FROM public.panel_payments_access
  WHERE requester_id = v_uid AND status = 'pending'
    AND created_at > now() - interval '30 minutes'
  ORDER BY created_at DESC LIMIT 1;

  IF v_req.id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.panel_team_messages m WHERE m.id = v_req.request_message_id
    ) INTO v_msg_exists;

    IF v_msg_exists THEN
      RETURN jsonb_build_object('ok', true, 'request_id', v_req.id, 'message_id', v_req.request_message_id, 'reused', true);
    END IF;

    INSERT INTO public.panel_team_messages (sender_id, sender_name, sender_rol, thread, kind, body, meta)
    VALUES (
      v_uid,
      COALESCE(v_name, 'Hunter'),
      v_rol,
      'team',
      'payments_key_request',
      'Solicito clave dinámica para entrar a Pagos.',
      jsonb_build_object(
        'requester_id', v_uid,
        'requester_name', COALESCE(v_name, 'Hunter'),
        'request_id', v_req.id,
        'status', 'pending'
      )
    )
    RETURNING * INTO v_msg;

    UPDATE public.panel_payments_access
       SET request_message_id = v_msg.id,
           requester_name = COALESCE(v_name, v_req.requester_name)
     WHERE id = v_req.id;

    RETURN jsonb_build_object('ok', true, 'request_id', v_req.id, 'message_id', v_msg.id, 'reused', true, 'restored', true);
  END IF;

  INSERT INTO public.panel_team_messages (sender_id, sender_name, sender_rol, thread, kind, body, meta)
  VALUES (
    v_uid,
    COALESCE(v_name, 'Hunter'),
    v_rol,
    'team',
    'payments_key_request',
    'Solicito clave dinámica para entrar a Pagos.',
    jsonb_build_object('requester_id', v_uid, 'requester_name', COALESCE(v_name, 'Hunter'))
  )
  RETURNING * INTO v_msg;

  INSERT INTO public.panel_payments_access (requester_id, requester_name, status, request_message_id)
  VALUES (v_uid, COALESCE(v_name, 'Hunter'), 'pending', v_msg.id)
  RETURNING * INTO v_req;

  UPDATE public.panel_team_messages
  SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('request_id', v_req.id, 'status', 'pending')
  WHERE id = v_msg.id;

  RETURN jsonb_build_object('ok', true, 'request_id', v_req.id, 'message_id', v_msg.id, 'reused', false);
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_payments_request_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_payments_request_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.panel_payments_verify_otp(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.panel_payments_access;
  v_code text := regexp_replace(COALESCE(p_code, ''), '\D', '', 'g');
BEGIN
  IF v_uid IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin sesión de equipo';
  END IF;
  IF public.is_panel_admin() THEN
    RETURN true;
  END IF;
  IF length(v_code) < 4 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_req
  FROM public.panel_payments_access
  WHERE requester_id = v_uid
    AND status = 'approved'
    AND otp_code = v_code
    AND otp_expires_at > now()
  ORDER BY approved_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.panel_payments_access SET status = 'used' WHERE id = v_req.id;

  UPDATE public.panel_payments_access
     SET status = 'cancelled'
   WHERE requester_id = v_uid
     AND status = 'pending'
     AND id <> v_req.id;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_payments_verify_otp(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_payments_verify_otp(text) TO authenticated;
