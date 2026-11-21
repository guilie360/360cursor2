/**
 * Crea pedido (si hace falta) + transacción Paddle one-time (anticipo o entrega).
 * Secrets: PADDLE_API_KEY, PADDLE_ENV (sandbox|live), PADDLE_PRODUCT_ID,
 *          SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TEAM_ROLES = new Set(["hunter", "admin", "super_admin", "asesor"]);
const HUNTER_RATE = 0.08;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function splitCents(total: number) {
  const deposit = Math.round(total * 0.5);
  return { deposit, balance: total - deposit };
}

function hunterSplit(total: number) {
  const full = Math.round(total * HUNTER_RATE);
  const deposit = Math.round(full * 0.5);
  return { full, deposit, balance: full - deposit };
}

function paddleBase(env: string) {
  return env === "live"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const paddleKey = Deno.env.get("PADDLE_API_KEY") || "";
  const paddleEnv = (Deno.env.get("PADDLE_ENV") || "sandbox").toLowerCase();
  const productId = Deno.env.get("PADDLE_PRODUCT_ID") ||
    "pro_01m7xm55aqj11tv2vsxvef1818";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  if (!paddleKey || !supabaseUrl || !serviceKey) {
    return json(500, {
      error: "Faltan secretos Paddle/Supabase en la Edge Function.",
    });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const admin = createClient(supabaseUrl, serviceKey);
  let userId: string | null = null;

  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (userData?.user) {
      userId = userData.user.id;
      const { data: profile } = await admin
        .from("profiles")
        .select("rol")
        .eq("id", userId)
        .maybeSingle();
      const rol = String(profile?.rol || "");
      if (!TEAM_ROLES.has(rol)) {
        return json(403, { error: "Sin permiso para crear cobros." });
      }
    }
  }

  // Público (cotizador): permitido crear checkout sin sesión de equipo.
  // Equipo: también permitido con JWT.

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON inválido." });
  }

  const stage = String(body.stage || "deposit");
  if (stage !== "deposit" && stage !== "balance") {
    return json(400, { error: "stage debe ser deposit o balance." });
  }

  const customerName = String(body.customer_name || "").trim().slice(0, 200);
  const customerEmail = String(body.customer_email || "").trim().toLowerCase()
    .slice(0, 320);
  const proyectoLabel = String(body.proyecto_label || "Showroom 360Preventa")
    .trim().slice(0, 200);
  let pedidoId = String(body.pedido_id || "").trim();

  const adminDb = admin;
  let pedido: Record<string, unknown> | null = null;

  if (pedidoId) {
    const { data, error } = await adminDb
      .from("panel_pedidos")
      .select("*")
      .eq("id", pedidoId)
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    if (!data) return json(404, { error: "Pedido no encontrado." });
    pedido = data;
  } else {
    const totalEuros = Number(body.quote_total_euros ?? body.amount_euros ?? 0);
    const totalCents = Math.round(totalEuros * 100);
    if (!Number.isFinite(totalCents) || totalCents < 100) {
      return json(400, { error: "Total mínimo 1,00 €." });
    }
    if (!customerEmail) {
      return json(400, { error: "Email del cliente obligatorio." });
    }
    const parts = splitCents(totalCents);
    const hunter = hunterSplit(totalCents);
    const isTest = body.is_test === true || body.is_test === "true" ||
      paddleEnv === "sandbox";
    const { data, error } = await adminDb
      .from("panel_pedidos")
      .insert({
        created_by: userId,
        customer_name: customerName || null,
        customer_email: customerEmail,
        proyecto_label: proyectoLabel,
        quote_total_cents: totalCents,
        deposit_cents: parts.deposit,
        balance_cents: parts.balance,
        hunter_commission_cents: hunter.full,
        status: "pendiente_anticipo",
        quote_snapshot: body.quote_snapshot || {},
        is_test: isTest,
        metadata: {
          source: body.source || "cotizador",
          is_test: isTest,
          paddle_env: paddleEnv,
        },
      })
      .select("*")
      .single();
    if (error) return json(500, { error: error.message });
    pedido = data;
    pedidoId = String(data.id);
  }

  const status = String(pedido!.status || "");
  const depositCents = Number(pedido!.deposit_cents) || 0;
  const balanceCents = Number(pedido!.balance_cents) || 0;
  const amountCents = stage === "deposit" ? depositCents : balanceCents;

  if (stage === "deposit" && status !== "pendiente_anticipo") {
    return json(400, { error: "El anticipo ya no está pendiente." });
  }
  if (stage === "balance" && status !== "pendiente_entrega" && status !== "en_produccion") {
    return json(400, {
      error: "La entrega solo se cobra con anticipo pagado / en producción.",
    });
  }
  if (amountCents < 50) {
    return json(400, { error: "Importe de tramo inválido." });
  }

  const label = stage === "deposit"
    ? `Anticipo 50% · ${proyectoLabel}`
    : `Entrega 50% · ${proyectoLabel}`;

  const txnPayload = {
    items: [
      {
        quantity: 1,
        price: {
          description: label,
          name: label,
          product_id: productId,
          unit_price: {
            amount: String(amountCents),
            currency_code: "EUR",
          },
          // exclusive: unit_price is sin IVA; Paddle adds tax on top if applicable
          tax_mode: "external",
        },
      },
    ],
    currency_code: "EUR",
    collection_mode: "automatic",
    custom_data: {
      pedido_id: pedidoId,
      payment_stage: stage,
      quote_total_cents: String(pedido!.quote_total_cents || ""),
      app: "360preventa",
    },
  };

  // Prefill email via customer create/find
  let customerId: string | undefined;
  if (customerEmail) {
    const listRes = await fetch(
      `${paddleBase(paddleEnv)}/customers?email=${encodeURIComponent(customerEmail)}`,
      {
        headers: {
          Authorization: `Bearer ${paddleKey}`,
          "Content-Type": "application/json",
        },
      },
    );
    const listJson = await listRes.json();
    const existing = listJson?.data?.[0];
    if (existing?.id) {
      customerId = existing.id;
    } else {
      const createRes = await fetch(`${paddleBase(paddleEnv)}/customers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paddleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: customerEmail,
          name: customerName || undefined,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) {
        return json(502, {
          error: createJson?.error?.detail || "No se pudo crear el cliente Paddle.",
          paddle: createJson,
        });
      }
      customerId = createJson?.data?.id;
    }
  }

  const createTxnRes = await fetch(`${paddleBase(paddleEnv)}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paddleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...txnPayload,
      ...(customerId ? { customer_id: customerId } : {}),
    }),
  });
  const createTxnJson = await createTxnRes.json();
  if (!createTxnRes.ok) {
    return json(502, {
      error: createTxnJson?.error?.detail || "Paddle rechazó la transacción.",
      paddle: createTxnJson,
    });
  }

  const txn = createTxnJson.data;
  const txnId = txn?.id as string;
  const checkoutUrl = txn?.checkout?.url as string | undefined;

  const concepto = label;
  const cobroIsTest = !!(pedido && (pedido as { is_test?: boolean }).is_test) ||
    body.is_test === true || body.is_test === "true" ||
    paddleEnv === "sandbox";
  await adminDb.from("panel_cobros").insert({
    created_by: userId,
    pedido_id: pedidoId,
    payment_stage: stage,
    provider: "paddle",
    concepto,
    proyecto_label: proyectoLabel,
    customer_email: customerEmail || null,
    amount_cents: amountCents,
    currency: "eur",
    status: "pending",
    paddle_transaction_id: txnId,
    checkout_url: checkoutUrl || null,
    is_test: cobroIsTest,
    metadata: { paddle_env: paddleEnv, stage, is_test: cobroIsTest },
  });

  const txnField = stage === "deposit" ? "paddle_txn_deposit" : "paddle_txn_balance";
  await adminDb
    .from("panel_pedidos")
    .update({ [txnField]: txnId, updated_at: new Date().toISOString() })
    .eq("id", pedidoId);

  return json(200, {
    ok: true,
    pedido_id: pedidoId,
    transaction_id: txnId,
    checkout_url: checkoutUrl || null,
    stage,
    amount_cents: amountCents,
    amount_euros: amountCents / 100,
    quote_total_cents: pedido!.quote_total_cents,
    deposit_cents: depositCents,
    balance_cents: balanceCents,
    hunter_commission_cents: pedido!.hunter_commission_cents,
    paddle_env: paddleEnv,
  });
});
