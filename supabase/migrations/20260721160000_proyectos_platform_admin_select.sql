-- Platform profiles.rol = admin can list all proyectos (Global Dashboard parity)

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND rol IN ('admin', 'super_admin')
  );
$$;

DROP POLICY IF EXISTS proyectos_platform_admin_select ON public.proyectos;
CREATE POLICY proyectos_platform_admin_select ON public.proyectos
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());
