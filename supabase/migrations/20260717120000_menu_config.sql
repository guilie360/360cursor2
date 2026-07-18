-- Showroom main menu configuration (BOXIES AI → Menú)
ALTER TABLE public.proyecto_config
  ADD COLUMN IF NOT EXISTS menu_config jsonb DEFAULT NULL;

COMMENT ON COLUMN public.proyecto_config.menu_config IS
  'JSON: { projectName, description, items[{id,label,enabled,action,target,children}] } for showroom main menu';
