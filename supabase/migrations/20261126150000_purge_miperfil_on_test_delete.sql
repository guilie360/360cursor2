-- Al borrar datos de prueba / un pedido cliente, también eliminar la cuenta Auth de Mi perfil.

CREATE OR REPLACE FUNCTION public.purge_miperfil_client_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_auth_id uuid;
  v_rol text;
  v_left integer := 0;
  v_deleted jsonb := '{}'::jsonb;
  v_count integer;
BEGIN
  IF v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_vacio');
  END IF;

  -- Si aún quedan pedidos de negocio, no tocar la cuenta.
  SELECT count(*)::integer INTO v_left
  FROM public.panel_pedidos
  WHERE lower(trim(coalesce(customer_email, ''))) = v_email;
  IF v_left > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'pedidos_restantes', 'pedidos', v_left, 'email', v_email);
  END IF;

  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE lower(email) = v_email
  LIMIT 1;

  IF v_auth_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'sin_cuenta', 'email', v_email);
  END IF;

  SELECT lower(coalesce(rol, 'usuario')) INTO v_rol
  FROM public.profiles
  WHERE id = v_auth_id;

  -- Nunca borrar cuentas del equipo.
  IF v_rol IN ('hunter', 'admin', 'super_admin', 'asesor') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'cuenta_equipo', 'email', v_email, 'auth_user_id', v_auth_id);
  END IF;

  -- Solo portal cliente (o usuario sin rol de equipo vinculado al pago).
  IF v_rol IS NOT NULL AND v_rol NOT IN ('cliente', 'usuario') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rol_no_cliente', 'rol', v_rol, 'email', v_email);
  END IF;

  DELETE FROM public.panel_team_messages WHERE sender_id = v_auth_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('messages_sender', v_count);

  DELETE FROM public.panel_team_messages WHERE thread = ('client:' || v_auth_id::text);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('messages_thread', v_count);

  DELETE FROM public.panel_chat_clears WHERE user_id = v_auth_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('chat_clears', v_count);

  DELETE FROM public.panel_cotizaciones
  WHERE lower(trim(coalesce(customer_email, ''))) = v_email;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('cotizaciones', v_count);

  DELETE FROM public.profiles WHERE id = v_auth_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('profiles', v_count);

  DELETE FROM auth.sessions WHERE user_id = v_auth_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('auth_sessions', v_count);

  DELETE FROM auth.identities WHERE user_id = v_auth_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('auth_identities', v_count);

  DELETE FROM auth.users WHERE id = v_auth_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('auth_users', v_count);

  RETURN jsonb_build_object(
    'ok', true,
    'email', v_email,
    'auth_user_id', v_auth_id,
    'deleted', v_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_miperfil_client_by_email(text) FROM PUBLIC;
-- Solo vía panel_pagos_delete_tests / panel_pedido_delete_cascade / service_role.
GRANT EXECUTE ON FUNCTION public.purge_miperfil_client_by_email(text) TO service_role;

-- Borrar un pedido completo + cobros; si no quedan pedidos del email, borra Auth Mi perfil.
CREATE OR REPLACE FUNCTION public.panel_pedido_delete_cascade(p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_cobros integer := 0;
  v_auth jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para eliminar pedidos';
  END IF;

  SELECT lower(trim(coalesce(customer_email, ''))) INTO v_email
  FROM public.panel_pedidos
  WHERE id = p_pedido_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  DELETE FROM public.panel_cobros WHERE pedido_id = p_pedido_id;
  GET DIAGNOSTICS v_cobros = ROW_COUNT;

  DELETE FROM public.panel_pedidos WHERE id = p_pedido_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  v_auth := public.purge_miperfil_client_by_email(v_email);

  RETURN jsonb_build_object(
    'ok', true,
    'pedido_id', p_pedido_id,
    'email', v_email,
    'cobros', v_cobros,
    'auth', v_auth
  );
END;
$$;

REVOKE ALL ON FUNCTION public.panel_pedido_delete_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_pedido_delete_cascade(uuid) TO authenticated;

-- Pruebas Contabilidad: borrar cobros/pedidos is_test y cuentas Mi perfil huérfanas.
CREATE OR REPLACE FUNCTION public.panel_pagos_delete_tests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_cobros integer := 0;
  n_pedidos integer := 0;
  n_auth integer := 0;
  r record;
  v_auth jsonb;
  v_emails text[] := ARRAY[]::text[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_panel_team_member() THEN
    RAISE EXCEPTION 'Sin permiso de equipo para eliminar pagos de prueba';
  END IF;

  SELECT coalesce(array_agg(DISTINCT e), ARRAY[]::text[])
  INTO v_emails
  FROM (
    SELECT lower(trim(coalesce(customer_email, ''))) AS e
    FROM public.panel_pedidos
    WHERE is_test = true
      AND trim(coalesce(customer_email, '')) <> ''
    UNION
    SELECT lower(trim(coalesce(customer_email, ''))) AS e
    FROM public.panel_cobros
    WHERE is_test = true
      AND trim(coalesce(customer_email, '')) <> ''
  ) s
  WHERE e <> '';

  DELETE FROM public.panel_cobros WHERE is_test = true;
  GET DIAGNOSTICS n_cobros = ROW_COUNT;
  DELETE FROM public.panel_pedidos WHERE is_test = true;
  GET DIAGNOSTICS n_pedidos = ROW_COUNT;

  IF v_emails IS NOT NULL THEN
    FOR r IN SELECT unnest(v_emails) AS email
    LOOP
      v_auth := public.purge_miperfil_client_by_email(r.email);
      IF coalesce((v_auth->>'ok')::boolean, false)
         AND (v_auth ? 'auth_user_id')
         AND coalesce((v_auth->'deleted'->>'auth_users')::integer, 0) > 0 THEN
        n_auth := n_auth + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'cobros', n_cobros,
    'pedidos', n_pedidos,
    'auth_users', n_auth,
    'emails', to_jsonb(v_emails)
  );
END;
$$;
