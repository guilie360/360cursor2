-- Hard rule: proyectos-media is read-only for the app.
-- All new media (images, videos, icons, thumbnails) must go to Bunny.
-- Keep public SELECT so legacy URLs in proyecto_config / archivos still resolve.

DROP POLICY IF EXISTS "Usuarios autenticados pueden subir a proyectos-media" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar en proyectos-media" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar en proyectos-media" ON storage.objects;

DROP POLICY IF EXISTS proyectos_media_admin_insert ON storage.objects;
DROP POLICY IF EXISTS proyectos_media_admin_update ON storage.objects;
DROP POLICY IF EXISTS proyectos_media_admin_delete ON storage.objects;

DROP POLICY IF EXISTS proyectos_media_constructora_insert ON storage.objects;
DROP POLICY IF EXISTS proyectos_media_constructora_update ON storage.objects;
DROP POLICY IF EXISTS proyectos_media_constructora_delete ON storage.objects;
