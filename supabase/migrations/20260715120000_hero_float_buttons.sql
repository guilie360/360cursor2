-- Hero floating buttons: WhatsApp + Share customization

ALTER TABLE public.proyecto_config
  ADD COLUMN IF NOT EXISTS show_whatsapp_float boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_share_float boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_float_link text,
  ADD COLUMN IF NOT EXISTS whatsapp_float_message text,
  ADD COLUMN IF NOT EXISTS share_float_url text;
