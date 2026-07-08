-- Profiles, roles, permissions and saved themes architecture

CREATE OR REPLACE FUNCTION public.default_profile_permissions()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'editarProyecto', false,
    'aplicarTemaProyecto', false,
    'subirArchivos', false,
    'gestionarUsuarios', false,
    'editarPrecios', false,
    'publicarProyecto', false
  );
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text,
  apellido text,
  nombre_visible text,
  avatar jsonb NOT NULL DEFAULT '{}'::jsonb,
  tema_actual jsonb NOT NULL DEFAULT '{}'::jsonb,
  rol text NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario', 'asesor', 'admin')),
  permisos jsonb NOT NULL DEFAULT public.default_profile_permissions(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_saved_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT 'Mi tema',
  configuracion jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_saved_themes_profile_id_idx
  ON public.user_saved_themes(profile_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_saved_themes_updated_at ON public.user_saved_themes;
CREATE TRIGGER user_saved_themes_updated_at
  BEFORE UPDATE ON public.user_saved_themes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW.rol := OLD.rol;
    NEW.permisos := OLD.permisos;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.rol IS DISTINCT FROM NEW.rol OR OLD.permisos IS DISTINCT FROM NEW.permisos)
  EXECUTE FUNCTION public.protect_profile_privileges();

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, apellido, nombre_visible, rol, permisos)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombres', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', ''),
    COALESCE(
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'nombre', '')), ''),
      TRIM(
        COALESCE(NEW.raw_user_meta_data->>'nombres', '') || ' ' ||
        COALESCE(NEW.raw_user_meta_data->>'apellidos', '')
      )
    ),
    'usuario',
    public.default_profile_permissions()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

INSERT INTO public.profiles (id, nombre, apellido, nombre_visible, rol, permisos)
SELECT
  v.auth_user_id,
  v.nombres,
  v.apellidos,
  COALESCE(NULLIF(TRIM(v.nombres || ' ' || v.apellidos), ''), v.login),
  'usuario',
  public.default_profile_permissions()
FROM public.visitantes v
WHERE v.auth_user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS user_saved_themes_select_own ON public.user_saved_themes;
CREATE POLICY user_saved_themes_select_own ON public.user_saved_themes
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS user_saved_themes_insert_own ON public.user_saved_themes;
CREATE POLICY user_saved_themes_insert_own ON public.user_saved_themes
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS user_saved_themes_update_own ON public.user_saved_themes;
CREATE POLICY user_saved_themes_update_own ON public.user_saved_themes
  FOR UPDATE USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS user_saved_themes_delete_own ON public.user_saved_themes;
CREATE POLICY user_saved_themes_delete_own ON public.user_saved_themes
  FOR DELETE USING (auth.uid() = profile_id);
