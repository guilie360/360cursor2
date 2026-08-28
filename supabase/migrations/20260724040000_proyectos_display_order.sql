-- Manual showroom ordering (BOXIES V5.5)
-- display_order is independent of nombre/slug/publicado/updated_at.

ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS display_order integer;

COMMENT ON COLUMN public.proyectos.display_order IS
  'Manual list position (ASC). Independent of identity and publish fields.';

-- One-time backfill for existing rows: preserve current Showrooms/Landing order
-- (previously sorted by updated_at DESC).
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id ASC
    ) AS rn
  FROM public.proyectos
  WHERE display_order IS NULL
)
UPDATE public.proyectos AS p
SET display_order = ordered.rn
FROM ordered
WHERE p.id = ordered.id
  AND p.display_order IS NULL;

CREATE INDEX IF NOT EXISTS proyectos_display_order_idx
  ON public.proyectos (display_order ASC NULLS LAST);
