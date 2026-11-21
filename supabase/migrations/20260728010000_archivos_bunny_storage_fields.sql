-- V5.9.67 — Bunny storage metadata on archivos (additive, non-breaking)
ALTER TABLE public.archivos
  ADD COLUMN IF NOT EXISTS storage_provider text,
  ADD COLUMN IF NOT EXISTS storage_path text;

COMMENT ON COLUMN public.archivos.storage_provider IS
  'Storage backend for this file: bunny | supabase | null (legacy URL-only)';
COMMENT ON COLUMN public.archivos.storage_path IS
  'Object path inside the provider (e.g. projects/{id}/images/file.webp)';

CREATE INDEX IF NOT EXISTS archivos_proyecto_provider_idx
  ON public.archivos (proyecto_id, storage_provider)
  WHERE storage_provider IS NOT NULL;

CREATE INDEX IF NOT EXISTS archivos_storage_path_idx
  ON public.archivos (storage_path)
  WHERE storage_path IS NOT NULL;
