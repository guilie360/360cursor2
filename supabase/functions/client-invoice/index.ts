/**
 * Cliente autenticado: URL temporal del invoice PDF de Paddle para un cobro propio.
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY,
 *          PADDLE_API_KEY, PADDLE_ENV (sandbox|live)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function paddleBase(env: string) {
  return env === "live"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const paddleKey = Deno.env.get("PADDLE_API_KEY") || "";
  const paddleEnv = (Deno.env.get("PADDLE_ENV") || "sandbox").toLowerCase();

  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Faltan secretos Supabase." });
  }
  if (!paddleKey) {
    return json(500, { error: "Falta PADDLE_API_KEY." });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "Debes iniciar sesión." });
  }

  const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Sesión inválida." });

  const email = String(userData.user.email || "").trim().toLowerCase();
  if (!email) return json(400, { error: "Tu cuenta no tiene correo." });

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: prof } = await admin
    .from("profiles")
    .select("rol")
    .eq("id", userData.user.id)
    .maybeSingle();
  const rol = String(prof?.rol || "").toLowerCase();
  if (rol !== "cliente") {
    return json(403, { error: "Solo cuentas cliente." });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const cobroId = String(body.cobro_id || body.id || "").trim();
  let cobro: Record<string, unknown> | null = null;

  if (cobroId && /^[0-9a-f-]{36}$/i.test(cobroId)) {
    const { data } = await admin
      .from("panel_cobros")
      .select("id,concepto,amount_cents,status,payment_stage,paddle_transaction_id,pedido_id,customer_email,paid_at,created_at")
      .eq("id", cobroId)
      .maybeSingle();
    cobro = data;
  } else {
    const { data: pedidos } = await admin
      .from("panel_pedidos")
      .select("id")
      .eq("customer_email", email)
      .order("created_at", { ascending: false })
      .limit(20);
    const ids = (pedidos || []).map((p) => p.id);
    if (!ids.length) {
      return json(404, { error: "No hay cobros para tu cuenta." });
    }
    const { data: cobros } = await admin
      .from("panel_cobros")
      .select("id,concepto,amount_cents,status,payment_stage,paddle_transaction_id,pedido_id,customer_email,paid_at,created_at")
      .in("pedido_id", ids)
      .eq("status", "cobrado")
      .order("created_at", { ascending: false })
      .limit(1);
    cobro = (cobros && cobros[0]) || null;
  }

  if (!cobro) return json(404, { error: "No encontramos un cobro." });

  // Ownership: email del cobro o del pedido
  const cobroEmail = String(cobro.customer_email || "").trim().toLowerCase();
  let owns = cobroEmail === email;
  if (!owns && cobro.pedido_id) {
    const { data: ped } = await admin
      .from("panel_pedidos")
      .select("customer_email")
      .eq("id", cobro.pedido_id)
      .maybeSingle();
    owns = String(ped?.customer_email || "").trim().toLowerCase() === email;
  }
  if (!owns) return json(403, { error: "Ese cobro no pertenece a tu cuenta." });

  const txn = String(cobro.paddle_transaction_id || "").trim();
  if (!txn) {
    return json(404, { error: "Este cobro aún no tiene factura Paddle." });
  }
  if (String(cobro.status || "").toLowerCase() !== "cobrado") {
    return json(400, { error: "El cobro aún no está confirmado." });
  }

  const url =
    paddleBase(paddleEnv) +
    "/transactions/" +
    encodeURIComponent(txn) +
    "/invoice?disposition=attachment";
  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + paddleKey,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (data && data.error && data.error.detail) ||
      (data && data.error && data.error.code) ||
      ("Paddle " + res.status);
    return json(502, { error: "No se pudo obtener el invoice: " + detail });
  }
  const invoiceUrl = data && data.data && data.data.url;
  if (!invoiceUrl) {
    return json(502, { error: "Paddle no devolvió URL de invoice." });
  }

  return json(200, {
    ok: true,
    url: invoiceUrl,
    cobro_id: cobro.id,
    concepto: cobro.concepto,
    amount_cents: cobro.amount_cents,
    transaction_id: txn,
  });
});
