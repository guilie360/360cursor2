-- Pantalla de pausa — configuración por proyecto (JSONB)

ALTER TABLE public.proyecto_config
  ADD COLUMN IF NOT EXISTS pause_screen_config jsonb NOT NULL DEFAULT '{}'::jsonb;
