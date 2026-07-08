-- Ensure visitante profile exists after OAuth sign-in (Google / Apple)
-- Requires visitantes.id DEFAULT gen_random_uuid() (see 20260707210000_visitantes_id_default.sql)

CREATE OR REPLACE FUNCTION public.ensure_oauth_visitor(p_proyecto_slug text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user auth.users;
  v_visitante_id uuid;
  v_context record;
  v_meta jsonb;
  v_nombres text;
  v_apellidos text;
  v_full_name text;
  v_login_base text;
  v_login text;
  v_constructora uuid;
  v_proyecto uuid;
BEGIN
  SELECT * INTO v_user FROM auth.users WHERE id = auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT id INTO v_visitante_id
  FROM public.visitantes
  WHERE auth_user_id = v_user.id
  LIMIT 1;

  IF v_visitante_id IS NOT NULL THEN
    RETURN v_visitante_id;
  END IF;

  v_meta := COALESCE(v_user.raw_user_meta_data, '{}'::jsonb);
  v_full_name := NULLIF(TRIM(COALESCE(
    v_meta->>'full_name',
    v_meta->>'name',
    v_meta->>'nombre',
    ''
  )), '');

  v_nombres := NULLIF(TRIM(COALESCE(
    v_meta->>'nombres',
    v_meta->>'given_name',
    split_part(COALESCE(v_full_name, ''), ' ', 1)
  )), '');

  v_apellidos := NULLIF(TRIM(COALESCE(
    v_meta->>'apellidos',
    v_meta->>'family_name',
    CASE
      WHEN v_full_name LIKE '% %' THEN TRIM(SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1))
      ELSE ''
    END
  )), '');

  SELECT * INTO v_context
  FROM public.resolve_registro_context(p_proyecto_slug, NULL::text)
  LIMIT 1;

  v_constructora := v_context.constructora_id;
  v_proyecto := v_context.proyecto_id;

  IF v_constructora IS NULL THEN
    RAISE EXCEPTION 'No hay constructora activa para registrar el visitante.';
  END IF;

  v_login_base := COALESCE(
    NULLIF(TRIM(v_meta->>'login'), ''),
    CASE
      WHEN v_nombres IS NOT NULL AND v_apellidos IS NOT NULL THEN lower(v_nombres || '.' || v_apellidos)
      ELSE split_part(v_user.email, '@', 1)
    END
  );

  v_login := public.generate_unique_visitor_login(v_login_base);

  INSERT INTO public.visitantes (
    auth_user_id,
    constructora_id,
    primer_proyecto_id,
    user_agent,
    nombres,
    apellidos,
    login,
    terminos_aceptados_at
  ) VALUES (
    v_user.id,
    v_constructora,
    v_proyecto,
    COALESCE(v_meta->>'user_agent', ''),
    v_nombres,
    v_apellidos,
    v_login,
    now()
  )
  RETURNING id INTO v_visitante_id;

  UPDATE public.profiles
  SET
    nombre = COALESCE(NULLIF(nombre, ''), COALESCE(v_nombres, '')),
    apellido = COALESCE(NULLIF(apellido, ''), COALESCE(v_apellidos, '')),
    nombre_visible = COALESCE(
      NULLIF(nombre_visible, ''),
      NULLIF(TRIM(COALESCE(v_nombres, '') || ' ' || COALESCE(v_apellidos, '')), ''),
      split_part(v_user.email, '@', 1)
    )
  WHERE id = v_user.id;

  RETURN v_visitante_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_oauth_visitor(text) TO authenticated;
