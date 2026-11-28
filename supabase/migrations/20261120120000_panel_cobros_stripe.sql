-- Panel cobros Stripe (EUR) — registro de enlaces Checkout + estado de pago

CREATE TABLE IF NOT EXISTS public.panel_cobros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  concepto text NOT NULL DEFAULT '',
  proyecto_label text NOT NULL DEFAULT '',
  customer_email text,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'eur' CHECK (char_length(currency) = 3),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cobrado', 'fallido', 'cancelado')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  checkout_url text,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS panel_cobros_stripe_session_uidx
  ON public.panel_cobros (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS panel_cobros_created_at_idx
  ON public.panel_cobros (created_at DESC);

CREATE INDEX IF NOT EXISTS panel_cobros_status_idx
  ON public.panel_cobros (status);

CREATE OR REPLACE FUNCTION public.panel_cobros_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS panel_cobros_updated_at ON public.panel_cobros;
CREATE TRIGGER panel_cobros_updated_at
  BEFORE UPDATE ON public.panel_cobros
  FOR EACH ROW EXECUTE FUNCTION public.panel_cobros_set_updated_at();

CREATE OR REPLACE FUNCTION public.is_panel_team_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.rol IN ('hunter', 'admin', 'super_admin', 'asesor')
  );
$$;

REVOKE ALL ON FUNCTION public.is_panel_team_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_panel_team_member() TO authenticated;

ALTER TABLE public.panel_cobros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS panel_cobros_select_team ON public.panel_cobros;
CREATE POLICY panel_cobros_select_team
  ON public.panel_cobros
  FOR SELECT
  TO authenticated
  USING (public.is_panel_team_member());

-- Escrituras (insert/update/delete) solo vía service_role (Edge Functions).
-- No hay policies de INSERT/UPDATE/DELETE para authenticated/anon.

GRANT SELECT ON public.panel_cobros TO authenticated;
GRANT ALL ON public.panel_cobros TO service_role;
