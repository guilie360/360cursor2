-- BOXIES V5.9.5 — Expand development types + config_json + tipologia.componente
-- Keeps legacy CHECK values so existing rows remain valid; app normalizes on load.

ALTER TABLE public.proyecto_estructura
  DROP CONSTRAINT IF EXISTS proyecto_estructura_development_type_check;

ALTER TABLE public.proyecto_estructura
  ADD CONSTRAINT proyecto_estructura_development_type_check
  CHECK (development_type IN (
    'edificio', 'torres', 'casas', 'urbanizacion', 'loteo', 'parcelacion',
    'unidad', 'conjunto', 'lotes', 'mixto'
  ));

ALTER TABLE public.proyecto_estructura
  ADD COLUMN IF NOT EXISTS config_json jsonb;

ALTER TABLE public.tipologias
  ADD COLUMN IF NOT EXISTS componente text;
