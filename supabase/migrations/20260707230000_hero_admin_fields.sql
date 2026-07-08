-- Hero admin fields for in-showroom dashboard (profiles.admin)

ALTER TABLE public.proyecto_config
  ADD COLUMN IF NOT EXISTS titulo_hero text,
  ADD COLUMN IF NOT EXISTS boton_hero_1 text,
  ADD COLUMN IF NOT EXISTS boton_hero_2 text;

ALTER TABLE public.proyecto_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proyecto_config_admin_update_default_theme ON public.proyecto_config;

DROP POLICY IF EXISTS proyecto_config_public_select ON public.proyecto_config;
CREATE POLICY proyecto_config_public_select ON public.proyecto_config
  FOR SELECT
  USING (true);

CREATE POLICY proyecto_config_admin_insert ON public.proyecto_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

CREATE POLICY proyecto_config_admin_update ON public.proyecto_config
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

-- Storage: allow platform admins to upload hero media
DROP POLICY IF EXISTS proyectos_media_admin_insert ON storage.objects;
CREATE POLICY proyectos_media_admin_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proyectos-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS proyectos_media_admin_update ON storage.objects;
CREATE POLICY proyectos_media_admin_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'proyectos-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'proyectos-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS proyectos_media_admin_delete ON storage.objects;
CREATE POLICY proyectos_media_admin_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proyectos-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );
