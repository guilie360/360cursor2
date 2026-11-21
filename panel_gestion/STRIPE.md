# Stripe · Panel de Pagos (360Preventa)

## Qué hace

- Genera un **enlace de cobro** (Stripe Checkout, EUR) desde el módulo Pagos.
- Guarda el cobro en `panel_cobros` (Supabase).
- El webhook marca el cobro como **cobrado** cuando el cliente paga.

## Secrets (Supabase → Edge Functions)

| Secret | Valor |
|--------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_…` o `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` del endpoint |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya los inyecta Supabase.

## Webhook en Stripe Dashboard

1. Developers → Webhooks → Add endpoint  
2. URL: `https://emefdwzdfnqgjohbtvvn.supabase.co/functions/v1/stripe-webhook`  
3. Eventos: `checkout.session.completed`, `checkout.session.expired`  
4. Copia el signing secret → `STRIPE_WEBHOOK_SECRET`

## Edge Functions

- `stripe-create-checkout` (JWT del usuario del panel)
- `stripe-webhook` (sin JWT; firma Stripe)

## Uso en el panel

1. Entra al panel → Pagos (clave dinámica actual).  
2. Importe + concepto → **Generar enlace de cobro**.  
3. Comparte el enlace con el cliente.  
4. Al pagar, el listado pasa a **Cobrado**.

Desde cotizador interno: botón **Cobrar** envía el presupuesto a Pagos con el importe precargado.
