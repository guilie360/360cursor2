-- Per-user clear: hide messages for that account only (no global delete)
CREATE TABLE IF NOT EXISTS public.panel_chat_clears (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('team', 'clave')),
  cleared_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scope)
);

ALTER TABLE public.panel_chat_clears ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS panel_chat_clears_select_own ON public.panel_chat_clears;
CREATE POLICY panel_chat_clears_select_own ON public.panel_chat_clears
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS panel_chat_clears_insert_own ON public.panel_chat_clears;
CREATE POLICY panel_chat_clears_insert_own ON public.panel_chat_clears
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS panel_chat_clears_update_own ON public.panel_chat_clears;
CREATE POLICY panel_chat_clears_update_own ON public.panel_chat_clears
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.panel_chat_mark_cleared(p_scope text DEFAULT 'team')
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_scope text := lower(trim(coalesce(p_scope, 'team')));
  v_at timestamptz := now();
BEGIN
  IF v_uid IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo';
  END IF;
  IF v_scope NOT IN ('team', 'clave') THEN
    v_scope := 'team';
  END IF;

  INSERT INTO public.panel_chat_clears (user_id, scope, cleared_at)
  VALUES (v_uid, v_scope, v_at)
  ON CONFLICT (user_id, scope)
  DO UPDATE SET cleared_at = EXCLUDED.cleared_at;

  RETURN v_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_chat_mark_cleared(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_chat_mark_cleared(text) TO authenticated;

-- Old clear RPC becomes per-user mark (no global delete)
CREATE OR REPLACE FUNCTION public.panel_chat_clear(p_scope text DEFAULT 'team')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.panel_chat_mark_cleared(p_scope);
  RETURN 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.panel_chat_clear(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_chat_clear(text) TO authenticated;
