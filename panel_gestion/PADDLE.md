# Paddle — cobros 50/50 (sandbox)

## Qué hace la web
- En el modal de cotización: total **sin IVA**, anticipo 50%, entrega 50%, nota IVA.
- Vista Hunter (sesión equipo): comisión 8% partida 50/50.
- Botones **Pagar anticipo** / **Pagar entrega** abren overlay Paddle.
- Módulo **Pagos**: lista `panel_pedidos` + cobros Paddle.

## Secrets (Supabase → Edge Functions)
```
PADDLE_API_KEY=pdl_sdbx_...
PADDLE_ENV=sandbox
PADDLE_PRODUCT_ID=pro_01m7xm55aqj11tv2vsxvef1818
```
(`SUPABASE_URL` / service role / anon ya suelen estar.)

Webhook URL (ya creada en sandbox Notifications):
`https://emefdwzdfnqgjohbtvvn.supabase.co/functions/v1/paddle-webhook`

El `endpoint_secret_key` del notification setting queda en el dashboard Paddle (no lo guardes en el repo).

## Client token (público, sandbox)
`test_fa33546d73a21e0df2fe1760317` — ya embebido en `payments-paddle.js` para sandbox.

## Settings actuales (sandbox)
- Tax mode: `location` (Paddle calcula IVA)
- Métodos: card, Apple Pay, PayPal, Bancontact
- Balance primary: USD (los precios pueden ser EUR)
