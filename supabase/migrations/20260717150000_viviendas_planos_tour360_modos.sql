-- Viviendas: modes for Ver Planos / Ver 360°
ALTER TABLE public.viviendas
  ADD COLUMN IF NOT EXISTS planos_modo text NOT NULL DEFAULT 'proximamente',
  ADD COLUMN IF NOT EXISTS tour360_modo text NOT NULL DEFAULT 'proximamente';

ALTER TABLE public.viviendas
  DROP CONSTRAINT IF EXISTS viviendas_planos_modo_check;
ALTER TABLE public.viviendas
  ADD CONSTRAINT viviendas_planos_modo_check
  CHECK (planos_modo IN ('file', 'proximamente'));

ALTER TABLE public.viviendas
  DROP CONSTRAINT IF EXISTS viviendas_tour360_modo_check;
ALTER TABLE public.viviendas
  ADD CONSTRAINT viviendas_tour360_modo_check
  CHECK (tour360_modo IN ('link', 'proximamente'));

UPDATE public.viviendas v
SET tour360_modo = 'link'
WHERE EXISTS (
  SELECT 1 FROM public.archivos a
  WHERE a.vivienda_id = v.id AND a.tipo = 'tour_360'
);

UPDATE public.viviendas v
SET planos_modo = 'file'
WHERE EXISTS (
  SELECT 1 FROM public.archivos a
  WHERE a.vivienda_id = v.id AND a.tipo = 'plano'
);
