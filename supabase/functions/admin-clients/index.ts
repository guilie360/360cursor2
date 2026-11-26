/**
 * Admin: listar / eliminar cuentas cliente (Mi perfil) y datos asociados.
 * Auth: JWT admin | super_admin. Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
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
const ADMIN_ROLES = new Set(["admin", "super_admin"]);

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Contraseña visible = dígitos del celular sin +57 / +34. */
function phonePassword(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length >= 12) digits = digits.slice(2);
  else if (digits.startsWith("34") && digits.length >= 11) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length > 1) {
    digits = digits.replace(/^0+/, "");
  }
  return digits;
}

function packageSummary(snapshot: unknown, label: string, totalCents: number): string {
  const parts: string[] = [];
  if (label) parts.push(label);
  if (snapshot && typeof snapshot === "object") {
    const s = snapshot as Record<string, unknown>;
    const area = s.area ?? s.m2 ?? s.metros;
    const floors = s.floors ?? s.plantas;
    const pkg = s.packageName || s.paquete || s.package;
    if (pkg) parts.push(String(pkg));
    if (area != null && area !== "") parts.push(`${area} m²`);
    if (floors != null && floors !== "") parts.push(`${floors} planta(s)`);
  }
  if (totalCents > 0) {
    parts.push(`${(totalCents / 100).toLocaleString("es-ES")} €`);
  }
  return parts.filter(Boolean).join(" · ") || "Sin paquete";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Faltan secretos Supabase en la Edge Function." });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "Debes iniciar sesión como admin." });
  }

  const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: "Sesión inválida." });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: prof } = await admin
    .from("profiles")
    .select("rol")
    .eq("id", userData.user.id)
    .maybeSingle();
  const rol = String(prof?.rol || "").toLowerCase();
  if (!ADMIN_ROLES.has(rol)) {
    return json(403, { error: "Solo admin puede gestionar la base de datos de clientes." });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON inválido." });
  }

  const action = String(body.action || "list").toLowerCase();

  if (action === "list") {
    const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) {
      return json(500, { error: listErr.message || "No se pudieron listar usuarios." });
    }

    const users = usersPage?.users || [];
    const ids = users.map((u) => u.id);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id,rol,nombre,nombre_visible,telefono,etapa_nombre,etapa_pct,created_at")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const profileById = new Map((profiles || []).map((p) => [p.id, p]));

    const { data: pedidos } = await admin
      .from("panel_pedidos")
      .select(
        "id,customer_name,customer_email,proyecto_label,quote_total_cents,deposit_cents,balance_cents,status,quote_snapshot,is_test,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);

    const { data: quotes } = await admin
      .from("panel_cotizaciones")
      .select(
        "id,customer_name,customer_email,customer_phone,proyecto_label,total_cents,quote_snapshot,is_test,created_at,pedido_id",
      )
      .order("created_at", { ascending: false })
      .limit(300);

    const pedidosByEmail = new Map<string, typeof pedidos>();
    for (const p of pedidos || []) {
      const key = String(p.customer_email || "").trim().toLowerCase();
      if (!key) continue;
      const arr = pedidosByEmail.get(key) || [];
      arr.push(p);
      pedidosByEmail.set(key, arr);
    }
    const quotesByEmail = new Map<string, typeof quotes>();
    for (const q of quotes || []) {
      const key = String(q.customer_email || "").trim().toLowerCase();
      if (!key) continue;
      const arr = quotesByEmail.get(key) || [];
      arr.push(q);
      quotesByEmail.set(key, arr);
    }

    const clients = [];
    for (const u of users) {
      const p = profileById.get(u.id);
      const userRol = String(p?.rol || "usuario").toLowerCase();
      if (TEAM_ROLES.has(userRol)) continue;

      const meta = (u.user_metadata || {}) as Record<string, unknown>;
      const hint = String(meta.phone_password_hint || "");
      const telefono = String(meta.telefono || meta.phone || "");
      const email = String(u.email || "").trim().toLowerCase();
      const pedList = pedidosByEmail.get(email) || [];
      const quoteList = quotesByEmail.get(email) || [];
      const isClientRole = userRol === "cliente";
      const isPortalAccount = hint === "celular_sin_prefijo" || !!telefono;
      const hasOrders = pedList.length > 0 || quoteList.length > 0;

      // Solo cuentas de portal cliente / con pedidos (evita spam de visitantes OAuth)
      if (!isClientRole && !isPortalAccount && !hasOrders) continue;

      const phoneFromQuote = String(quoteList[0]?.customer_phone || "");
      const phoneRaw = telefono || phoneFromQuote;
      const password = phonePassword(phoneRaw);
      const latestPed = pedList[0] || null;
      const latestQuote = quoteList[0] || null;
      const totalCents = Number(
        latestPed?.quote_total_cents || latestQuote?.total_cents || 0,
      );
      const label = String(
        latestPed?.proyecto_label || latestQuote?.proyecto_label || "",
      );
      const snapshot = latestPed?.quote_snapshot || latestQuote?.quote_snapshot || null;

      clients.push({
        id: u.id,
        email,
        name: String(
          p?.nombre_visible || p?.nombre || meta.nombre || meta.nombres || email.split("@")[0],
        ),
        rol: userRol,
        telefono: phoneRaw || String(p?.telefono || ""),
        password_hint: password || null,
        etapa_nombre: String(p?.etapa_nombre || "") || null,
        etapa_pct: Number(p?.etapa_pct || 0),
        created_at: u.created_at,
        pedidos_count: pedList.length,
        cotizaciones_count: quoteList.length,
        latest_pedido: latestPed
          ? {
            id: latestPed.id,
            status: latestPed.status,
            proyecto_label: latestPed.proyecto_label,
            quote_total_cents: latestPed.quote_total_cents,
            deposit_cents: latestPed.deposit_cents,
            balance_cents: latestPed.balance_cents,
            is_test: !!latestPed.is_test,
            created_at: latestPed.created_at,
            summary: packageSummary(
              latestPed.quote_snapshot,
              String(latestPed.proyecto_label || ""),
              Number(latestPed.quote_total_cents || 0),
            ),
          }
          : null,
        latest_cotizacion: latestQuote
          ? {
            id: latestQuote.id,
            proyecto_label: latestQuote.proyecto_label,
            total_cents: latestQuote.total_cents,
            is_test: !!latestQuote.is_test,
            created_at: latestQuote.created_at,
            summary: packageSummary(
              latestQuote.quote_snapshot,
              String(latestQuote.proyecto_label || ""),
              Number(latestQuote.total_cents || 0),
            ),
          }
          : null,
        package_summary: packageSummary(snapshot, label, totalCents),
      });
    }

    clients.sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at))
    );

    return json(200, { ok: true, clients, count: clients.length });
  }

  if (action === "update_stage") {
    const userId = String(body.user_id || body.id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      return json(400, { error: "user_id inválido." });
    }
    let pct = Math.round(Number(body.etapa_pct));
    if (!Number.isFinite(pct)) pct = 0;
    pct = Math.max(0, Math.min(100, pct));
    pct = Math.round(pct / 5) * 5;
    const nombre = String(body.etapa_nombre || "").trim().slice(0, 80);

    const { data: targetProf } = await admin
      .from("profiles")
      .select("rol")
      .eq("id", userId)
      .maybeSingle();
    const targetRol = String(targetProf?.rol || "usuario").toLowerCase();
    if (TEAM_ROLES.has(targetRol)) {
      return json(403, { error: "No aplica a cuentas del equipo." });
    }

    const { error: upErr } = await admin
      .from("profiles")
      .update({
        etapa_pct: pct,
        etapa_nombre: nombre || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (upErr) return json(400, { error: upErr.message || "No se pudo guardar la etapa." });
    return json(200, { ok: true, user_id: userId, etapa_pct: pct, etapa_nombre: nombre || null });
  }

  if (action === "delete") {
    const userId = String(body.user_id || body.id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      return json(400, { error: "user_id inválido." });
    }
    if (userId === userData.user.id) {
      return json(400, { error: "No puedes eliminar tu propia cuenta admin." });
    }

    const { data: targetProf } = await admin
      .from("profiles")
      .select("rol,nombre_visible")
      .eq("id", userId)
      .maybeSingle();
    const targetRol = String(targetProf?.rol || "usuario").toLowerCase();
    if (TEAM_ROLES.has(targetRol)) {
      return json(403, { error: "No se pueden eliminar cuentas del equipo." });
    }

    const { data: targetUser } = await admin.auth.admin.getUserById(userId);
    const email = String(targetUser?.user?.email || "").trim().toLowerCase();

    // Limpia datos asociados al correo (pedidos / cobros / cotizaciones)
    if (email) {
      const { data: pedIds } = await admin
        .from("panel_pedidos")
        .select("id")
        .eq("customer_email", email);
      const ids = (pedIds || []).map((r) => r.id);
      if (ids.length) {
        await admin.from("panel_cobros").delete().in("pedido_id", ids);
        await admin.from("panel_pedidos").delete().in("id", ids);
      }
      await admin.from("panel_cotizaciones").delete().eq("customer_email", email);
    }

    // Mensajes de chat del cliente
    await admin.from("panel_team_messages").delete().eq("sender_id", userId);
    await admin.from("panel_team_messages").delete().eq("thread", `client:${userId}`);
    await admin.from("panel_chat_clears").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);

    const del = await admin.auth.admin.deleteUser(userId);
    if (del.error) {
      return json(400, { error: del.error.message || "No se pudo eliminar el usuario." });
    }

    return json(200, {
      ok: true,
      deleted: userId,
      email,
      name: targetProf?.nombre_visible || null,
    });
  }

  return json(400, { error: "Acción no soportada. Usa list o delete." });
});
