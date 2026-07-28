/**
 * BOXIES V5.9.72 - bunny-media (node-centric)
 * Secure Bunny Storage proxy. Access key lives only in Supabase Secrets.
 *
 * Path: projects/{project_id}/{category}/{node_id}/{file}
 *
 * Actions:
 *   POST multipart: upload (fields: project_id, category, node_id, file)
 *   POST JSON: { action: "delete", project_id, archivo_id?, storage_path }
 *   GET /?project_id=... : list bunny assets for project
 *
 * Required secrets:
 *   BUNNY_STORAGE_ACCESS_KEY
 *   BUNNY_STORAGE_ZONE=boxies (optional default)
 *   BUNNY_CDN_BASE=https://boxies.b-cdn.net (optional default)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const MAX_BYTES = 20 * 1024 * 1024; // 20MB - aligns with MediaEngine image limit

const CATEGORIES: Record<
  string,
  { folder: string; tipo: string }
> = {
  images: { folder: "images", tipo: "imagen" },
  videos: { folder: "videos", tipo: "video" },
  plans2d: { folder: "plans2d", tipo: "plano" },
  plans3d: { folder: "plans3d", tipo: "plano" },
  documents: { folder: "documents", tipo: "pdf" },
  ui: { folder: "ui", tipo: "imagen" },
  /* Aliases → canonical folders (V5.9.72) */
  animations: { folder: "videos", tipo: "video" },
  "plans-2d": { folder: "plans2d", tipo: "plano" },
  "plans-3d": { folder: "plans3d", tipo: "plano" },
  floorplans: { folder: "plans2d", tipo: "plano" },
  /* Legacy folders still accepted for reads/deletes via path */
  panoramas: { folder: "panoramas", tipo: "tour_360" },
  thumbnails: { folder: "ui", tipo: "imagen" },
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function sanitizeFilename(name: string): string {
  const base = String(name || "file")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return base || `file-${Date.now()}`;
}

function extFromName(name: string): string {
  const parts = String(name || "").split(".");
  if (parts.length < 2) return "bin";
  return parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
}

function resolveTipo(
  category: string,
  mime: string,
  filename: string,
): string {
  const cat = CATEGORIES[category];
  if (!cat) return "imagen";
  if (category === "documents") {
    const ext = extFromName(filename);
    if (ext === "pdf" || (mime || "").includes("pdf")) return "pdf";
    return "brochure";
  }
  if (category === "animations" || category === "videos") {
    if ((mime || "").startsWith("image/")) return "imagen";
    return "video";
  }
  return cat.tipo;
}

function getBunnyConfig() {
  const accessKey = Deno.env.get("BUNNY_STORAGE_ACCESS_KEY") || "";
  const zone = Deno.env.get("BUNNY_STORAGE_ZONE") || "boxies";
  const cdnBase = (
    Deno.env.get("BUNNY_CDN_BASE") || "https://boxies.b-cdn.net"
  ).replace(/\/$/, "");
  return { accessKey, zone, cdnBase };
}

async function createUserClient(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ||
    (() => {
      try {
        const keys = JSON.parse(
          Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}",
        );
        return keys.default || "";
      } catch {
        return "";
      }
    })();

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData?.user) {
    return { supabase: null, user: null, error: "No autenticado" };
  }
  return { supabase, user: userData.user, error: null };
}

async function assertProjectAccess(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("proyectos")
    .select("id, constructora_id, nombre")
    .eq("id", projectId)
    .maybeSingle();
  if (error) return { project: null, error: error.message };
  if (!data) return { project: null, error: "Proyecto no accesible" };
  return { project: data, error: null };
}

async function bunnyPut(
  zone: string,
  accessKey: string,
  storagePath: string,
  bytes: Uint8Array,
  contentType: string,
) {
  const url = `https://storage.bunnycdn.com/${zone}/${storagePath}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: accessKey,
      "Content-Type": contentType || "application/octet-stream",
    },
    body: bytes,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bunny upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function bunnyDelete(
  zone: string,
  accessKey: string,
  storagePath: string,
) {
  const url = `https://storage.bunnycdn.com/${zone}/${storagePath}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { AccessKey: accessKey },
  });
  /* 404 = already gone - treat as success */
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bunny delete failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function handleUpload(req: Request) {
  const { accessKey, zone, cdnBase } = getBunnyConfig();
  if (!accessKey) {
    return json(503, {
      ok: false,
      error:
        "BUNNY_STORAGE_ACCESS_KEY no configurada. Añádela en Supabase Edge Function Secrets.",
      code: "MISSING_SECRET",
    });
  }

  const { supabase, user, error: authErr } = await createUserClient(req);
  if (!supabase || !user) return json(401, { ok: false, error: authErr || "No autenticado" });

  const form = await req.formData();
  const projectId = String(form.get("project_id") || "").trim();
  const category = String(form.get("category") || "images").trim();
  const nodeIdRaw = String(form.get("node_id") || "").trim();
  const file = form.get("file");

  if (!projectId) return json(400, { ok: false, error: "project_id requerido" });
  if (!CATEGORIES[category]) {
    return json(400, {
      ok: false,
      error: "category inválida",
      allowed: Object.keys(CATEGORIES),
    });
  }
  if (!(file instanceof File)) {
    return json(400, { ok: false, error: "file requerido (multipart)" });
  }
  if (!nodeIdRaw) {
    return json(400, {
      ok: false,
      error: "node_id requerido — todo asset pertenece a un nodo del Canvas",
      code: "MISSING_NODE_ID",
    });
  }
  if (file.size <= 0) return json(400, { ok: false, error: "Archivo vacío" });
  if (file.size > MAX_BYTES) {
    return json(400, {
      ok: false,
      error: `Archivo demasiado grande (máx ${MAX_BYTES / (1024 * 1024)} MB en Fase 1)`,
    });
  }

  const { project, error: projErr } = await assertProjectAccess(supabase, projectId);
  if (!project) return json(403, { ok: false, error: projErr || "Sin acceso" });

  const safeName = sanitizeFilename(file.name);
  const stamp = Date.now();
  const folder = CATEGORIES[category].folder;
  const nodeSeg = sanitizeFilename(nodeIdRaw).replace(/\./g, "-");
  const storagePath =
    `projects/${projectId}/${folder}/${nodeSeg}/${stamp}-${safeName}`;
  const contentType = file.type || "application/octet-stream";
  const bytes = new Uint8Array(await file.arrayBuffer());

  await bunnyPut(zone, accessKey, storagePath, bytes, contentType);

  const publicUrl = `${cdnBase}/${storagePath}`;
  const tipo = resolveTipo(category, contentType, safeName);
  const pesoMb = Math.round((file.size / (1024 * 1024)) * 1000) / 1000;

  const insert = await supabase
    .from("archivos")
    .insert({
      constructora_id: project.constructora_id,
      proyecto_id: projectId,
      tipo,
      nombre: safeName,
      extension: extFromName(safeName),
      url: publicUrl,
      peso_mb: pesoMb,
      storage_provider: "bunny",
      storage_path: storagePath,
      estado: "activo",
    })
    .select(
      "id, proyecto_id, tipo, nombre, extension, url, miniatura_url, peso_mb, storage_provider, storage_path, created_at",
    )
    .single();

  if (insert.error) {
    try {
      await bunnyDelete(zone, accessKey, storagePath);
    } catch (_) { /* ignore */ }
    return json(500, {
      ok: false,
      error: insert.error.message || "Error registrando en archivos",
    });
  }

  return json(200, {
    ok: true,
    archivo: insert.data,
    publicUrl,
    storagePath,
    category,
    provider: "bunny",
    node_id: nodeIdRaw || null,
  });
}

async function handleDelete(req: Request) {
  const { accessKey, zone } = getBunnyConfig();
  if (!accessKey) {
    return json(503, {
      ok: false,
      error: "BUNNY_STORAGE_ACCESS_KEY no configurada",
      code: "MISSING_SECRET",
    });
  }

  const { supabase, user, error: authErr } = await createUserClient(req);
  if (!supabase || !user) return json(401, { ok: false, error: authErr || "No autenticado" });

  const body = await req.json().catch(() => ({}));
  const projectId = String(body.project_id || "").trim();
  const archivoId = body.archivo_id ? String(body.archivo_id) : null;
  let storagePath = body.storage_path ? String(body.storage_path) : null;

  if (!projectId) return json(400, { ok: false, error: "project_id requerido" });

  const { project, error: projErr } = await assertProjectAccess(supabase, projectId);
  if (!project) return json(403, { ok: false, error: projErr || "Sin acceso" });

  // deno-lint-ignore no-explicit-any
  let row: any = null;
  if (archivoId) {
    const q = await supabase
      .from("archivos")
      .select("id, storage_path, storage_provider, proyecto_id, url")
      .eq("id", archivoId)
      .eq("proyecto_id", projectId)
      .maybeSingle();
    if (q.error) return json(500, { ok: false, error: q.error.message });
    if (!q.data) return json(404, { ok: false, error: "Archivo no encontrado" });
    row = q.data;
    storagePath = row.storage_path || storagePath;
  }

  if (!storagePath) {
    return json(400, { ok: false, error: "storage_path o archivo_id requerido" });
  }
  if (!String(storagePath).startsWith(`projects/${projectId}/`)) {
    return json(400, { ok: false, error: "storage_path fuera del proyecto" });
  }

  await bunnyDelete(zone, accessKey, storagePath);

  if (row?.id || archivoId) {
    const del = await supabase
      .from("archivos")
      .delete()
      .eq("id", row?.id || archivoId)
      .eq("proyecto_id", projectId);
    if (del.error) {
      return json(500, {
        ok: false,
        error: del.error.message || "Bunny borrado; fallo al limpiar DB",
        bunnyDeleted: true,
      });
    }
  } else {
    await supabase
      .from("archivos")
      .delete()
      .eq("proyecto_id", projectId)
      .eq("storage_path", storagePath)
      .eq("storage_provider", "bunny");
  }

  return json(200, { ok: true, deleted: true, storagePath });
}

async function handleList(req: Request) {
  const { supabase, user, error: authErr } = await createUserClient(req);
  if (!supabase || !user) return json(401, { ok: false, error: authErr || "No autenticado" });

  const url = new URL(req.url);
  const projectId = String(url.searchParams.get("project_id") || "").trim();
  if (!projectId) return json(400, { ok: false, error: "project_id requerido" });

  const { project, error: projErr } = await assertProjectAccess(supabase, projectId);
  if (!project) return json(403, { ok: false, error: projErr || "Sin acceso" });

  const q = await supabase
    .from("archivos")
    .select(
      "id, proyecto_id, tipo, nombre, extension, url, miniatura_url, peso_mb, storage_provider, storage_path, created_at, orden",
    )
    .eq("proyecto_id", projectId)
    .eq("storage_provider", "bunny")
    .order("created_at", { ascending: false });

  if (q.error) return json(500, { ok: false, error: q.error.message });
  return json(200, { ok: true, items: q.data || [] });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    if (req.method === "GET") {
      return await handleList(req);
    }
    if (req.method === "POST") {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("multipart/form-data")) {
        return await handleUpload(req);
      }
      const peek = await req.clone().json().catch(() => ({}));
      if (peek && peek.action === "delete") {
        return await handleDelete(req);
      }
      return json(400, {
        ok: false,
        error: 'Usa multipart upload o JSON { action: "delete", ... }',
      });
    }
    return json(405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[bunny-media]", message);
    return json(500, { ok: false, error: message });
  }
});
