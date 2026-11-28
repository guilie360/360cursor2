-- proyecto_config: unique per project + constructora staff can manage hero/config

CREATE UNIQUE INDEX IF NOT EXISTS proyecto_config_proyecto_id_unique
  ON public.proyecto_config (proyecto_id);

DROP POLICY IF EXISTS proyecto_config_constructora_insert ON public.proyecto_config;
CREATE POLICY proyecto_config_constructora_insert ON public.proyecto_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.proyectos p
      INNER JOIN public.usuarios_constructora uc ON uc.constructora_id = p.constructora_id
      WHERE p.id = proyecto_config.proyecto_id
        AND uc.auth_user_id = auth.uid()
        AND uc.estado = 'activo'
        AND uc.rol IN ('super_admin', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS proyecto_config_constructora_update ON public.proyecto_config;
CREATE POLICY proyecto_config_constructora_update ON public.proyecto_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.proyectos p
      INNER JOIN public.usuarios_constructora uc ON uc.constructora_id = p.constructora_id
      WHERE p.id = proyecto_config.proyecto_id
        AND uc.auth_user_id = auth.uid()
        AND uc.estado = 'activo'
        AND uc.rol IN ('super_admin', 'admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.proyectos p
      INNER JOIN public.usuarios_constructora uc ON uc.constructora_id = p.constructora_id
      WHERE p.id = proyecto_config.proyecto_id
        AND uc.auth_user_id = auth.uid()
        AND uc.estado = 'activo'
        AND uc.rol IN ('super_admin', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS proyectos_media_constructora_insert ON storage.objects;
CREATE POLICY proyectos_media_constructora_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proyectos-media'
    AND EXISTS (
      SELECT 1
      FROM public.usuarios_constructora uc
      WHERE uc.auth_user_id = auth.uid()
        AND uc.estado = 'activo'
        AND uc.rol IN ('super_admin', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS proyectos_media_constructora_update ON storage.objects;
CREATE POLICY proyectos_media_constructora_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'proyectos-media'
    AND EXISTS (
      SELECT 1
      FROM public.usuarios_constructora uc
      WHERE uc.auth_user_id = auth.uid()
        AND uc.estado = 'activo'
        AND uc.rol IN ('super_admin', 'admin', 'editor')
    )
  )
  WITH CHECK (
    bucket_id = 'proyectos-media'
    AND EXISTS (
      SELECT 1
      FROM public.usuarios_constructora uc
      WHERE uc.auth_user_id = auth.uid()
        AND uc.estado = 'activo'
        AND uc.rol IN ('super_admin', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS proyectos_media_constructora_delete ON storage.objects;
CREATE POLICY proyectos_media_constructora_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proyectos-media'
    AND EXISTS (
      SELECT 1
      FROM public.usuarios_constructora uc
      WHERE uc.auth_user_id = auth.uid()
        AND uc.estado = 'activo'
        AND uc.rol IN ('super_admin', 'admin', 'editor')
    )
  );
