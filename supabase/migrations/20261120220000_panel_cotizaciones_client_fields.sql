ALTER TABLE public.panel_cotizaciones
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_country text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS vat_id text;

CREATE INDEX IF NOT EXISTS panel_cotizaciones_phone_idx
  ON public.panel_cotizaciones (customer_phone)
  WHERE customer_phone IS NOT NULL;
