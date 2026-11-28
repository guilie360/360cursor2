-- Clear current team chat view (Equipo text vs Clave dinámica OTP kinds).
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
  ELSE
    DELETE FROM public.panel_team_messages
     WHERE thread = 'team'
       AND kind NOT IN ('payments_key_request', 'payments_key_info', 'payments_key');
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_chat_clear(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_chat_clear(text) TO authenticated;
