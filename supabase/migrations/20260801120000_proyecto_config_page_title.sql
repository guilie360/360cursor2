-- Browser tab title (distinct from og_title used for social share).
ALTER TABLE public.proyecto_config
  ADD COLUMN IF NOT EXISTS page_title text;

COMMENT ON COLUMN public.proyecto_config.page_title IS
  'Browser tab title for public /{slug} pages (distinct from og_title share title).';
