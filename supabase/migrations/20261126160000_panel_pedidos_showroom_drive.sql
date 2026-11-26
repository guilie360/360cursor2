-- Enlaces de showroom + Drive para Mi perfil (admin pega URLs en Base de datos).

ALTER TABLE public.panel_pedidos
  ADD COLUMN IF NOT EXISTS showroom_url text,
  ADD COLUMN IF NOT EXISTS showroom_thumb_url text,
  ADD COLUMN IF NOT EXISTS drive_folder_url text;

COMMENT ON COLUMN public.panel_pedidos.showroom_url IS
  'URL pública del showroom (abre en nueva pestaña desde Mi perfil).';
COMMENT ON COLUMN public.panel_pedidos.showroom_thumb_url IS
  'Miniatura / cover del showroom en Mi perfil.';
COMMENT ON COLUMN public.panel_pedidos.drive_folder_url IS
  'Carpeta Drive del proyecto (Archivos en Mi perfil).';
