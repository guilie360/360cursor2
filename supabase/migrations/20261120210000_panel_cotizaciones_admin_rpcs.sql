-- Admin helpers for panel cotizaciones (delete / toggle test)

CREATE OR REPLACE FUNCTION public.panel_cotizaciones_delete(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para eliminar cotizaciones';
  END IF;
  DELETE FROM public.panel_cotizaciones WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cotización no encontrada';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_cotizaciones_delete_tests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para eliminar cotizaciones';
  END IF;
  DELETE FROM public.panel_cotizaciones WHERE is_test = true;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_cotizaciones_set_test(p_id uuid, p_is_test boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para editar cotizaciones';
  END IF;
  UPDATE public.panel_cotizaciones SET is_test = COALESCE(p_is_test, false), updated_at = now()
  WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cotización no encontrada';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_cotizaciones_delete_all()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para eliminar cotizaciones';
  END IF;
  DELETE FROM public.panel_cotizaciones;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.panel_cotizaciones_delete(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.panel_cotizaciones_delete_tests() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.panel_cotizaciones_set_test(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.panel_cotizaciones_delete_all() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_cotizaciones_delete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_cotizaciones_delete_tests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_cotizaciones_set_test(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_cotizaciones_delete_all() TO authenticated;
