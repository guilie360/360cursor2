-- URL de contrato para firmar (visible en Mi perfil → Mis documentos)
ALTER TABLE public.panel_pedidos
  ADD COLUMN IF NOT EXISTS contrato_url text;

COMMENT ON COLUMN public.panel_pedidos.contrato_url IS
  'Enlace al contrato (Drive/PDF) que el cliente abre desde Mi perfil.';
