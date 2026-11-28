# Avisos de chat cliente → admin

Cuando un cliente escribe desde Mi perfil, el RPC `panel_client_chat_post` dispara (vía `pg_net`) la Edge Function `notify-admin-chat`, que:

1. Envía un **correo** (Resend) con enlace `?openClientChat=<uuid>`
2. Envía **Web Push** a las suscripciones guardadas del admin

## Secrets / config

### Obligatorios para correo

En **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (o CLI `supabase secrets set`):

| Secret | Uso |
|--------|-----|
| `RESEND_API_KEY` | **Requerido** para email. Sin esto la function responde `emailed: false`. |
| `RESEND_FROM` | Remitente verificado en Resend, ej. `360Preventa <avisos@tudominio.com>` |
| `ADMIN_ALERT_EMAIL` | Opcional override; si falta usa `panel_notify_config.admin_alert_email` |

`panel_notify_config` (id=1) ya tiene `admin_alert_email`, VAPID y `webhook_secret` sembrados en prod.  
Push lee VAPID desde esa tabla; no hace falta duplicar en secrets salvo que quieras rotar.

### Rotar VAPID / webhook

Actualizar solo vía SQL (service role), nunca desde el cliente:

```sql
update panel_notify_config set
  webhook_secret = '...',
  vapid_public_key = '...',
  vapid_private_key = '...',
  updated_at = now()
where id = 1;
```

## Activar en el celular (PWA)

1. Abre `/panel_gestion/` en Chrome (Android) o Safari (iOS 16.4+)
2. **Agregar a pantalla de inicio**
3. Entra como admin → abre el chat → botón **Avisos** → permitir notificaciones
4. Prueba escribiendo desde una cuenta cliente en Mi perfil

## Deep link

`https://360preventa.com/panel_gestion/?openClientChat=<client_uuid>` abre el hilo de ese cliente.
