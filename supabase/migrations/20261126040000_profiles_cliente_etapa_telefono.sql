ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telefono text,
  ADD COLUMN IF NOT EXISTS etapa_nombre text,
  ADD COLUMN IF NOT EXISTS etapa_pct integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_etapa_pct_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_etapa_pct_check
  CHECK (etapa_pct >= 0 AND etapa_pct <= 100 AND (etapa_pct % 5 = 0));

COMMENT ON COLUMN public.profiles.etapa_nombre IS 'Etiqueta visible en Mi perfil (editable por admin)';
COMMENT ON COLUMN public.profiles.etapa_pct IS 'Avance 0-100 en pasos de 5 (admin)';
