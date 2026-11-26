/**
 * Provisiona cuenta de cliente desde cotizador (email + celular como contraseña).
 * Público (sin JWT). Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Contraseña = dígitos del celular sin +57 / +34. */
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
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Faltan secretos Supabase en la Edge Function." });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON inválido." });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || body.nombre || "").trim().slice(0, 120);
  const phoneRaw = String(body.phone || body.telefono || "").trim();
  const password = phonePassword(phoneRaw);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "Correo inválido." });
  }
  if (password.length < 6) {
    return json(400, {
      error:
        "Indica un WhatsApp / teléfono válido (mín. 6 dígitos; sin código de país).",
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const meta = {
    nombre: name || email.split("@")[0],
    nombres: name || "",
    telefono: phoneRaw,
    phone_password_hint: "celular_sin_prefijo",
  };

  const lookup = await admin.rpc("lookup_auth_user_id", { p_email: email });
  const existingId = lookup.data ? String(lookup.data) : null;

  if (existingId) {
    const { data: prof } = await admin
      .from("profiles")
      .select("rol")
      .eq("id", existingId)
      .maybeSingle();
    const existingRole = String(prof?.rol || "usuario").toLowerCase();
    if (TEAM_ROLES.has(existingRole)) {
      return json(409, {
        error:
          "Este correo pertenece al equipo 360Preventa. Usa el panel de gestión.",
        code: "team_email",
      });
    }

    const upd = await admin.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (upd.error) {
      return json(400, {
        error: upd.error.message || "No se pudo actualizar la cuenta.",
      });
    }

    const patch: Record<string, string> = { rol: "cliente" };
    if (name) {
      patch.nombre_visible = name;
      patch.nombre = name;
    }
    await admin.from("profiles").update(patch).eq("id", existingId);

    return json(200, {
      ok: true,
      created: false,
      user_id: existingId,
      email,
      portal: "/miperfil/",
    });
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });

  if (created.error) {
    if (/already|registered|exists/i.test(created.error.message || "")) {
      return json(200, {
        ok: true,
        created: false,
        email,
        portal: "/miperfil/",
        note: "Cuenta existente; entra con tu correo y celular.",
      });
    }
    return json(400, {
      error: created.error.message || "No se pudo crear la cuenta.",
    });
  }

  const userId = created.data.user?.id;
  if (userId) {
    await admin.from("profiles").upsert({
      id: userId,
      nombre: name || "",
      nombre_visible: name || email.split("@")[0],
      rol: "cliente",
      permisos: {
        editarProyecto: false,
        aplicarTemaProyecto: false,
        subirArchivos: false,
        gestionarUsuarios: false,
        editarPrecios: false,
        publicarProyecto: false,
      },
    }, { onConflict: "id" });
  }

  return json(200, {
    ok: true,
    created: true,
    user_id: userId,
    email,
    portal: "/miperfil/",
  });
});
