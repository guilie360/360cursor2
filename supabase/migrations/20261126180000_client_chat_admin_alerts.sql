-- Avisos admin (email + Web Push) cuando un cliente escribe en el chat.
-- Disparo async vía pg_net → Edge Function notify-admin-chat.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.panel_notify_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  edge_url text NOT NULL DEFAULT 'https://emefdwzdfnqgjohbtvvn.supabase.co/functions/v1/notify-admin-chat',
  webhook_secret text,
  admin_alert_email text,
  vapid_public_key text,
  vapid_private_key text,
  vapid_subject text DEFAULT 'mailto:admin@360preventa.com',
  email_cooldown_minutes integer NOT NULL DEFAULT 5,
  panel_base_url text NOT NULL DEFAULT 'https://360preventa.com/panel_gestion/',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.panel_notify_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.panel_notify_config ENABLE ROW LEVEL SECURITY;
-- Sin policies: solo service_role / SECURITY DEFINER.

CREATE TABLE IF NOT EXISTS public.panel_admin_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT panel_admin_push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS panel_admin_push_subscriptions_user_idx
  ON public.panel_admin_push_subscriptions (user_id);

ALTER TABLE public.panel_admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.panel_client_chat_alert_log (
  message_id uuid PRIMARY KEY,
  client_id uuid NOT NULL,
  emailed boolean NOT NULL DEFAULT false,
  pushed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.panel_client_chat_email_throttle (
  client_id uuid PRIMARY KEY,
  last_email_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.panel_client_chat_alert_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_client_chat_email_throttle ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.panel_notify_vapid_public()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_admin() THEN
    RAISE EXCEPTION 'Solo admin';
  END IF;
  SELECT nullif(trim(vapid_public_key), '') INTO v_key
  FROM public.panel_notify_config WHERE id = 1;
  RETURN v_key;
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_notify_vapid_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_notify_vapid_public() TO authenticated;

CREATE OR REPLACE FUNCTION public.panel_admin_push_upsert(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.is_panel_admin() THEN
    RAISE EXCEPTION 'Solo admin puede activar push';
  END IF;
  IF coalesce(nullif(trim(p_endpoint), ''), '') = ''
     OR coalesce(nullif(trim(p_p256dh), ''), '') = ''
     OR coalesce(nullif(trim(p_auth), ''), '') = '' THEN
    RAISE EXCEPTION 'Suscripción push incompleta';
  END IF;

  INSERT INTO public.panel_admin_push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  VALUES (v_uid, trim(p_endpoint), trim(p_p256dh), trim(p_auth), nullif(trim(coalesce(p_user_agent, '')), ''))
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_admin_push_upsert(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_admin_push_upsert(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.panel_admin_push_delete(p_endpoint text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_panel_admin() THEN
    RAISE EXCEPTION 'Solo admin';
  END IF;
  DELETE FROM public.panel_admin_push_subscriptions
  WHERE user_id = v_uid AND endpoint = trim(p_endpoint);
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_admin_push_delete(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_admin_push_delete(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.panel_client_chat_request_admin_alert(
  p_message_id uuid,
  p_client_id uuid,
  p_client_name text,
  p_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cfg public.panel_notify_config%ROWTYPE;
  v_req_id bigint;
BEGIN
  SELECT * INTO v_cfg FROM public.panel_notify_config WHERE id = 1;
  IF v_cfg.edge_url IS NULL OR nullif(trim(v_cfg.webhook_secret), '') IS NULL THEN
    RETURN;
  END IF;

  SELECT net.http_post(
    url := v_cfg.edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', v_cfg.webhook_secret
    ),
    body := jsonb_build_object(
      'message_id', p_message_id,
      'client_id', p_client_id,
      'client_name', coalesce(nullif(trim(p_client_name), ''), 'Cliente'),
      'body', left(coalesce(p_body, ''), 280)
    )
  ) INTO v_req_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'panel_client_chat_request_admin_alert failed: %', SQLERRM;
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_client_chat_request_admin_alert(uuid, uuid, text, text) FROM PUBLIC;

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

    PERFORM public.panel_client_chat_request_admin_alert(
      v_row.id,
      v_uid,
      COALESCE(v_name, 'Cliente'),
      v_body
    );
  END IF;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_client_chat_post(text, uuid, text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_client_chat_post(text, uuid, text, jsonb, boolean) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.panel_admin_push_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.panel_notify_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.panel_client_chat_alert_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.panel_client_chat_email_throttle TO service_role;
