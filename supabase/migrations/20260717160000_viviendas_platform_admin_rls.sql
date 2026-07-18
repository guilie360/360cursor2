-- Platform profiles.rol = admin can manage viviendas/archivos (parity with proyecto_config)
DROP POLICY IF EXISTS viviendas_platform_admin_all ON public.viviendas;
CREATE POLICY viviendas_platform_admin_all ON public.viviendas
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS archivos_platform_admin_all ON public.archivos;
CREATE POLICY archivos_platform_admin_all ON public.archivos
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );
