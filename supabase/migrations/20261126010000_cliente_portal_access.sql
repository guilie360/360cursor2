-- Cliente portal: lookup auth user + RLS read own quotes/orders

CREATE OR REPLACE FUNCTION public.auth_email()
RETURNS text
LANGUAGE sql
STABLE
AS $function$
  SELECT lower(nullif(trim(coalesce(auth.jwt()->>'email', '')), ''));
$function$;

CREATE OR REPLACE FUNCTION public.lookup_auth_user_id(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'auth', 'public'
AS $function$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.lookup_auth_user_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_auth_user_id(text) TO service_role;

DROP POLICY IF EXISTS panel_cotizaciones_cliente_select ON public.panel_cotizaciones;
CREATE POLICY panel_cotizaciones_cliente_select ON public.panel_cotizaciones
  FOR SELECT TO authenticated
  USING (
    public.auth_email() IS NOT NULL
    AND lower(trim(customer_email)) = public.auth_email()
  );

DROP POLICY IF EXISTS panel_pedidos_cliente_select ON public.panel_pedidos;
CREATE POLICY panel_pedidos_cliente_select ON public.panel_pedidos
  FOR SELECT TO authenticated
  USING (
    public.auth_email() IS NOT NULL
    AND lower(trim(customer_email)) = public.auth_email()
  );

DROP POLICY IF EXISTS panel_cobros_cliente_select ON public.panel_cobros;
CREATE POLICY panel_cobros_cliente_select ON public.panel_cobros
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.panel_pedidos p
      WHERE p.id = panel_cobros.pedido_id
        AND public.auth_email() IS NOT NULL
        AND lower(trim(p.customer_email)) = public.auth_email()
    )
  );
