-- BOXIES V5.9 — clone helper for estructura tables (called from clone flows / future clone_showroom patch)
CREATE OR REPLACE FUNCTION public.clone_proyecto_estructura(p_src uuid, p_dst uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  new_edificio_id uuid;
  edificio_map jsonb := '{}'::jsonb;
  tip_map jsonb := '{}'::jsonb;
  planta_map jsonb := '{}'::jsonb;
  new_tip_id uuid;
  new_planta_id uuid;
BEGIN
  IF p_src IS NULL OR p_dst IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.proyecto_estructura (
    proyecto_id, development_type, org_etapas, org_sectores, org_manzanas,
    total_viviendas, total_lotes, tipologias_count, repeat_floor_distribution,
    draft_json, applied_at, version
  )
  SELECT
    p_dst, development_type, org_etapas, org_sectores, org_manzanas,
    total_viviendas, total_lotes, tipologias_count, repeat_floor_distribution,
    NULL, applied_at, version
  FROM public.proyecto_estructura
  WHERE proyecto_id = p_src
  ON CONFLICT (proyecto_id) DO UPDATE SET
    development_type = EXCLUDED.development_type,
    org_etapas = EXCLUDED.org_etapas,
    org_sectores = EXCLUDED.org_sectores,
    org_manzanas = EXCLUDED.org_manzanas,
    total_viviendas = EXCLUDED.total_viviendas,
    total_lotes = EXCLUDED.total_lotes,
    tipologias_count = EXCLUDED.tipologias_count,
    repeat_floor_distribution = EXCLUDED.repeat_floor_distribution,
    applied_at = EXCLUDED.applied_at,
    version = EXCLUDED.version,
    updated_at = now();

  FOR r IN
    SELECT * FROM public.proyecto_edificios
    WHERE proyecto_id = p_src AND archived = false
    ORDER BY orden
  LOOP
    new_edificio_id := gen_random_uuid();
    edificio_map := edificio_map || jsonb_build_object(r.id::text, new_edificio_id::text);
    INSERT INTO public.proyecto_edificios (
      id, proyecto_id, kind, nombre, pisos, sotanos, rooftop, unidades_por_piso, orden, config_json, archived
    ) VALUES (
      new_edificio_id, p_dst, r.kind, r.nombre, r.pisos, r.sotanos, r.rooftop, r.unidades_por_piso, r.orden, r.config_json, false
    );
  END LOOP;

  INSERT INTO public.proyecto_niveles (
    id, proyecto_id, edificio_id, kind, numero, nombre, orden, archived
  )
  SELECT
    gen_random_uuid(),
    p_dst,
    NULLIF(edificio_map ->> n.edificio_id::text, '')::uuid,
    n.kind, n.numero, n.nombre, n.orden, false
  FROM public.proyecto_niveles n
  WHERE n.proyecto_id = p_src AND n.archived = false
    AND n.edificio_id IS NOT NULL
    AND edificio_map ? n.edificio_id::text;

  /* Tipologías are cloned by clone_showroom already; remap plantas/ambientes if tipologias exist on dest by orden */
  /* Prefer explicit tipologia clone map by matching orden+nombre on destination */
  FOR r IN
    SELECT s.id AS src_id, d.id AS dst_id
    FROM public.tipologias s
    JOIN public.tipologias d
      ON d.proyecto_id = p_dst AND d.orden IS NOT DISTINCT FROM s.orden AND d.nombre = s.nombre
    WHERE s.proyecto_id = p_src AND COALESCE(s.archived, false) = false
  LOOP
    tip_map := tip_map || jsonb_build_object(r.src_id::text, r.dst_id::text);
  END LOOP;

  FOR r IN
    SELECT * FROM public.tipologia_plantas
    WHERE proyecto_id = p_src AND archived = false
    ORDER BY orden
  LOOP
    IF NOT (tip_map ? r.tipologia_id::text) THEN CONTINUE; END IF;
    new_planta_id := gen_random_uuid();
    planta_map := planta_map || jsonb_build_object(r.id::text, new_planta_id::text);
    INSERT INTO public.tipologia_plantas (id, tipologia_id, proyecto_id, nombre, orden, archived)
    VALUES (
      new_planta_id,
      NULLIF(tip_map ->> r.tipologia_id::text, '')::uuid,
      p_dst,
      r.nombre,
      r.orden,
      false
    );
  END LOOP;

  INSERT INTO public.tipologia_ambientes (
    id, tipologia_id, planta_id, proyecto_id, nombre, orden, archived
  )
  SELECT
    gen_random_uuid(),
    NULLIF(tip_map ->> a.tipologia_id::text, '')::uuid,
    CASE WHEN a.planta_id IS NULL THEN NULL ELSE NULLIF(planta_map ->> a.planta_id::text, '')::uuid END,
    p_dst,
    a.nombre,
    a.orden,
    false
  FROM public.tipologia_ambientes a
  WHERE a.proyecto_id = p_src AND a.archived = false
    AND tip_map ? a.tipologia_id::text;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_proyecto_estructura(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_proyecto_estructura(uuid, uuid) TO authenticated;
