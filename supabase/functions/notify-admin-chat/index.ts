/**
 * Aviso al admin cuando un cliente escribe en el chat (email Resend + Web Push).
 * Auth: header x-notify-secret (pg_net) o JWT de usuario con rol cliente.
 * Secrets opcionales: RESEND_API_KEY, RESEND_FROM, ADMIN_ALERT_EMAIL
 *   (también lee panel_notify_config vía service role).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-notify-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function esc(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type NotifyConfig = {
  webhook_secret: string | null;
  admin_alert_email: string | null;
  vapid_public_key: string | null;
  vapid_private_key: string | null;
  vapid_subject: string | null;
  email_cooldown_minutes: number | null;
  panel_base_url: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Faltan secretos Supabase." });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: cfgRow, error: cfgErr } = await admin
    .from("panel_notify_config")
    .select(
      "webhook_secret, admin_alert_email, vapid_public_key, vapid_private_key, vapid_subject, email_cooldown_minutes, panel_base_url",
    )
    .eq("id", 1)
    .maybeSingle();
  if (cfgErr) {
    console.warn("[notify-admin-chat] config", cfgErr.message);
  }
  const cfg = (cfgRow || {}) as NotifyConfig;

  const secretHeader = req.headers.get("x-notify-secret") || "";
  const expectedSecret = (cfg.webhook_secret || Deno.env.get("NOTIFY_CHAT_SECRET") || "").trim();
  let authorized = !!(expectedSecret && secretHeader && secretHeader === expectedSecret);

  if (!authorized) {
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.toLowerCase().startsWith("bearer ") && anonKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user?.id) {
        const { data: prof } = await admin
          .from("profiles")
          .select("rol")
          .eq("id", userData.user.id)
          .maybeSingle();
        const rol = String(prof?.rol || "").toLowerCase();
        if (rol === "cliente") authorized = true;
      }
    }
  }

  if (!authorized) return json(401, { error: "No autorizado" });

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "JSON inválido" });
  }

  const clientId = String(payload.client_id || "").trim();
  const clientName = String(payload.client_name || "Cliente").trim() || "Cliente";
  const bodyPreview = String(payload.body || "").trim() || "Nuevo mensaje";
  const messageId = String(payload.message_id || "").trim();

  if (!clientId) return json(400, { error: "Falta client_id" });

  if (messageId) {
    const { data: existing } = await admin
      .from("panel_client_chat_alert_log")
      .select("message_id")
      .eq("message_id", messageId)
      .maybeSingle();
    if (existing) {
      return json(200, { ok: true, skipped: "duplicate" });
    }
  }

  const panelBase = (cfg.panel_base_url || "https://360preventa.com/panel_gestion/").replace(
    /\/?$/,
    "/",
  );
  const deepLink = `${panelBase}?openClientChat=${encodeURIComponent(clientId)}`;

  let emailed = false;
  let pushed = false;

  const cooldownMin = Math.max(1, Number(cfg.email_cooldown_minutes || 5));
  const alertEmail =
    (Deno.env.get("ADMIN_ALERT_EMAIL") || "").trim() ||
    (cfg.admin_alert_email || "").trim();

  if (alertEmail) {
    let allowEmail = true;
    const { data: throttle } = await admin
      .from("panel_client_chat_email_throttle")
      .select("last_email_at")
      .eq("client_id", clientId)
      .maybeSingle();
    if (throttle?.last_email_at) {
      const last = new Date(String(throttle.last_email_at)).getTime();
      if (Number.isFinite(last) && Date.now() - last < cooldownMin * 60 * 1000) {
        allowEmail = false;
      }
    }

    if (allowEmail) {
      const apiKey = Deno.env.get("RESEND_API_KEY") || "";
      if (!apiKey) {
        console.warn("[notify-admin-chat] RESEND_API_KEY ausente");
      } else {
        const from = Deno.env.get("RESEND_FROM") || "360Preventa <onboarding@resend.dev>";
        const subject = `Chat · ${clientName}`;
        const html = `
          <div style="font-family:Georgia,serif;background:#0b0b0b;color:#eee;padding:32px">
            <p style="letter-spacing:.12em;text-transform:uppercase;color:#888;font:12px sans-serif">360Preventa · Chat</p>
            <h1 style="font-weight:400;font-size:26px;margin:8px 0 16px">${esc(clientName)}</h1>
            <p style="font:15px/1.5 sans-serif;color:#bbb;white-space:pre-wrap">${esc(bodyPreview)}</p>
            <p style="margin-top:28px">
              <a href="${esc(deepLink)}" style="display:inline-block;background:#fff;color:#111;text-decoration:none;padding:12px 18px;border-radius:999px;font:14px sans-serif">
                Abrir chat
              </a>
            </p>
          </div>`;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [alertEmail],
            subject,
            html,
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          console.warn("[notify-admin-chat] email fail", res.status, t);
        } else {
          emailed = true;
          await admin.from("panel_client_chat_email_throttle").upsert({
            client_id: clientId,
            last_email_at: new Date().toISOString(),
          });
        }
      }
    }
  } else {
    console.warn("[notify-admin-chat] sin ADMIN_ALERT_EMAIL");
  }

  const vapidPublic =
    (Deno.env.get("VAPID_PUBLIC_KEY") || "").trim() || (cfg.vapid_public_key || "").trim();
  const vapidPrivate =
    (Deno.env.get("VAPID_PRIVATE_KEY") || "").trim() || (cfg.vapid_private_key || "").trim();
  const vapidSubject =
    (Deno.env.get("VAPID_SUBJECT") || "").trim() ||
    (cfg.vapid_subject || "").trim() ||
    "mailto:admin@360preventa.com";

  if (vapidPublic && vapidPrivate) {
    try {
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
      const { data: subs } = await admin
        .from("panel_admin_push_subscriptions")
        .select("id, endpoint, p256dh, auth");
      for (const sub of subs || []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              title: `Chat · ${clientName}`,
              body: bodyPreview.slice(0, 140),
              url: deepLink,
              client_id: clientId,
              client_name: clientName,
            }),
          );
          pushed = true;
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          console.warn("[notify-admin-chat] push fail", statusCode || err);
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("panel_admin_push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    } catch (err) {
      console.warn("[notify-admin-chat] vapid", err);
    }
  }

  if (messageId) {
    await admin.from("panel_client_chat_alert_log").upsert({
      message_id: messageId,
      client_id: clientId,
      emailed,
      pushed,
    });
  }

  return json(200, { ok: true, emailed, pushed, deepLink });
});
