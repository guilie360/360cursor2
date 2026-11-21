/**
 * Crea un Checkout Session de Stripe (EUR) y registra panel_cobros pending.
 * Requiere Authorization: Bearer <user JWT> del panel.
 *
 * Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

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

const TEAM_ROLES = new Set(["hunter", "admin", "super_admin", "asesor"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!stripeKey || !supabaseUrl || !serviceKey) {
    return json(500, { error: "Faltan secretos de Stripe/Supabase en la Edge Function." });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "No autenticado." });
  }

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: "Sesión inválida." });
  }
  const user = userData.user;

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) {
    return json(500, { error: profileErr.message });
  }
  const rol = String(profile?.rol || "");
  if (!TEAM_ROLES.has(rol)) {
    return json(403, { error: "Sin permiso para crear cobros." });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON inválido." });
  }

  const amountEuros = Number(body.amount_euros ?? body.amount ?? 0);
  const amountCents = Math.round(amountEuros * 100);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    return json(400, { error: "Importe mínimo 0,50 €." });
  }

  const concepto = String(body.concepto || "Cobro 360Preventa").trim().slice(0, 200) ||
    "Cobro 360Preventa";
  const proyectoLabel = String(body.proyecto_label || "").trim().slice(0, 200);
  const customerEmail = String(body.customer_email || "").trim().toLowerCase();
  const origin = String(body.origin || "https://360preventa.com").replace(/\/$/, "");
  const successUrl = String(body.success_url || `${origin}/panel_gestion/?pago=ok`).slice(0, 500);
  const cancelUrl = String(body.cancel_url || `${origin}/panel_gestion/?pago=cancelado`).slice(0, 500);

  const { data: cobro, error: insertErr } = await admin
    .from("panel_cobros")
    .insert({
      created_by: user.id,
      concepto,
      proyecto_label: proyectoLabel,
      customer_email: customerEmail || null,
      amount_cents: amountCents,
      currency: "eur",
      status: "pending",
      metadata: { source: "panel_pagos", rol },
    })
    .select("id")
    .single();

  if (insertErr || !cobro) {
    return json(500, { error: insertErr?.message || "No se pudo crear el cobro." });
  }

  const stripe = new Stripe(stripeKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "eur",
      customer_email: customerEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amountCents,
            product_data: {
              name: concepto,
              description: proyectoLabel || undefined,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        panel_cobro_id: cobro.id,
        created_by: user.id,
      },
      payment_intent_data: {
        metadata: {
          panel_cobro_id: cobro.id,
        },
      },
    });

    const { error: updErr } = await admin
      .from("panel_cobros")
      .update({
        stripe_checkout_session_id: session.id,
        checkout_url: session.url,
      })
      .eq("id", cobro.id);

    if (updErr) {
      return json(500, { error: updErr.message });
    }

    return json(200, {
      id: cobro.id,
      url: session.url,
      session_id: session.id,
      amount_cents: amountCents,
      currency: "eur",
      status: "pending",
    });
  } catch (err) {
    await admin
      .from("panel_cobros")
      .update({ status: "fallido", metadata: { error: String((err as Error)?.message || err) } })
      .eq("id", cobro.id);
    return json(502, {
      error: (err as Error)?.message || "Stripe no pudo crear el enlace de cobro.",
    });
  }
});
