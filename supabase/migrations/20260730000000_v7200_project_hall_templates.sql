-- V7.2.00 — Project Hall: Comparadores + Plantillas architecture
-- - Retire landing → comparator
-- - Allow experience_type template
-- - Add template_id FK (content project → reusable template)
-- - Update create_showroom_from_template naming for new types

UPDATE public.proyectos
SET experience_type = 'comparator'
WHERE experience_type = 'landing';

ALTER TABLE public.proyectos
  DROP CONSTRAINT IF EXISTS proyectos_experience_type_check;

ALTER TABLE public.proyectos
  ADD CONSTRAINT proyectos_experience_type_check
  CHECK (experience_type IN (
    'showroom',
    'presentation',
    'quotation',
    'comparator',
    'catalog',
    'template'
  ));

COMMENT ON COLUMN public.proyectos.experience_type IS
  'BOXIES project kind (V7.2). Content: showroom|presentation|quotation|comparator|catalog. Structure: template.';

ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS template_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proyectos_template_id_fkey'
  ) THEN
    ALTER TABLE public.proyectos
      ADD CONSTRAINT proyectos_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES public.proyectos(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proyectos_template_id
  ON public.proyectos (template_id)
  WHERE template_id IS NOT NULL;

COMMENT ON COLUMN public.proyectos.template_id IS
  'Optional reference to a reusable template row (experience_type=template). Content projects store data/media/config; structure lives on the template.';

/* User-facing templates are experience_type=template; keep one system bootstrap row via is_system_template. */

CREATE OR REPLACE FUNCTION public.create_showroom_from_template(
  p_constructora_id uuid DEFAULT NULL,
  p_experience_type text DEFAULT 'showroom'
)
RETURNS public.proyectos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tpl_id uuid;
  bootstrap_id uuid;
  v_constructora uuid;
  random_suffix text;
  neu public.proyectos%ROWTYPE;
  v_type text;
  v_nombre text;
  v_slug_prefix text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  v_type := lower(NULLIF(trim(COALESCE(p_experience_type, '')), ''));
  IF v_type = 'landing' THEN
    v_type := 'comparator';
  END IF;
  IF v_type IS NULL OR v_type NOT IN (
    'showroom', 'presentation', 'quotation', 'comparator', 'catalog', 'template'
  ) THEN
    v_type := 'showroom';
  END IF;

  CASE v_type
    WHEN 'presentation' THEN
      v_nombre := 'Nueva Presentación';
      v_slug_prefix := 'presentacion';
    WHEN 'quotation' THEN
      v_nombre := 'Nueva Cotización';
      v_slug_prefix := 'cotizacion';
    WHEN 'comparator' THEN
      v_nombre := 'Nuevo Comparador';
      v_slug_prefix := 'comparador';
    WHEN 'catalog' THEN
      v_nombre := 'Nuevo Catálogo';
      v_slug_prefix := 'catalogo';
    WHEN 'template' THEN
      v_nombre := 'Nueva Plantilla';
      v_slug_prefix := 'plantilla';
    ELSE
      v_nombre := 'Nuevo Showroom';
      v_slug_prefix := 'showroom';
  END CASE;

  SELECT id INTO tpl_id
  FROM public.proyectos
  WHERE is_system_template = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF tpl_id IS NULL THEN
    SELECT id, constructora_id INTO bootstrap_id, v_constructora
    FROM public.proyectos
    WHERE COALESCE(is_system_template, false) = false
    ORDER BY display_order ASC NULLS LAST, created_at ASC
    LIMIT 1;

    IF bootstrap_id IS NULL THEN
      RAISE EXCEPTION 'No hay plantilla base ni showrooms de origen';
    END IF;

    v_constructora := COALESCE(p_constructora_id, v_constructora);
    IF NOT public._showroom_can_manage(v_constructora) THEN
      RAISE EXCEPTION 'Sin permiso para crear showrooms';
    END IF;

    neu := public.clone_showroom(
      bootstrap_id,
      'Plantilla base BOXIES',
      'plantilla-boxies',
      v_constructora,
      true,
      'showroom'
    );
    tpl_id := neu.id;
  END IF;

  SELECT constructora_id INTO v_constructora FROM public.proyectos WHERE id = tpl_id;
  v_constructora := COALESCE(p_constructora_id, v_constructora, public.get_constructora_id());

  IF NOT public._showroom_can_manage(v_constructora) THEN
    RAISE EXCEPTION 'Sin permiso para crear showrooms';
  END IF;

  random_suffix := substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);

  RETURN public.clone_showroom(
    tpl_id,
    v_nombre,
    v_slug_prefix || '-' || random_suffix,
    v_constructora,
    false,
    v_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_showroom_from_template(uuid, text) TO authenticated;
