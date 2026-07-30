-- V7.1.09 — Quotation hero namespace (separate from showroom legacy hero columns)
ALTER TABLE public.proyecto_config
  ADD COLUMN IF NOT EXISTS hero_quotation jsonb DEFAULT NULL;

COMMENT ON COLUMN public.proyecto_config.hero_quotation IS
  'Quotation Builder hero payload (UI shared with Showroom; data namespace separate).';
