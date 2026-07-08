-- Official project default theme (independent from user tema_actual)

ALTER TABLE public.proyecto_config
ADD COLUMN IF NOT EXISTS project_default_theme jsonb DEFAULT NULL;

DROP POLICY IF EXISTS proyecto_config_admin_update_default_theme ON public.proyecto_config;
CREATE POLICY proyecto_config_admin_update_default_theme ON public.proyecto_config
  FOR UPDATE
  TO authenticated
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
