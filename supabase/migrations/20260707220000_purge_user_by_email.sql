-- Purge all platform data for an email (auth + visitante + profile + related rows)

CREATE OR REPLACE FUNCTION public.purge_user_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_auth_id uuid;
  v_visitante_ids uuid[] := ARRAY[]::uuid[];
  v_deleted jsonb := '{}'::jsonb;
  v_count integer;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Debes indicar un correo electrónico.';
  END IF;

  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE lower(email) = v_email
  LIMIT 1;

  SELECT coalesce(array_agg(v.id), ARRAY[]::uuid[])
  INTO v_visitante_ids
  FROM public.visitantes v
  WHERE (v_auth_id IS NOT NULL AND v.auth_user_id = v_auth_id)
     OR lower(v.login) = split_part(v_email, '@', 1)
     OR lower(v.login) = replace(split_part(v_email, '@', 1), '.', '');

  IF v_auth_id IS NOT NULL THEN
    DELETE FROM public.user_saved_themes WHERE profile_id = v_auth_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('user_saved_themes', v_count);

    DELETE FROM public.profiles WHERE id = v_auth_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('profiles', v_count);
  END IF;

  IF coalesce(array_length(v_visitante_ids, 1), 0) > 0 THEN
    DELETE FROM public.favoritos WHERE visitante_id = ANY(v_visitante_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('favoritos', v_count);

    DELETE FROM public.comparaciones WHERE visitante_id = ANY(v_visitante_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('comparaciones', v_count);

    DELETE FROM public.visitantes WHERE id = ANY(v_visitante_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('visitantes', v_count);
  END IF;

  DELETE FROM public.activity_log
  WHERE (v_auth_id IS NOT NULL AND actor_auth_user_id = v_auth_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('activity_log', v_count);

  DELETE FROM public.usuarios_constructora WHERE lower(email) = v_email;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('usuarios_constructora', v_count);

  DELETE FROM public.invitaciones WHERE lower(email) = v_email;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('invitaciones', v_count);

  IF v_auth_id IS NOT NULL THEN
    DELETE FROM auth.sessions WHERE user_id = v_auth_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('auth_sessions', v_count);

    DELETE FROM auth.identities WHERE user_id = v_auth_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('auth_identities', v_count);

    DELETE FROM auth.users WHERE id = v_auth_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('auth_users', v_count);
  END IF;

  v_deleted := v_deleted || jsonb_build_object(
    'email', v_email,
    'auth_user_id', v_auth_id,
    'visitante_ids', to_jsonb(v_visitante_ids)
  );

  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_user_by_email(text) FROM PUBLIC;
