-- Test flags + admin delete for Contabilidad (Pagos)

ALTER TABLE public.panel_cobros
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE public.panel_pedidos
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS panel_cobros_is_test_idx ON public.panel_cobros (is_test);
CREATE INDEX IF NOT EXISTS panel_pedidos_is_test_idx ON public.panel_pedidos (is_test);

UPDATE public.panel_cobros
SET is_test = true
WHERE is_test = false
  AND (
    COALESCE(metadata->>'is_test', '') IN ('true', '1')
    OR COALESCE(metadata->>'paddle_env', '') = 'sandbox'
    OR COALESCE(customer_email, '') ~* '(test|prueba|demo|asdf|testeo)'
    OR COALESCE(concepto, '') ~* '\y(test|prueba|testing|demo|asdf|testeo)\y'
    OR COALESCE(proyecto_label, '') ~* '\y(test|prueba|testing|demo|asdf|testeo)\y'
  );

UPDATE public.panel_pedidos
SET is_test = true
WHERE is_test = false
  AND (
    COALESCE(metadata->>'is_test', '') IN ('true', '1')
    OR COALESCE(customer_email, '') ~* '(test|prueba|demo|asdf|testeo)'
    OR COALESCE(customer_name, '') ~* '\y(test|prueba|testing|demo|asdf|testeo)\y'
    OR COALESCE(proyecto_label, '') ~* '\y(test|prueba|testing|demo|asdf|testeo)\y'
  );

UPDATE public.panel_cobros c
SET is_test = true
FROM public.panel_pedidos p
WHERE c.pedido_id = p.id AND p.is_test = true AND c.is_test = false;

UPDATE public.panel_pedidos p
SET is_test = true
WHERE p.is_test = false
  AND EXISTS (
    SELECT 1 FROM public.panel_cobros c
    WHERE c.pedido_id = p.id AND c.is_test = true
  );

CREATE OR REPLACE FUNCTION public.panel_cobros_delete(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para eliminar cobros';
  END IF;
  DELETE FROM public.panel_cobros WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cobro no encontrado';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_cobros_set_test(p_id uuid, p_is_test boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para editar cobros';
  END IF;
  UPDATE public.panel_cobros
  SET is_test = COALESCE(p_is_test, false),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('is_test', COALESCE(p_is_test, false)),
      updated_at = now()
  WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cobro no encontrado';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_cobros_delete_tests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para eliminar cobros';
  END IF;
  DELETE FROM public.panel_cobros WHERE is_test = true;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_pedidos_delete_tests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para eliminar pedidos';
  END IF;
  DELETE FROM public.panel_cobros
  WHERE is_test = true
     OR pedido_id IN (SELECT id FROM public.panel_pedidos WHERE is_test = true);
  DELETE FROM public.panel_pedidos WHERE is_test = true;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_pagos_delete_tests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_cobros integer := 0;
  n_pedidos integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para eliminar pagos de prueba';
  END IF;
  DELETE FROM public.panel_cobros WHERE is_test = true;
  GET DIAGNOSTICS n_cobros = ROW_COUNT;
  DELETE FROM public.panel_pedidos WHERE is_test = true;
  GET DIAGNOSTICS n_pedidos = ROW_COUNT;
  RETURN jsonb_build_object('cobros', n_cobros, 'pedidos', n_pedidos);
END;
$$;

REVOKE ALL ON FUNCTION public.panel_cobros_delete(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.panel_cobros_set_test(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.panel_cobros_delete_tests() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.panel_pedidos_delete_tests() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.panel_pagos_delete_tests() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.panel_cobros_delete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_cobros_set_test(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_cobros_delete_tests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_pedidos_delete_tests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_pagos_delete_tests() TO authenticated;
