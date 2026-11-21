-- BOXIES V5.7 — create from template + clone showroom (single reusable engine)

ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS is_system_template boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.proyectos.is_system_template IS
  'Hidden base template for create_showroom_from_template(). Excluded from Showrooms UI.';

CREATE UNIQUE INDEX IF NOT EXISTS proyectos_one_system_template_idx
  ON public.proyectos ((true))
  WHERE is_system_template = true;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._showroom_next_display_order()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.proyectos;
$$;

CREATE OR REPLACE FUNCTION public._showroom_unique_slug(
  p_base text,
  p_constructora_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n integer := 0;
BEGIN
  base := lower(regexp_replace(trim(COALESCE(p_base, '')), '[^a-z0-9-]+', '-', 'g'));
  base := regexp_replace(base, '-+', '-', 'g');
  base := regexp_replace(base, '^-+|-+$', '', 'g');
  IF base = '' THEN
    base := 'showroom';
  END IF;
  base := left(base, 50);

  candidate := base;
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.proyectos p
      WHERE p.slug = candidate
        AND (p_constructora_id IS NULL OR p.constructora_id = p_constructora_id)
    ) THEN
      RETURN candidate;
    END IF;
    n := n + 1;
    candidate := left(base, 44) || '-' || n::text;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._showroom_unique_copy_slug(
  p_original_slug text,
  p_constructora_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n integer := 1;
BEGIN
  base := lower(regexp_replace(trim(COALESCE(p_original_slug, '')), '[^a-z0-9-]+', '-', 'g'));
  base := regexp_replace(base, '-+', '-', 'g');
  base := regexp_replace(base, '^-+|-+$', '', 'g');
  IF base = '' THEN
    base := 'showroom';
  END IF;
  base := left(base, 48);

  candidate := base || '-copy';
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.proyectos p
      WHERE p.slug = candidate
        AND (p_constructora_id IS NULL OR p.constructora_id = p_constructora_id)
    ) THEN
      RETURN candidate;
    END IF;
    n := n + 1;
    candidate := base || '-copy-' || n::text;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._showroom_can_manage(p_constructora_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;
  RETURN (
    p_constructora_id IS NOT NULL
    AND p_constructora_id = public.get_constructora_id()
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Core: clone any showroom into a new private unpublished project
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.clone_showroom(
  p_source_id uuid,
  p_nombre text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_constructora_id uuid DEFAULT NULL,
  p_as_system_template boolean DEFAULT false
)
RETURNS public.proyectos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src public.proyectos%ROWTYPE;
  neu public.proyectos%ROWTYPE;
  v_constructora uuid;
  v_nombre text;
  v_slug text;
  v_new_id uuid := gen_random_uuid();
  viv_map jsonb := '{}'::jsonb;
  r_tip RECORD;
  r_viv RECORD;
  new_tip_id uuid;
  new_viv_id uuid;
  n_config integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO src FROM public.proyectos WHERE id = p_source_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Showroom origen no encontrado';
  END IF;

  v_constructora := COALESCE(p_constructora_id, src.constructora_id);
  IF NOT public._showroom_can_manage(v_constructora) THEN
    RAISE EXCEPTION 'Sin permiso para clonar este showroom';
  END IF;

  v_nombre := NULLIF(trim(COALESCE(p_nombre, '')), '');
  IF v_nombre IS NULL THEN
    v_nombre := 'Copia de ' || COALESCE(NULLIF(trim(src.nombre), ''), src.slug, 'Showroom');
  END IF;

  v_slug := NULLIF(trim(COALESCE(p_slug, '')), '');
  IF v_slug IS NULL THEN
    v_slug := public._showroom_unique_copy_slug(
      COALESCE(NULLIF(trim(src.slug), ''), 'showroom'),
      v_constructora
    );
  ELSE
    v_slug := public._showroom_unique_slug(v_slug, v_constructora);
  END IF;

  INSERT INTO public.proyectos (
    id,
    constructora_id,
    nombre,
    slug,
    descripcion,
    ciudad,
    direccion,
    latitud,
    longitud,
    whatsapp,
    email,
    sitio_web,
    estado,
    publicado,
    instagram_url,
    display_order,
    is_public,
    is_system_template
  ) VALUES (
    v_new_id,
    v_constructora,
    v_nombre,
    v_slug,
    src.descripcion,
    src.ciudad,
    src.direccion,
    src.latitud,
    src.longitud,
    src.whatsapp,
    src.email,
    src.sitio_web,
    src.estado,
    false,
    src.instagram_url,
    public._showroom_next_display_order(),
    false,
    COALESCE(p_as_system_template, false)
  )
  RETURNING * INTO neu;

  INSERT INTO public.proyecto_config (
    proyecto_id,
    color_accento,
    color_fondo,
    logo_url,
    favicon_url,
    fuente_titulo,
    fuente_cuerpo,
    video_hero_url,
    imagen_hero_url,
    texto_hero,
    calculadora_activa,
    tasa_interes_anual,
    analytics_id,
    project_default_theme,
    titulo_hero,
    boton_hero_1,
    boton_hero_2,
    hero_text_color,
    hero_button_text_color,
    pause_screen_config,
    show_whatsapp_float,
    show_share_float,
    whatsapp_float_link,
    whatsapp_float_message,
    share_float_url,
    menu_config,
    show_hero_logo,
    logo_style,
    show_back_button,
    back_button_label,
    back_button_url
  )
  SELECT
    v_new_id,
    c.color_accento,
    c.color_fondo,
    c.logo_url,
    c.favicon_url,
    c.fuente_titulo,
    c.fuente_cuerpo,
    c.video_hero_url,
    c.imagen_hero_url,
    c.texto_hero,
    c.calculadora_activa,
    c.tasa_interes_anual,
    c.analytics_id,
    c.project_default_theme,
    c.titulo_hero,
    c.boton_hero_1,
    c.boton_hero_2,
    c.hero_text_color,
    c.hero_button_text_color,
    c.pause_screen_config,
    c.show_whatsapp_float,
    c.show_share_float,
    c.whatsapp_float_link,
    c.whatsapp_float_message,
    c.share_float_url,
    c.menu_config,
    c.show_hero_logo,
    c.logo_style,
    c.show_back_button,
    c.back_button_label,
    c.back_button_url
  FROM public.proyecto_config c
  WHERE c.proyecto_id = src.id;

  GET DIAGNOSTICS n_config = ROW_COUNT;
  IF n_config = 0 THEN
    INSERT INTO public.proyecto_config (proyecto_id)
    VALUES (v_new_id)
    ON CONFLICT (proyecto_id) DO NOTHING;
  END IF;

  FOR r_tip IN
    SELECT * FROM public.tipologias WHERE proyecto_id = src.id ORDER BY orden NULLS LAST, created_at
  LOOP
    new_tip_id := gen_random_uuid();
    INSERT INTO public.tipologias (
      id, proyecto_id, nombre, habitaciones, banos, area_m2, precio,
      imagen_url, video_url, orden
    ) VALUES (
      new_tip_id, v_new_id, r_tip.nombre, r_tip.habitaciones, r_tip.banos, r_tip.area_m2, r_tip.precio,
      r_tip.imagen_url, r_tip.video_url, r_tip.orden
    );
  END LOOP;

  FOR r_viv IN
    SELECT * FROM public.viviendas WHERE proyecto_id = src.id ORDER BY created_at
  LOOP
    new_viv_id := gen_random_uuid();
    viv_map := viv_map || jsonb_build_object(r_viv.id::text, new_viv_id::text);
    INSERT INTO public.viviendas (
      id, proyecto_id, nombre, codigo, tipo, torre, piso,
      area_m2, habitaciones, banos, parqueaderos, precio, administracion,
      descripcion, estado, publicado, planos_modo, tour360_modo
    ) VALUES (
      new_viv_id, v_new_id, r_viv.nombre, r_viv.codigo, r_viv.tipo, r_viv.torre, r_viv.piso,
      r_viv.area_m2, r_viv.habitaciones, r_viv.banos, r_viv.parqueaderos, r_viv.precio, r_viv.administracion,
      r_viv.descripcion, r_viv.estado, r_viv.publicado, r_viv.planos_modo, r_viv.tour360_modo
    );
  END LOOP;

  INSERT INTO public.archivos (
    id, constructora_id, proyecto_id, vivienda_id, tipo, nombre, extension,
    url, miniatura_url, peso_mb, orden, es_portada, estado
  )
  SELECT
    gen_random_uuid(),
    COALESCE(a.constructora_id, v_constructora),
    v_new_id,
    CASE
      WHEN a.vivienda_id IS NULL THEN NULL
      ELSE NULLIF(viv_map ->> a.vivienda_id::text, '')::uuid
    END,
    a.tipo,
    a.nombre,
    a.extension,
    a.url,
    a.miniatura_url,
    a.peso_mb,
    a.orden,
    a.es_portada,
    a.estado
  FROM public.archivos a
  WHERE a.proyecto_id = src.id;

  INSERT INTO public.proyecto_amenidades (proyecto_id, amenidad_id)
  SELECT v_new_id, pa.amenidad_id
  FROM public.proyecto_amenidades pa
  WHERE pa.proyecto_id = src.id
  ON CONFLICT DO NOTHING;

  INSERT INTO public.proyecto_avances (
    id, proyecto_id, etapa, porcentaje, estado, orden, fecha_entrega
  )
  SELECT
    gen_random_uuid(),
    v_new_id,
    av.etapa,
    av.porcentaje,
    av.estado,
    av.orden,
    av.fecha_entrega
  FROM public.proyecto_avances av
  WHERE av.proyecto_id = src.id;

  RETURN neu;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_showroom_from_template(
  p_constructora_id uuid DEFAULT NULL
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

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
      true
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
    'Nuevo Showroom',
    'showroom-' || random_suffix,
    v_constructora,
    false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.clone_showroom(uuid, text, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_showroom_from_template(uuid) TO authenticated;
