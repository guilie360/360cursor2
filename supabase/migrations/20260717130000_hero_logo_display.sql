-- Hero logo visibility + display style
ALTER TABLE public.proyecto_config
  ADD COLUMN IF NOT EXISTS show_hero_logo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS logo_style text DEFAULT 'flat';

COMMENT ON COLUMN public.proyecto_config.show_hero_logo IS 'Show logo on showroom hero cover';
COMMENT ON COLUMN public.proyecto_config.logo_style IS 'flat = transparent logo, avatar = circular crop';
