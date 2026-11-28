-- Official preset theme catalog (admin-editable via existing proyecto_config_admin_update RLS)

ALTER TABLE public.proyecto_config
  ADD COLUMN IF NOT EXISTS project_preset_themes jsonb DEFAULT NULL;
