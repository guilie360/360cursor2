-- Platform profiles.rol = admin/super_admin can write all proyectos
-- Parity with proyectos_platform_admin_select (read). Staff/constructora policies unchanged.

DROP POLICY IF EXISTS proyectos_platform_admin_insert ON public.proyectos;
CREATE POLICY proyectos_platform_admin_insert ON public.proyectos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS proyectos_platform_admin_update ON public.proyectos;
CREATE POLICY proyectos_platform_admin_update ON public.proyectos
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS proyectos_platform_admin_delete ON public.proyectos;
CREATE POLICY proyectos_platform_admin_delete ON public.proyectos
  FOR DELETE
  TO authenticated
  USING (public.is_platform_admin());
