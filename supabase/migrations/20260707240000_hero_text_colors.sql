-- Hero text colors — project-wide (admin panel)

ALTER TABLE public.proyecto_config
  ADD COLUMN IF NOT EXISTS hero_text_color text,
  ADD COLUMN IF NOT EXISTS hero_button_text_color text;
