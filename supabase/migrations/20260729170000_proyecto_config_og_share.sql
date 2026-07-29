-- V7.1.07 — Open Graph share preview fields for all BOXIES projects
ALTER TABLE public.proyecto_config
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text;

COMMENT ON COLUMN public.proyecto_config.og_image IS 'Open Graph / social share preview image URL';
COMMENT ON COLUMN public.proyecto_config.og_title IS 'Open Graph / social share title';
COMMENT ON COLUMN public.proyecto_config.og_description IS 'Open Graph / social share description';
