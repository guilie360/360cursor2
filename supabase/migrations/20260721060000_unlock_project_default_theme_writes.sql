-- Reverse temporary hard-lock on project_default_theme.
-- Seed HALL stays protected only in the Style UI (no delete / no overwrite of seed entry).
-- Admins must be able to change proyecto_config.project_default_theme via
-- "Aplicar tema al proyecto".

DROP TRIGGER IF EXISTS trg_protect_hall_project_theme ON public.proyecto_config;
DROP FUNCTION IF EXISTS public.protect_hall_project_theme();
