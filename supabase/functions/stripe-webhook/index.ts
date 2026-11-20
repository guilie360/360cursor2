/**
 * Webhook Stripe → actualiza panel_cobros (cobrado / cancelado).
 * verify_jwt=false — autentica con firma Stripe.
 *
 * Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    return json(500, { error: "Faltan secretos del webhook." });
  }

  const signature = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  const stripe = new Stripe(stripeKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err2) {
      return json(400, { error: `Firma inválida: ${(err2 as Error)?.message || err2}` });
    }
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const cobroId = session.metadata?.panel_cobro_id || null;
      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;

      let query = admin.from("panel_cobros").update({
        status: "cobrado",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntent,
        stripe_checkout_session_id: session.id,
        checkout_url: session.url || undefined,
      });

      if (cobroId) {
        query = query.eq("id", cobroId);
      } else {
        query = query.eq("stripe_checkout_session_id", session.id);
      }

      const { error } = await query;
      if (error) return json(500, { error: error.message });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const cobroId = session.metadata?.panel_cobro_id || null;
      let query = admin
        .from("panel_cobros")
        .update({ status: "cancelado" })
        .eq("status", "pending");

      if (cobroId) query = query.eq("id", cobroId);
      else query = query.eq("stripe_checkout_session_id", session.id);

      const { error } = await query;
      if (error) return json(500, { error: error.message });
    }
  } catch (err) {
    return json(500, { error: String((err as Error)?.message || err) });
  }

  return json(200, { received: true });
});
