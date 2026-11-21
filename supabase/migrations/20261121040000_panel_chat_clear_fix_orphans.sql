-- Heal: pending requests without chat message block new Clave dinamica posts
UPDATE public.panel_payments_access
SET status = 'cancelled',
    otp_code = NULL,
    otp_expires_at = NULL
WHERE status = 'pending'
  AND (
    request_message_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.panel_team_messages m WHERE m.id = request_message_id
    )
  );

-- Clear Clave dinamica also cancels related access rows so new requests can post again
CREATE OR REPLACE FUNCTION public.panel_chat_clear(p_scope text DEFAULT 'team')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_scope text := lower(trim(coalesce(p_scope, 'team')));
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para borrar el chat';
  END IF;

  IF v_scope = 'clave' THEN
    DELETE FROM public.panel_team_messages
     WHERE thread = 'team'
       AND kind IN ('payments_key_request', 'payments_key_info', 'payments_key');
    GET DIAGNOSTICS v_count = ROW_COUNT;

    UPDATE public.panel_payments_access
       SET status = 'cancelled',
           otp_code = NULL,
           otp_expires_at = NULL,
           request_message_id = NULL,
           key_message_id = NULL
     WHERE status IN ('pending', 'approved');
  ELSE
    DELETE FROM public.panel_team_messages
     WHERE thread = 'team'
       AND kind NOT IN ('payments_key_request', 'payments_key_info', 'payments_key');
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_chat_clear(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_chat_clear(text) TO authenticated;

-- If a pending request lost its chat bubble, recreate the message instead of silent reuse
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
