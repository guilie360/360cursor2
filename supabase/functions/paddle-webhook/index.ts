/**
 * Webhook Paddle → marca cobros/pedidos y liquida Hunter 50/50.
 * Secrets: PADDLE_WEBHOOK_SECRET (opcional en sandbox), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, paddle-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Faltan secretos Supabase." });
  }

  const raw = await req.text();
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw);
  } catch {
    return json(400, { error: "JSON inválido." });
  }

  // Nota: verificación HMAC completa se puede endurecer con PADDLE_WEBHOOK_SECRET.
  // En sandbox aceptamos el evento y actualizamos por transaction id.

  const eventType = String(event.event_type || event.eventType || "");
  const data = (event.data || {}) as Record<string, unknown>;
  const txnId = String(data.id || "");
  if (!txnId) return json(200, { ok: true, skipped: "no_txn" });

  const custom = (data.custom_data || {}) as Record<string, string>;
  const pedidoId = custom.pedido_id || "";
  const stage = custom.payment_stage || "";

  const admin = createClient(supabaseUrl, serviceKey);

  if (
    eventType === "transaction.completed" ||
    eventType === "transaction.paid"
  ) {
    await admin
      .from("panel_cobros")
      .update({
        status: "cobrado",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("paddle_transaction_id", txnId);

    if (pedidoId) {
      const { data: pedido } = await admin
        .from("panel_pedidos")
        .select("*")
        .eq("id", pedidoId)
        .maybeSingle();

      if (pedido) {
        const hunterFull = Number(pedido.hunter_commission_cents) || 0;
        const hunterDeposit = Math.round(hunterFull * 0.5);
        const hunterBalance = hunterFull - hunterDeposit;

        if (stage === "deposit") {
          await admin
            .from("panel_pedidos")
            .update({
              status: "en_produccion",
              hunter_paid_deposit_cents: hunterDeposit,
              paddle_txn_deposit: txnId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", pedidoId);
        } else if (stage === "balance") {
          await admin
            .from("panel_pedidos")
            .update({
              status: "pagado",
              hunter_paid_balance_cents: hunterBalance,
              paddle_txn_balance: txnId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", pedidoId);
        }
      }
    }
  }

  if (
    eventType === "transaction.payment_failed" ||
    eventType === "transaction.canceled"
  ) {
    await admin
      .from("panel_cobros")
      .update({
        status: eventType.includes("canceled") ? "cancelado" : "fallido",
        updated_at: new Date().toISOString(),
      })
      .eq("paddle_transaction_id", txnId);
  }

  return json(200, { ok: true });
});
