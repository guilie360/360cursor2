/**
 * BOXIES V5.9.84 - bunny-media (node-centric)
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
 *   BUNNY_STORAGE_HOSTNAME=storage.bunnycdn.com (optional; region host if needed)
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

function encodeStoragePath(storagePath: string): string {
  return String(storagePath || "")
    .split("/")
    .filter((s) => s.length > 0)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function firstEnv(names: string[]): { name: string; value: string } {
  for (const name of names) {
    const value = (Deno.env.get(name) || "").trim();
    if (value) return { name, value };
  }
  return { name: "", value: "" };
}

function getBunnyConfig() {
  const keyInfo = firstEnv([
    "BUNNY_STORAGE_ACCESS_KEY",
    "BUNNY_ACCESS_KEY",
    "BUNNY_STORAGE_PASSWORD",
    "BUNNY_ZONE_PASSWORD",
    "BUNNY_STORAGE_ZONE_PASSWORD",
  ]);
  const zone = firstEnv([
    "BUNNY_STORAGE_ZONE",
    "BUNNY_ZONE",
    "BUNNY_ZONE_NAME",
  ]).value || "boxies";
  const cdnBase = (
    firstEnv(["BUNNY_CDN_BASE", "BUNNY_PULL_ZONE", "BUNNY_CDN_URL"]).value ||
    "https://boxies.b-cdn.net"
  ).replace(/\/$/, "");
  const hostname = (
    firstEnv([
      "BUNNY_STORAGE_HOSTNAME",
      "BUNNY_STORAGE_HOST",
      "BUNNY_STORAGE_ENDPOINT",
    ]).value || "storage.bunnycdn.com"
  )
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\/.*/, "");
  return {
    accessKey: keyInfo.value,
    accessKeyEnv: keyInfo.name || null,
    zone,
    cdnBase,
    hostname,
  };
}

const BUNNY_REGION_HOSTS = [
  "storage.bunnycdn.com",
  "de.storage.bunnycdn.com",
  "ny.storage.bunnycdn.com",
  "la.storage.bunnycdn.com",
  "uk.storage.bunnycdn.com",
  "sg.storage.bunnycdn.com",
  "syd.storage.bunnycdn.com",
  "br.storage.bunnycdn.com",
  "jh.storage.bunnycdn.com",
];

function getAnonKey() {
  return (
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
    })()
  );
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createUserClient(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = getAnonKey();

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

function isUploadBlob(value: FormDataEntryValue | null): value is Blob {
  return !!value && typeof value !== "string" && typeof (value as Blob).arrayBuffer === "function";
}

async function bunnyPutOnce(
  hostname: string,
  zone: string,
  accessKey: string,
  storagePath: string,
  body: Blob,
  contentType: string,
) {
  const encodedPath = encodeStoragePath(storagePath);
  const url = `https://${hostname}/${zone}/${encodedPath}`;
  console.log("[bunny-media] ✔ URL de Bunny", url, "bytes=", body.size, "ct=", contentType);
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: accessKey,
      "Content-Type": contentType || "application/octet-stream",
    },
    body,
  });
  const text = await res.text().catch(() => "");
  console.log("[bunny-media] ✔ Status HTTP Bunny", res.status, "body=", text.slice(0, 300));
  return { ok: res.ok, status: res.status, body: text, url, hostname };
}

async function bunnyPut(
  preferredHost: string,
  zone: string,
  accessKey: string,
  storagePath: string,
  bytes: Uint8Array,
  contentType: string,
) {
  const mime = contentType || "application/octet-stream";
  const blob = new Blob([bytes], { type: mime });
  const hosts = [preferredHost]
    .concat(BUNNY_REGION_HOSTS)
    .filter((h, i, arr) => h && arr.indexOf(h) === i);

  let last: { ok: boolean; status: number; body: string; url: string; hostname: string } | null =
    null;
  for (const host of hosts) {
    last = await bunnyPutOnce(host, zone, accessKey, storagePath, blob, mime);
    if (last.ok) {
      return { status: last.status, body: last.body, url: last.url, hostname: host };
    }
    /* 401 suele ser AccessKey o región incorrecta → probar siguiente host */
    if (last.status !== 401) break;
    console.warn("[bunny-media] Bunny 401 en", host, "→ reintento otra región");
  }

  const err = new Error(
    `Bunny upload failed (${last?.status ?? "?"}): ${(last?.body || "").slice(0, 200) || "sin body"}`,
  );
  // deno-lint-ignore no-explicit-any
  (err as any).bunnyStatus = last?.status || null;
  // deno-lint-ignore no-explicit-any
  (err as any).bunnyBody = (last?.body || "").slice(0, 500);
  // deno-lint-ignore no-explicit-any
  (err as any).bunnyUrl = last?.url || null;
  throw err;
}

async function bunnyDelete(
  hostname: string,
  zone: string,
  accessKey: string,
  storagePath: string,
) {
  const encodedPath = encodeStoragePath(storagePath);
  const url = `https://${hostname}/${zone}/${encodedPath}`;
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

async function handleBunnyProbe(req: Request) {
  const { supabase, user, error: authErr } = await createUserClient(req);
  if (!supabase || !user) return json(401, { ok: false, error: authErr || "No autenticado" });

  const cfg = getBunnyConfig();
  if (!cfg.accessKey) {
    return json(503, {
      ok: false,
      code: "MISSING_SECRET",
      error:
        "Ningún secret Bunny encontrado. Configura BUNNY_STORAGE_ACCESS_KEY (Storage Zone Password) en Supabase → Edge Functions → Secrets.",
      triedEnv: [
        "BUNNY_STORAGE_ACCESS_KEY",
        "BUNNY_ACCESS_KEY",
        "BUNNY_STORAGE_PASSWORD",
        "BUNNY_ZONE_PASSWORD",
      ],
    });
  }

  const url = `https://${cfg.hostname}/${cfg.zone}/`;
  console.log("[bunny-media] probe LIST", url, "keyEnv=", cfg.accessKeyEnv, "keyLen=", cfg.accessKey.length);
  const res = await fetch(url, {
    method: "GET",
    headers: { AccessKey: cfg.accessKey, Accept: "application/json" },
  });
  const text = await res.text().catch(() => "");
  console.log("[bunny-media] probe status=", res.status, "body=", text.slice(0, 200));

  if (!res.ok) {
    return json(502, {
      ok: false,
      code: "BUNNY_PROBE_FAILED",
      error: `Bunny LIST ${res.status}: ${text.slice(0, 200) || res.statusText}`,
      bunnyStatus: res.status,
      bunnyBody: text.slice(0, 300),
      bunnyUrl: url,
      accessKeyEnv: cfg.accessKeyEnv,
      accessKeyLen: cfg.accessKey.length,
      zone: cfg.zone,
      hostname: cfg.hostname,
      hint:
        res.status === 401
          ? "AccessKey inválida o hostname de región incorrecto. Usa la Storage Zone Password (FTP & API Access), no la API key de cuenta."
          : null,
    });
  }

  return json(200, {
    ok: true,
    code: "BUNNY_OK",
    bunnyStatus: res.status,
    accessKeyEnv: cfg.accessKeyEnv,
    zone: cfg.zone,
    hostname: cfg.hostname,
    cdnBase: cfg.cdnBase,
  });
}

async function handleUpload(req: Request) {
  const { accessKey, accessKeyEnv, zone, cdnBase, hostname } = getBunnyConfig();
  console.log(
    "[bunny-media] upload config",
    "keyEnv=",
    accessKeyEnv,
    "keyLen=",
    accessKey.length,
    "zone=",
    zone,
    "host=",
    hostname,
  );
  if (!accessKey) {
    return json(503, {
      ok: false,
      error:
        "BUNNY_STORAGE_ACCESS_KEY no configurada. Añádela en Supabase Edge Function Secrets (Storage Zone Password de la zona boxies).",
      code: "MISSING_SECRET",
    });
  }

  const { supabase, user, error: authErr } = await createUserClient(req);
  if (!supabase || !user) return json(401, { ok: false, error: authErr || "No autenticado" });

  let form: FormData;
  try {
    form = await req.formData();
  } catch (parseErr) {
    const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
    console.error("[bunny-media] formData parse failed", message);
    return json(400, {
      ok: false,
      error: "multipart inválido (¿Content-Type sin boundary?). Usa fetch con FormData sin Content-Type manual.",
      detail: message,
      code: "BAD_MULTIPART",
    });
  }

  const projectId = String(form.get("project_id") || "").trim();
  const category = String(form.get("category") || "images").trim();
  const nodeIdRaw = String(form.get("node_id") || "").trim();
  const fileEntry = form.get("file");

  console.log("[bunny-media] upload fields", {
    projectId,
    category,
    nodeId: nodeIdRaw,
    fileType: fileEntry == null ? "null" : typeof fileEntry,
    isBlob: isUploadBlob(fileEntry),
    fileName: isUploadBlob(fileEntry) && "name" in fileEntry
      ? String((fileEntry as File).name || "")
      : "",
    fileSize: isUploadBlob(fileEntry) ? fileEntry.size : 0,
  });

  if (!projectId) return json(400, { ok: false, error: "project_id requerido" });
  if (!CATEGORIES[category]) {
    return json(400, {
      ok: false,
      error: "category inválida",
      allowed: Object.keys(CATEGORIES),
    });
  }
  if (!isUploadBlob(fileEntry)) {
    return json(400, {
      ok: false,
      error: "file requerido (multipart)",
      code: "MISSING_FILE",
    });
  }
  if (!nodeIdRaw) {
    return json(400, {
      ok: false,
      error: "node_id requerido — todo asset pertenece a un nodo del Canvas",
      code: "MISSING_NODE_ID",
    });
  }
  if (fileEntry.size <= 0) return json(400, { ok: false, error: "Archivo vacío" });
  if (fileEntry.size > MAX_BYTES) {
    return json(400, {
      ok: false,
      error: `Archivo demasiado grande (máx ${MAX_BYTES / (1024 * 1024)} MB en Fase 1)`,
    });
  }

  const { project, error: projErr } = await assertProjectAccess(supabase, projectId);
  if (!project) return json(403, { ok: false, error: projErr || "Sin acceso" });

  const originalName =
    "name" in fileEntry && (fileEntry as File).name
      ? String((fileEntry as File).name)
      : "upload.bin";
  const safeName = sanitizeFilename(originalName);
  const stamp = Date.now();
  const folder = CATEGORIES[category].folder;
  const nodeSeg = sanitizeFilename(nodeIdRaw).replace(/\./g, "-");
  const storagePath =
    `projects/${projectId}/${folder}/${nodeSeg}/${stamp}-${safeName}`;
  const contentType = fileEntry.type || "application/octet-stream";
  const bytes = new Uint8Array(await fileEntry.arrayBuffer());

  console.log("[bunny-media] ✔ Archivo recibido", originalName, fileEntry.size);
  console.log("[bunny-media] ✔ Ruta generada", storagePath);

  let bunnyResult: { status: number; body: string; url: string };
  try {
    bunnyResult = await bunnyPut(
      hostname,
      zone,
      accessKey,
      storagePath,
      bytes,
      contentType,
    );
  } catch (bunnyErr) {
    // deno-lint-ignore no-explicit-any
    const be = bunnyErr as any;
    const message = bunnyErr instanceof Error ? bunnyErr.message : String(bunnyErr);
    console.error("[bunny-media] Bunny PUT failed", message);
    return json(502, {
      ok: false,
      error: message,
      code: "BUNNY_UPLOAD_FAILED",
      bunnyStatus: be.bunnyStatus || null,
      bunnyBody: be.bunnyBody || null,
      bunnyUrl: be.bunnyUrl || null,
      storagePath,
    });
  }

  console.log("[bunny-media] ✔ Bunny OK", bunnyResult.status);

  const publicUrl = `${cdnBase}/${storagePath}`;
  const tipo = resolveTipo(category, contentType, safeName);
  const pesoMb = Math.round((fileEntry.size / (1024 * 1024)) * 1000) / 1000;

  /* Tras auth + acceso a proyecto, insertar con service role evita fallos RLS
   * (usuario puede leer proyecto pero no tener policy de INSERT en archivos). */
  const db = createServiceClient() || supabase;
  const insert = await db
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
    console.error("[bunny-media] Supabase insert failed", insert.error.message);
    try {
      await bunnyDelete(hostname, zone, accessKey, storagePath);
    } catch (_) { /* ignore */ }
    return json(500, {
      ok: false,
      error: insert.error.message || "Error registrando en archivos",
      code: "DB_INSERT_FAILED",
      storagePath,
      publicUrl,
    });
  }

  console.log("[bunny-media] ✔ Registro Supabase", insert.data?.id);

  return json(200, {
    ok: true,
    archivo: insert.data,
    publicUrl,
    storagePath,
    category,
    provider: "bunny",
    node_id: nodeIdRaw || null,
    bunnyStatus: bunnyResult.status,
  });
}

async function handleDelete(req: Request) {
  const { accessKey, zone, hostname } = getBunnyConfig();
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

  await bunnyDelete(hostname, zone, accessKey, storagePath);

  const db = createServiceClient() || supabase;
  if (row?.id || archivoId) {
    const del = await db
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
    await db
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
      const url = new URL(req.url);
      if (url.searchParams.get("probe") === "bunny") {
        return await handleBunnyProbe(req);
      }
      return await handleList(req);
    }
    if (req.method === "POST") {
      const ct = req.headers.get("content-type") || "";
      console.log("[bunny-media] POST content-type=", ct);
      if (ct.includes("multipart/form-data")) {
        return await handleUpload(req);
      }
      const peek = await req.clone().json().catch(() => ({}));
      if (peek && peek.action === "delete") {
        return await handleDelete(req);
      }
      if (peek && peek.action === "probe") {
        return await handleBunnyProbe(req);
      }
      return json(400, {
        ok: false,
        error: 'Usa multipart upload o JSON { action: "delete"|"probe", ... }',
        contentType: ct || null,
      });
    }
    return json(405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[bunny-media]", message);
    return json(500, { ok: false, error: message });
  }
});
