-- Public marketplace/landing visibility (BOXIES V5.6)
-- Independent of publicado (deployed/ready). Default private.

ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.proyectos.is_public IS
  'Visible on landing/marketplace when true AND publicado. Independent of publish state.';

CREATE INDEX IF NOT EXISTS proyectos_public_listing_idx
  ON public.proyectos (display_order ASC NULLS LAST)
  WHERE publicado = true AND is_public = true;
