-- Cada mensaje de cliente avisa en el hilo Equipo para que el admin lo vea.

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
  v_do_notify boolean := false;
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
    -- Siempre avisar al equipo cuando escribe el cliente.
    v_do_notify := true;
  ELSIF public.is_panel_admin() THEN
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'Indica el cliente';
    END IF;
    v_target := p_client_id;
    v_thread := 'client:' || p_client_id::text;
    v_do_notify := false;
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

  IF v_do_notify THEN
    INSERT INTO public.panel_team_messages (sender_id, sender_name, sender_rol, thread, kind, body, meta)
    VALUES (
      v_uid,
      COALESCE(v_name, 'Cliente'),
      'cliente',
      'team',
      'client_chat',
      ('Cliente · ' || COALESCE(v_name, 'Cliente') || ': ' || left(COALESCE(NULLIF(v_body, ''), 'Quiere chatear.'), 160)),
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

-- Lista de hilos cliente recientes (solo admin).
CREATE OR REPLACE FUNCTION public.panel_client_chat_threads(p_limit integer DEFAULT 40)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  last_body text,
  last_at timestamptz,
  unread_hint integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_admin() THEN
    RAISE EXCEPTION 'Solo admin puede listar chats de clientes';
  END IF;

  RETURN QUERY
  SELECT
    substring(m.thread from 8)::uuid AS client_id,
    COALESCE(
      NULLIF(trim(max(m.sender_name) FILTER (WHERE m.sender_rol = 'cliente')), ''),
      'Cliente'
    ) AS client_name,
    (
      SELECT m2.body
      FROM public.panel_team_messages m2
      WHERE m2.thread = m.thread
      ORDER BY m2.created_at DESC
      LIMIT 1
    ) AS last_body,
    max(m.created_at) AS last_at,
    0 AS unread_hint
  FROM public.panel_team_messages m
  WHERE m.thread LIKE 'client:%'
  GROUP BY m.thread
  ORDER BY max(m.created_at) DESC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 40), 100));
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_client_chat_threads(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_client_chat_threads(integer) TO authenticated;
