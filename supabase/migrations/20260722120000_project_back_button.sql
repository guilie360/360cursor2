-- Optional "Proyectos" back navigation per showroom (public UI only)

ALTER TABLE public.proyecto_config
  ADD COLUMN IF NOT EXISTS show_back_button boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS back_button_label text,
  ADD COLUMN IF NOT EXISTS back_button_url text;
