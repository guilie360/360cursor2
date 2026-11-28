-- Chat cliente ↔ admin (thread client:<uuid>)

CREATE OR REPLACE FUNCTION public.is_panel_cliente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(coalesce(p.rol, '')) = 'cliente'
  );
$function$;

REVOKE ALL ON FUNCTION public.is_panel_cliente() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_panel_cliente() TO authenticated;

CREATE OR REPLACE FUNCTION public.panel_client_chat_post(
  p_body text,
  p_client_id uuid DEFAULT NULL,
  p_kind text DEFAULT 'text',
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_notify_admin boolean DEFAULT false
)
RETURNS public.panel_team_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_name text;
  v_rol text;
  v_thread text;
  v_target uuid;
  v_row public.panel_team_messages;
  v_body text := coalesce(nullif(trim(p_body), ''), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión';
  END IF;

  SELECT COALESCE(NULLIF(trim(p.nombre_visible), ''), NULLIF(trim(p.nombre), ''), 'Usuario'),
         lower(COALESCE(p.rol, 'usuario'))
    INTO v_name, v_rol
  FROM public.profiles p WHERE p.id = v_uid;

  IF v_rol = 'cliente' THEN
    v_target := v_uid;
    v_thread := 'client:' || v_uid::text;
  ELSIF public.is_panel_admin() THEN
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'Indica el cliente';
    END IF;
    v_target := p_client_id;
    v_thread := 'client:' || p_client_id::text;
  ELSE
    RAISE EXCEPTION 'Sin permiso para este chat';
  END IF;

  IF v_body = '' AND coalesce(p_kind, 'text') = 'text' THEN
    RAISE EXCEPTION 'Escribe un mensaje';
  END IF;

  INSERT INTO public.panel_team_messages (sender_id, sender_name, sender_rol, thread, kind, body, meta)
  VALUES (
    v_uid,
    COALESCE(v_name, 'Usuario'),
    COALESCE(v_rol, 'usuario'),
    v_thread,
    COALESCE(NULLIF(trim(p_kind), ''), 'text'),
    v_body,
    COALESCE(p_meta, '{}'::jsonb) || jsonb_build_object('client_id', v_target::text)
  )
  RETURNING * INTO v_row;

  IF p_notify_admin AND v_rol = 'cliente' THEN
    INSERT INTO public.panel_team_messages (sender_id, sender_name, sender_rol, thread, kind, body, meta)
    VALUES (
      v_uid,
      COALESCE(v_name, 'Cliente'),
      'cliente',
      'team',
      'client_chat',
      COALESCE(NULLIF(v_body, ''), 'Quiere chatear contigo.'),
      jsonb_build_object(
        'client_id', v_uid::text,
        'client_name', COALESCE(v_name, 'Cliente'),
        'client_thread', v_thread
      )
    );
  END IF;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_client_chat_post(text, uuid, text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_client_chat_post(text, uuid, text, jsonb, boolean) TO authenticated;

DROP POLICY IF EXISTS panel_team_messages_cliente_select ON public.panel_team_messages;
CREATE POLICY panel_team_messages_cliente_select ON public.panel_team_messages
  FOR SELECT TO authenticated
  USING (
    public.is_panel_cliente()
    AND thread = ('client:' || (auth.uid())::text)
  );

DROP POLICY IF EXISTS panel_team_messages_admin_client_select ON public.panel_team_messages;
CREATE POLICY panel_team_messages_admin_client_select ON public.panel_team_messages
  FOR SELECT TO authenticated
  USING (
    public.is_panel_admin()
    AND thread LIKE 'client:%'
  );
