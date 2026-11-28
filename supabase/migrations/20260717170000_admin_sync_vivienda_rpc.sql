-- Admin RPCs for viviendas CRUD (authenticated platform admin or constructora staff)
CREATE OR REPLACE FUNCTION public.admin_sync_vivienda(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_plat_admin boolean := false;
  is_staff boolean := false;
  pid uuid;
  vid uuid;
  result public.viviendas%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  pid := NULLIF(payload->>'proyecto_id', '')::uuid;
  IF pid IS NULL THEN
    RAISE EXCEPTION 'proyecto_id requerido';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.rol = 'admin'
  ) INTO is_plat_admin;

  SELECT EXISTS (
    SELECT 1 FROM public.proyectos pr
    WHERE pr.id = pid
      AND (pr.constructora_id = public.get_constructora_id() OR public.is_super_admin())
  ) INTO is_staff;

  IF NOT is_plat_admin AND NOT is_staff THEN
    RAISE EXCEPTION 'Sin permiso para gestionar viviendas';
  END IF;

  vid := NULLIF(payload->>'id', '')::uuid;

  IF vid IS NULL THEN
    INSERT INTO public.viviendas (
      proyecto_id, nombre, codigo, tipo, torre, piso,
      area_m2, habitaciones, banos, parqueaderos, precio, administracion,
      estado, publicado, planos_modo, tour360_modo
    ) VALUES (
      pid,
      COALESCE(NULLIF(trim(payload->>'nombre'), ''), 'Nueva vivienda'),
      NULLIF(trim(payload->>'codigo'), ''),
      NULLIF(trim(payload->>'tipo'), ''),
      NULLIF(trim(payload->>'torre'), ''),
      NULLIF(payload->>'piso', '')::int,
      COALESCE(NULLIF(payload->>'area_m2', '')::numeric, 0),
      COALESCE(NULLIF(payload->>'habitaciones', '')::int, 0),
      COALESCE(NULLIF(payload->>'banos', '')::int, 0),
      COALESCE(NULLIF(payload->>'parqueaderos', '')::int, 0),
      COALESCE(NULLIF(payload->>'precio', '')::numeric, 0),
      COALESCE(NULLIF(payload->>'administracion', '')::numeric, 0),
      COALESCE(NULLIF(payload->>'estado', ''), 'disponible')::estado_vivienda,
      COALESCE((payload->>'publicado')::boolean, true),
      COALESCE(NULLIF(payload->>'planos_modo', ''), 'proximamente'),
      COALESCE(NULLIF(payload->>'tour360_modo', ''), 'proximamente')
    )
    RETURNING * INTO result;
  ELSE
    UPDATE public.viviendas SET
      nombre = COALESCE(NULLIF(trim(payload->>'nombre'), ''), nombre),
      codigo = NULLIF(trim(payload->>'codigo'), ''),
      tipo = NULLIF(trim(payload->>'tipo'), ''),
      torre = NULLIF(trim(payload->>'torre'), ''),
      piso = NULLIF(payload->>'piso', '')::int,
      area_m2 = COALESCE(NULLIF(payload->>'area_m2', '')::numeric, area_m2),
      habitaciones = COALESCE(NULLIF(payload->>'habitaciones', '')::int, habitaciones),
      banos = COALESCE(NULLIF(payload->>'banos', '')::int, banos),
      parqueaderos = COALESCE(NULLIF(payload->>'parqueaderos', '')::int, parqueaderos),
      precio = COALESCE(NULLIF(payload->>'precio', '')::numeric, precio),
      administracion = COALESCE(NULLIF(payload->>'administracion', '')::numeric, administracion),
      estado = COALESCE(NULLIF(payload->>'estado', ''), estado::text)::estado_vivienda,
      publicado = COALESCE((payload->>'publicado')::boolean, publicado),
      planos_modo = COALESCE(NULLIF(payload->>'planos_modo', ''), planos_modo),
      tour360_modo = COALESCE(NULLIF(payload->>'tour360_modo', ''), tour360_modo),
      updated_at = now()
    WHERE id = vid AND proyecto_id = pid
    RETURNING * INTO result;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vivienda no encontrada';
    END IF;
  END IF;

  RETURN to_jsonb(result);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_sync_vivienda(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_sync_vivienda(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sync_vivienda(jsonb) TO anon;

CREATE OR REPLACE FUNCTION public.admin_delete_viviendas(p_proyecto_id uuid, p_ids uuid[])
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_plat_admin boolean := false;
  is_staff boolean := false;
  deleted_count int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.rol = 'admin'
  ) INTO is_plat_admin;

  SELECT EXISTS (
    SELECT 1 FROM public.proyectos pr
    WHERE pr.id = p_proyecto_id
      AND (pr.constructora_id = public.get_constructora_id() OR public.is_super_admin())
  ) INTO is_staff;

  IF NOT is_plat_admin AND NOT is_staff THEN
    RAISE EXCEPTION 'Sin permiso para eliminar viviendas';
  END IF;

  DELETE FROM public.viviendas
  WHERE proyecto_id = p_proyecto_id
    AND id = ANY(p_ids);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_viviendas(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_viviendas(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_viviendas(uuid, uuid[]) TO anon;
