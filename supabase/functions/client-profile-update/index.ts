/**
 * Cliente autenticado: actualiza nombre / teléfono-contraseña / email.
 * Auth JWT rol cliente. Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
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

function phonePassword(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length >= 12) digits = digits.slice(2);
  else if (digits.startsWith("34") && digits.length >= 11) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length > 1) {
    digits = digits.replace(/^0+/, "");
  }
  return digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Faltan secretos Supabase." });
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

  const admin = createClient(supabaseUrl, serviceKey);
  const uid = userData.user.id;
  const { data: prof } = await admin
    .from("profiles")
    .select("rol")
    .eq("id", uid)
    .maybeSingle();
  const rol = String(prof?.rol || "").toLowerCase();
  if (rol !== "cliente") {
    return json(403, { error: "Solo cuentas cliente." });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON inválido." });
  }

  const name = String(body.name || body.nombre || "").trim().slice(0, 120);
  const phoneRaw = String(body.phone || body.telefono || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = phonePassword(phoneRaw);

  const authPatch: Record<string, unknown> = {};
  const meta: Record<string, unknown> = {
    ...(userData.user.user_metadata || {}),
  };
  if (name) {
    meta.nombre = name;
    meta.nombres = name;
  }
  if (phoneRaw) {
    if (password.length < 6) {
      return json(400, { error: "Celular inválido (mín. 6 dígitos sin +57)." });
    }
    meta.telefono = phoneRaw;
    meta.phone_password_hint = "celular_sin_prefijo";
    authPatch.password = password;
  }
  if (email && email !== String(userData.user.email || "").toLowerCase()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { error: "Correo inválido." });
    }
    authPatch.email = email;
    authPatch.email_confirm = true;
  }
  authPatch.user_metadata = meta;

  if (Object.keys(authPatch).length > 1 || authPatch.password || authPatch.email) {
    const upd = await admin.auth.admin.updateUserById(uid, authPatch);
    if (upd.error) {
      return json(400, { error: upd.error.message || "No se pudo actualizar Auth." });
    }
  }

  const profilePatch: Record<string, string> = {};
  if (name) {
    profilePatch.nombre = name;
    profilePatch.nombre_visible = name;
  }
  if (phoneRaw) profilePatch.telefono = phoneRaw;
  if (Object.keys(profilePatch).length) {
    await admin.from("profiles").update(profilePatch).eq("id", uid);
  }

  return json(200, {
    ok: true,
    name: name || null,
    email: email || userData.user.email || null,
    telefono: phoneRaw || null,
  });
});
