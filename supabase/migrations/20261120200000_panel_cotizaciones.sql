-- Cotizaciones guardadas (CRM liviano) + cobro desde Panel Pagos

CREATE TABLE IF NOT EXISTS public.panel_cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  proyecto_label text NOT NULL DEFAULT 'Showroom 360Preventa',
  total_cents integer NOT NULL CHECK (total_cents > 0),
  currency text NOT NULL DEFAULT 'eur' CHECK (char_length(currency) = 3),
  quote_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'cotizador',
  is_test boolean NOT NULL DEFAULT false,
  pedido_id uuid REFERENCES public.panel_pedidos(id) ON DELETE SET NULL,
  last_checkout_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS panel_cotizaciones_created_at_idx
  ON public.panel_cotizaciones (created_at DESC);

CREATE INDEX IF NOT EXISTS panel_cotizaciones_email_idx
  ON public.panel_cotizaciones (lower(customer_email));

CREATE INDEX IF NOT EXISTS panel_cotizaciones_name_idx
  ON public.panel_cotizaciones (lower(customer_name));

CREATE INDEX IF NOT EXISTS panel_cotizaciones_is_test_idx
  ON public.panel_cotizaciones (is_test);

CREATE OR REPLACE FUNCTION public.panel_cotizaciones_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS panel_cotizaciones_updated_at ON public.panel_cotizaciones;
CREATE TRIGGER panel_cotizaciones_updated_at
  BEFORE UPDATE ON public.panel_cotizaciones
  FOR EACH ROW EXECUTE FUNCTION public.panel_cotizaciones_set_updated_at();

ALTER TABLE public.panel_cotizaciones ENABLE ROW LEVEL SECURITY;

-- Público (cotizador): puede registrar cotización al descargar PDF
DROP POLICY IF EXISTS panel_cotizaciones_insert_public ON public.panel_cotizaciones;
CREATE POLICY panel_cotizaciones_insert_public
  ON public.panel_cotizaciones
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(customer_name)) >= 2
    AND char_length(trim(customer_email)) >= 5
    AND total_cents > 0
  );

-- Equipo: leer / actualizar / borrar
DROP POLICY IF EXISTS panel_cotizaciones_select_team ON public.panel_cotizaciones;
CREATE POLICY panel_cotizaciones_select_team
  ON public.panel_cotizaciones
  FOR SELECT
  TO authenticated
  USING (public.is_panel_team_member());

DROP POLICY IF EXISTS panel_cotizaciones_update_team ON public.panel_cotizaciones;
CREATE POLICY panel_cotizaciones_update_team
  ON public.panel_cotizaciones
  FOR UPDATE
  TO authenticated
  USING (public.is_panel_team_member())
  WITH CHECK (public.is_panel_team_member());

DROP POLICY IF EXISTS panel_cotizaciones_delete_team ON public.panel_cotizaciones;
CREATE POLICY panel_cotizaciones_delete_team
  ON public.panel_cotizaciones
  FOR DELETE
  TO authenticated
  USING (public.is_panel_team_member());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.panel_cotizaciones TO authenticated;
GRANT INSERT ON public.panel_cotizaciones TO anon;
GRANT ALL ON public.panel_cotizaciones TO service_role;
