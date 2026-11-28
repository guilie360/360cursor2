/**
 * Webhook Paddle → marca cobros/pedidos, liquida Hunter 50/50 y email de confirmación.
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY (opcional), RESEND_FROM (opcional)
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

function phonePassword(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length >= 12) digits = digits.slice(2);
  else if (digits.startsWith("34") && digits.length >= 11) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length > 1) {
    digits = digits.replace(/^0+/, "");
  }
  return digits;
}

function maskPassword(digits: string): string {
  if (!digits) return "****";
  if (digits.length <= 5) return digits.charAt(0) + "****" + digits.charAt(digits.length - 1);
  return digits.slice(0, 3) + "****" + digits.slice(-2);
}

async function sendOrderEmail(opts: {
  to: string;
  name: string;
  email: string;
  passwordMasked: string;
  proyecto: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY") || "";
  if (!apiKey) {
    console.warn("[paddle-webhook] RESEND_API_KEY no configurada; email omitido");
    return { skipped: true };
  }
  const from = Deno.env.get("RESEND_FROM") || "360Preventa <onboarding@resend.dev>";
  const subject = "Pedido confirmado · 360Preventa";
  const html = `
    <div style="font-family:Georgia,serif;background:#0b0b0b;color:#eee;padding:32px">
      <p style="letter-spacing:.12em;text-transform:uppercase;color:#888;font:12px sans-serif">360Preventa</p>
      <h1 style="font-weight:400;font-size:28px">Pedido confirmado</h1>
      <p style="font:15px/1.5 sans-serif;color:#bbb">Hola ${opts.name || "cliente"}, recibimos tu anticipo${opts.proyecto ? ` de <strong style="color:#fff">${opts.proyecto}</strong>` : ""}.</p>
      <p style="font:15px/1.5 sans-serif;color:#bbb">Tu cuenta en Mi perfil:</p>
      <ul style="font:15px/1.7 sans-serif;color:#fff">
        <li>Correo: <strong>${opts.email}</strong></li>
        <li>Contraseña: <strong>${opts.passwordMasked}</strong> (celular sin +57; parcialmente oculta)</li>
      </ul>
      <p style="font:15px/1.5 sans-serif;color:#bbb">Entra en <a href="https://360preventa.com/miperfil" style="color:#fff">https://360preventa.com/miperfil</a> para seguir el avance de tu proyecto y monitorearlo.</p>
    </div>
  `;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.warn("[paddle-webhook] email fail", res.status, t);
    return { ok: false, status: res.status };
  }
  return { ok: true };
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

          // Email de confirmación + datos de cuenta
          try {
            const email = String(pedido.customer_email || "").trim().toLowerCase();
            const name = String(pedido.customer_name || "").trim() || "cliente";
            let passwordMasked = "****";
            if (email) {
              const lookup = await admin.rpc("lookup_auth_user_id", { p_email: email });
              const uid = lookup.data ? String(lookup.data) : "";
              if (uid) {
                const { data: authUser } = await admin.auth.admin.getUserById(uid);
                const meta = (authUser?.user?.user_metadata || {}) as Record<string, string>;
                const phone = meta.telefono || meta.phone || "";
                passwordMasked = maskPassword(phonePassword(phone));
                // No pisar etapa al cobrar: el default es 5% Revisando documentos
                // (client-provision) y el admin la avanza en Base de datos.
              }
              await sendOrderEmail({
                to: email,
                name,
                email,
                passwordMasked,
                proyecto: String(pedido.proyecto_label || ""),
              });
            }
          } catch (mailErr) {
            console.warn("[paddle-webhook] confirm mail", mailErr);
          }
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
