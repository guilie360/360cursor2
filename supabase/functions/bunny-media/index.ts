/**
 * BOXIES V5.9.88 - bunny-media (slug-based folder layout + full auto-sync)
 * Secure Bunny Storage proxy. Access key lives only in Supabase Secrets.
 *
 * NEW physical layout (V5.9.86) — Bunny folders are controlled by BOXIES
 * slugs, never by raw UUIDs:
 *   Media upload : projects/{showroom_slug}/media/{node_slug}/{category_folder}/{stamp}-{file}
 *   Hero upload  : projects/{showroom_slug}/hero/{images|logos|videos}/{stamp}-{file}
 * LEGACY layout (still read/deleted for backward compatibility):
 *   projects/{project_uuid}/{category_folder}/{node_id}/{file}
 *
 * V5.9.87 — sync_all_showrooms: reads every non-template showroom straight
 * from `proyectos` (no hardcoded names), ensures its Bunny folder skeleton
 * (hero + media + one folder set per Canvas node derived from `tipologias`
 * and `proyecto_estructura.draft_json`), and migrates any legacy
 * projects/{uuid}/... tree into the slug-based layout, updating `archivos`
 * rows and removing the old UUID directory once migrated.
 *
 * V5.9.88 — Amenities are opt-in for Media (Structure remains SSOT):
 *   Tipologías → auto folders
 *   Amenidades → only `mediaAmenityNames` (subset of Structure zones)
 *   One-shot migration clears auto-created amenity Media folders and
 *   resets mediaAmenityNames to [] on every showroom.
 *
 * Actions:
 *   POST multipart: upload
 *     fields: project_id, category, node_id, file,
 *             showroom_slug, node_slug, scope ("media"|"hero", default "media")
 *   POST JSON: { action: "delete", project_id, archivo_id?, storage_path }
 *   POST JSON: { action: "probe" }                                    → Bunny connectivity check
 *   POST JSON: { action: "ensure_folders", project_id, showroom_slug, folders: string[] }
 *   POST JSON: { action: "list_folder", project_id, showroom_slug, path }
 *   POST JSON: { action: "delete_folder", project_id, showroom_slug, path, recursive }
 *   POST JSON: { action: "rename_folder", project_id, showroom_slug, from, to }
 *   POST JSON: { action: "sync_all_showrooms" }                       → full DB→Bunny mirror (auth only, no body)
 *   GET  /?project_id=...   : list bunny assets for project (DB-backed)
 *   GET  /?probe=bunny      : Bunny connectivity check
 *
 * Folder ops operate on paths RELATIVE to projects/{showroom_slug}/, e.g.
 * "media/porteria/images" or "hero". Path traversal ("..", absolute paths)
 * is always neutralized before touching Bunny — every resolved path is
 * re-anchored under projects/{showroomSlug}/.
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
  tours360: { folder: "tours360", tipo: "tour_360" },
  logos: { folder: "logos", tipo: "imagen" },
  /* Aliases → canonical folders (V5.9.72) */
  animations: { folder: "videos", tipo: "video" },
  "plans-2d": { folder: "plans2d", tipo: "plano" },
  "plans-3d": { folder: "plans3d", tipo: "plano" },
  floorplans: { folder: "plans2d", tipo: "plano" },
  /* Legacy folders still accepted for reads/deletes via path */
  panoramas: { folder: "panoramas", tipo: "tour_360" },
  thumbnails: { folder: "ui", tipo: "imagen" },
};

/* scope=hero uploads may only target these Bunny folders */
const HERO_FOLDERS = ["images", "logos", "videos"];

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

/**
 * BOXIES slug rule (V5.9.86): lowercase, accent-stripped, [a-z0-9-] only,
 * hyphens collapsed, max 80 chars. Used for showroom_slug / node_slug so
 * Bunny folder names never depend on raw UUIDs.
 */
function sanitizeSlug(name: string): string {
  const stripped = String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const base = stripped
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, 80).replace(/-+$/, "");
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

/**
 * Normalizes a user-supplied relative path (folder ops) into safe segments.
 * Strips backslashes, drops empty/"." segments, rejects ".." (traversal) and
 * any character outside [A-Za-z0-9._-]. Returns "" for the root, or null if
 * the input is invalid.
 */
function ensureSafeRelativePath(rel: string): string | null {
  const segments = String(rel || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== ".");
  for (const seg of segments) {
    if (seg === "..") return null;
    if (!/^[A-Za-z0-9._-]+$/.test(seg)) return null;
  }
  return segments.join("/");
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
    .select("id, constructora_id, nombre, slug")
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

/** Recursively deletes a directory and everything under it (native Bunny behaviour). */
async function bunnyDeleteDirRecursive(
  hostname: string,
  zone: string,
  accessKey: string,
  dirPath: string,
) {
  const encodedPath = encodeStoragePath(dirPath);
  const url = `https://${hostname}/${zone}/${encodedPath}/`;
  const res = await fetch(url, { method: "DELETE", headers: { AccessKey: accessKey } });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bunny recursive delete failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function bunnyGetObject(
  hostname: string,
  zone: string,
  accessKey: string,
  storagePath: string,
) {
  const encodedPath = encodeStoragePath(storagePath);
  const url = `https://${hostname}/${zone}/${encodedPath}`;
  const res = await fetch(url, { method: "GET", headers: { AccessKey: accessKey } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bunny GET failed (${res.status}) ${storagePath}: ${text.slice(0, 200)}`);
  }
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, contentType };
}

type BunnyDirItem = { name: string; isDirectory: boolean; size: number };

/** Single-level Bunny directory listing. Returns [] for missing directories. */
async function bunnyListDir(
  hostname: string,
  zone: string,
  accessKey: string,
  dirPath: string,
): Promise<BunnyDirItem[]> {
  const encodedPath = encodeStoragePath(dirPath);
  const url = `https://${hostname}/${zone}/${encodedPath}/`;
  const res = await fetch(url, {
    method: "GET",
    headers: { AccessKey: accessKey, Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 404) return [];
    const text = await res.text().catch(() => "");
    throw new Error(`Bunny list failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const text = await res.text().catch(() => "");
  // deno-lint-ignore no-explicit-any
  let arr: any[] = [];
  try {
    arr = JSON.parse(text);
  } catch {
    arr = [];
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((o) => ({
    name: String(o.ObjectName || ""),
    isDirectory: !!o.IsDirectory,
    size: Number(o.Length || 0),
  }));
}

/** Recursively walks a directory, returning every file with its path relative to dirPath. */
async function bunnyWalkFiles(
  hostname: string,
  zone: string,
  accessKey: string,
  dirPath: string,
  relPrefix = "",
): Promise<{ relPath: string; size: number }[]> {
  const items = await bunnyListDir(hostname, zone, accessKey, dirPath);
  let files: { relPath: string; size: number }[] = [];
  for (const item of items) {
    if (!item.name) continue;
    const rel = relPrefix ? `${relPrefix}/${item.name}` : item.name;
    if (item.isDirectory) {
      const nested = await bunnyWalkFiles(
        hostname,
        zone,
        accessKey,
        `${dirPath}/${item.name}`,
        rel,
      );
      files = files.concat(nested);
    } else {
      files.push({ relPath: rel, size: item.size });
    }
  }
  return files;
}

function isMarkerFile(relPath: string): boolean {
  const base = relPath.split("/").pop() || "";
  return base === ".boxieskeep";
}

/**
 * Maps a legacy path (relative to projects/{uuid}/) onto its new slug-based
 * home (relative to projects/{slug}/). Legacy layout was
 * {category_folder}/{node_id}/{file}; new layout is media/{node_slug}/{category}/{file}.
 * Paths already in the new shape (media/... or hero/...) pass through untouched.
 */
function remapLegacyRelPath(relPath: string): string {
  const clean = String(relPath || "").replace(/^\/+/, "");
  if (clean.startsWith("media/") || clean.startsWith("hero/")) return clean;

  const parts = clean.split("/").filter((s) => s.length > 0);
  const catMap: Record<string, string> = {
    images: "images",
    videos: "videos",
    plans2d: "plans2d",
    plans3d: "plans3d",
    documents: "documents",
    ui: "ui",
    tours360: "tours360",
    animations: "videos",
    panoramas: "tours360",
    thumbnails: "ui",
    logos: "images",
  };

  const cat = parts[0] || "";
  const canonicalCat = catMap[cat];

  if (canonicalCat && parts.length >= 3) {
    /* {cat}/{node_id}/{file...} → media/{node_slug}/{canonicalCat}/{file...} */
    const nodeSlug = sanitizeSlug(parts[1]) || "_root";
    const rest = parts.slice(2).join("/");
    return `media/${nodeSlug}/${canonicalCat}/${rest}`;
  }

  if (cat === "logos" && parts.length === 2) {
    /* {logos}/{file} — hero logo with no node level */
    return `hero/logos/${parts[1]}`;
  }
  if ((cat === "images" || cat === "videos") && parts.length === 2) {
    /* {images|videos}/{file} — hero asset with no node level */
    return `hero/${cat}/${parts[1]}`;
  }

  return `media/_imported/${clean}`;
}

const NODE_FOLDERS_FULL = [
  "images",
  "videos",
  "plans2d",
  "plans3d",
  "tours360",
  "documents",
  "ui",
];
const NODE_FOLDERS_ZONE = ["images", "videos", "tours360", "documents"];

// deno-lint-ignore no-explicit-any
function pickBunnySlug(node: any): string {
  if (typeof node === "string") return sanitizeSlug(node);
  if (!node || typeof node !== "object") return "";
  return sanitizeSlug(
    String(node.bunny_slug || node.nombre || node.name || node.label || node.id || ""),
  );
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
  const showroomSlugRaw = String(form.get("showroom_slug") || "").trim();
  const nodeSlugRaw = String(form.get("node_slug") || "").trim();
  const scope = String(form.get("scope") || "media").trim().toLowerCase() === "hero"
    ? "hero"
    : "media";
  const fileEntry = form.get("file");

  console.log("[bunny-media] upload fields", {
    projectId,
    category,
    nodeId: nodeIdRaw,
    showroomSlugRaw,
    nodeSlugRaw,
    scope,
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
  if (fileEntry.size <= 0) return json(400, { ok: false, error: "Archivo vacío" });
  if (fileEntry.size > MAX_BYTES) {
    return json(400, {
      ok: false,
      error: `Archivo demasiado grande (máx ${MAX_BYTES / (1024 * 1024)} MB en Fase 1)`,
    });
  }

  const { project, error: projErr } = await assertProjectAccess(supabase, projectId);
  if (!project) return json(403, { ok: false, error: projErr || "Sin acceso" });

  const showroomSlug = sanitizeSlug(showroomSlugRaw || project.slug || "");
  if (!showroomSlug) {
    return json(400, {
      ok: false,
      error: "showroom_slug requerido (o el proyecto debe tener slug asignado)",
      code: "SHOWROOM_SLUG_REQUIRED",
    });
  }

  const folder = CATEGORIES[category].folder;
  let nodeSlug = "";
  if (scope === "hero") {
    if (!HERO_FOLDERS.includes(folder)) {
      return json(400, {
        ok: false,
        error: "category inválida para scope=hero (usa images|logos|videos)",
        allowed: HERO_FOLDERS,
        code: "INVALID_HERO_CATEGORY",
      });
    }
  } else {
    nodeSlug = sanitizeSlug(nodeSlugRaw);
    if (!nodeSlug) {
      return json(400, {
        ok: false,
        error: "node_slug requerido para scope=media — todo asset pertenece a un nodo del Canvas",
        code: "NODE_SLUG_REQUIRED",
      });
    }
  }

  const originalName =
    "name" in fileEntry && (fileEntry as File).name
      ? String((fileEntry as File).name)
      : "upload.bin";
  const safeName = sanitizeFilename(originalName);
  const stamp = Date.now();
  const storagePath = scope === "hero"
    ? `projects/${showroomSlug}/hero/${folder}/${stamp}-${safeName}`
    : `projects/${showroomSlug}/media/${nodeSlug}/${folder}/${stamp}-${safeName}`;
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
  /* Keep real byte weight; avoid rounding tiny files to 0.000 MB. */
  const pesoMb = fileEntry.size > 0
    ? Math.max(fileEntry.size / (1024 * 1024), 0.000001)
    : 0;

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
    scope,
    showroomSlug,
    nodeSlug: nodeSlug || null,
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

  /* V5.9.86: acepta rutas legacy (UUID) y rutas nuevas (showroom_slug) */
  const showroomSlug = sanitizeSlug(String(body.showroom_slug || "") || project.slug || "");
  const allowedPrefixes = [`projects/${projectId}/`];
  if (showroomSlug) allowedPrefixes.push(`projects/${showroomSlug}/`);
  if (!allowedPrefixes.some((prefix) => String(storagePath).startsWith(prefix))) {
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

/**
 * Shared prelude for the folder-op actions: auth + project access +
 * showroom_slug resolution. Returns either an error Response or the
 * resolved context to proceed with.
 */
async function resolveFolderOpContext(
  req: Request,
  // deno-lint-ignore no-explicit-any
  body: any,
) {
  const { accessKey, zone, hostname } = getBunnyConfig();
  if (!accessKey) {
    return {
      errorResponse: json(503, {
        ok: false,
        error: "BUNNY_STORAGE_ACCESS_KEY no configurada",
        code: "MISSING_SECRET",
      }),
    };
  }

  const { supabase, user, error: authErr } = await createUserClient(req);
  if (!supabase || !user) {
    return { errorResponse: json(401, { ok: false, error: authErr || "No autenticado" }) };
  }

  const projectId = String(body.project_id || "").trim();
  if (!projectId) {
    return { errorResponse: json(400, { ok: false, error: "project_id requerido" }) };
  }

  const { project, error: projErr } = await assertProjectAccess(supabase, projectId);
  if (!project) {
    return { errorResponse: json(403, { ok: false, error: projErr || "Sin acceso" }) };
  }

  const showroomSlug = sanitizeSlug(String(body.showroom_slug || "") || project.slug || "");
  if (!showroomSlug) {
    return {
      errorResponse: json(400, {
        ok: false,
        error: "showroom_slug requerido (o el proyecto debe tener slug asignado)",
        code: "SHOWROOM_SLUG_REQUIRED",
      }),
    };
  }

  return {
    errorResponse: null,
    accessKey,
    zone,
    hostname,
    supabase,
    project,
    projectId,
    showroomSlug,
  };
}

async function handleEnsureFolders(req: Request) {
  // deno-lint-ignore no-explicit-any
  const body: any = await req.json().catch(() => ({}));
  const ctx = await resolveFolderOpContext(req, body);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { accessKey, zone, hostname, showroomSlug } = ctx;

  const requested: string[] = Array.isArray(body.folders)
    ? body.folders.map((f: unknown) => String(f || ""))
    : [];
  const alwaysOn = HERO_FOLDERS.map((f) => `hero/${f}`);
  const allFolders = Array.from(new Set([...requested, ...alwaysOn]));

  const results: { folder: string; ok: boolean; status?: number; error?: string }[] = [];
  for (const raw of allFolders) {
    const rel = ensureSafeRelativePath(raw);
    if (rel === null || rel === "") {
      results.push({ folder: raw, ok: false, error: "path inválido" });
      continue;
    }
    const markerPath = `projects/${showroomSlug}/${rel}/.boxieskeep`;
    try {
      const put = await bunnyPut(
        hostname!,
        zone!,
        accessKey!,
        markerPath,
        new Uint8Array(0),
        "application/octet-stream",
      );
      results.push({ folder: rel, ok: true, status: put.status });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({ folder: rel, ok: false, error: message });
    }
  }

  const ok = results.every((r) => r.ok);
  return json(ok ? 200 : 207, { ok, showroomSlug, results });
}

async function handleListFolder(req: Request) {
  // deno-lint-ignore no-explicit-any
  const body: any = await req.json().catch(() => ({}));
  const ctx = await resolveFolderOpContext(req, body);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { accessKey, zone, hostname, showroomSlug } = ctx;

  const rel = ensureSafeRelativePath(String(body.path || ""));
  if (rel === null) {
    return json(400, { ok: false, error: "path inválido", code: "INVALID_PATH" });
  }
  const dirPath = rel ? `projects/${showroomSlug}/${rel}` : `projects/${showroomSlug}`;

  try {
    const items = await bunnyListDir(hostname!, zone!, accessKey!, dirPath);
    const realFiles = items.filter((i) => !i.isDirectory && i.name !== ".boxieskeep");
    return json(200, {
      ok: true,
      path: rel,
      items,
      hasFiles: realFiles.length > 0,
      fileCount: realFiles.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(502, { ok: false, error: message, code: "BUNNY_LIST_FAILED" });
  }
}

async function handleDeleteFolder(req: Request) {
  // deno-lint-ignore no-explicit-any
  const body: any = await req.json().catch(() => ({}));
  const ctx = await resolveFolderOpContext(req, body);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { accessKey, zone, hostname, showroomSlug } = ctx;

  const rel = ensureSafeRelativePath(String(body.path || ""));
  if (rel === null || rel === "") {
    return json(400, {
      ok: false,
      error: "path inválido (no se permite borrar la raíz del showroom)",
      code: "INVALID_PATH",
    });
  }
  const recursive = body.recursive === true;
  const dirPath = `projects/${showroomSlug}/${rel}`;

  let realFileCount = 0;
  try {
    const files = await bunnyWalkFiles(hostname!, zone!, accessKey!, dirPath);
    realFileCount = files.filter((f) => !isMarkerFile(f.relPath)).length;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(502, { ok: false, error: message, code: "BUNNY_LIST_FAILED" });
  }

  if (!recursive && realFileCount > 0) {
    return json(409, {
      ok: false,
      error: "La carpeta contiene archivos — usa recursive=true para forzar el borrado",
      code: "FOLDER_NOT_EMPTY",
      fileCount: realFileCount,
    });
  }

  try {
    await bunnyDeleteDirRecursive(hostname!, zone!, accessKey!, dirPath);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(502, { ok: false, error: message, code: "BUNNY_DELETE_FAILED" });
  }

  return json(200, { ok: true, deleted: true, path: rel, fileCount: realFileCount });
}

async function handleRenameFolder(req: Request) {
  // deno-lint-ignore no-explicit-any
  const body: any = await req.json().catch(() => ({}));
  const ctx = await resolveFolderOpContext(req, body);
  if (ctx.errorResponse) return ctx.errorResponse;
  const { accessKey, zone, hostname, showroomSlug, projectId } = ctx;

  const fromRel = ensureSafeRelativePath(String(body.from || ""));
  const toRel = ensureSafeRelativePath(String(body.to || ""));
  if (fromRel === null || fromRel === "" || toRel === null || toRel === "") {
    return json(400, { ok: false, error: "from/to inválidos", code: "INVALID_PATH" });
  }
  if (fromRel === toRel) {
    return json(200, { ok: true, from: fromRel, to: toRel, filesMoved: 0, archivosUpdated: 0 });
  }

  const fromDir = `projects/${showroomSlug}/${fromRel}`;
  const toDir = `projects/${showroomSlug}/${toRel}`;

  let files: { relPath: string; size: number }[] = [];
  try {
    files = await bunnyWalkFiles(hostname!, zone!, accessKey!, fromDir);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(502, { ok: false, error: message, code: "BUNNY_LIST_FAILED" });
  }

  let filesMoved = 0;
  try {
    for (const f of files) {
      const srcPath = `${fromDir}/${f.relPath}`;
      const dstPath = `${toDir}/${f.relPath}`;
      const obj = await bunnyGetObject(hostname!, zone!, accessKey!, srcPath);
      await bunnyPut(hostname!, zone!, accessKey!, dstPath, obj.bytes, obj.contentType);
      filesMoved++;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(502, {
      ok: false,
      error: message,
      code: "RENAME_COPY_FAILED",
      filesMoved,
      totalFiles: files.length,
    });
  }

  try {
    await bunnyDeleteDirRecursive(hostname!, zone!, accessKey!, fromDir);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[bunny-media] rename cleanup failed", message);
  }

  let archivosUpdated = 0;
  const db = createServiceClient();
  if (db) {
    const oldPrefix = `projects/${showroomSlug}/${fromRel}/`;
    const newPrefix = `projects/${showroomSlug}/${toRel}/`;
    const q = await db
      .from("archivos")
      .select("id, storage_path, url")
      .eq("proyecto_id", projectId)
      .like("storage_path", `${oldPrefix}%`);
    if (!q.error && q.data) {
      for (const row of q.data) {
        const oldPath = String(row.storage_path || "");
        if (!oldPath.startsWith(oldPrefix)) continue;
        const newStoragePath = newPrefix + oldPath.slice(oldPrefix.length);
        const newUrl = row.url ? String(row.url).replace(oldPrefix, newPrefix) : row.url;
        const upd = await db
          .from("archivos")
          .update({ storage_path: newStoragePath, url: newUrl })
          .eq("id", row.id);
        if (!upd.error) archivosUpdated++;
      }
    }
  }

  return json(200, {
    ok: true,
    from: fromRel,
    to: toRel,
    filesMoved,
    archivosUpdated,
  });
}

/**
 * V5.9.87 / V5.9.88 — sync_all_showrooms
 * Full DB→Bunny mirror: reads every non-template showroom from `proyectos`
 * (no hardcoded names), ensures its Bunny folder skeleton (hero + media +
 * tipologías + opted-in amenities), migrates legacy projects/{uuid}/...
 * trees, and one-shot purges auto-created amenity Media folders (V5.9.88).
 */
async function handleSyncAllShowrooms(req: Request) {
  const { supabase, user, error: authErr } = await createUserClient(req);
  if (!supabase || !user) return json(401, { ok: false, error: authErr || "No autenticado" });

  const db = createServiceClient();
  if (!db) {
    return json(500, {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY no configurada",
      code: "NO_SERVICE_ROLE",
    });
  }

  const { accessKey, zone, cdnBase, hostname } = getBunnyConfig();
  if (!accessKey) {
    return json(503, {
      ok: false,
      error: "BUNNY_STORAGE_ACCESS_KEY no configurada",
      code: "MISSING_SECRET",
    });
  }

  const { data: rows, error: qErr } = await db
    .from("proyectos")
    .select("id, slug, nombre")
    .eq("is_system_template", false);
  if (qErr) return json(500, { ok: false, error: qErr.message, code: "DB_QUERY_FAILED" });

  // deno-lint-ignore no-explicit-any
  const showrooms = (rows || [])
    .map((r: any) => ({
      id: String(r.id),
      slug: sanitizeSlug(String(r.slug || "")),
      nombre: String(r.nombre || ""),
    }))
    .filter((r) => !!r.slug);

  let rootItems: BunnyDirItem[] = [];
  try {
    rootItems = await bunnyListDir(hostname, zone, accessKey, "projects");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(502, { ok: false, error: message, code: "BUNNY_LIST_FAILED" });
  }
  const legacyRootNames = new Set(rootItems.map((i) => i.name));

  const migrated: { id: string; slug: string; filesMoved: number }[] = [];
  const amenitiesPurged: { id: string; slug: string; folders: string[] }[] = [];
  const ensured: { id: string; slug: string }[] = [];
  const errors: { id: string; slug?: string; error: string }[] = [];

  for (const sh of showrooms) {
    const slug = sh.slug;
    try {
      /* b. ensure base skeleton folders (hero + media root) */
      const baseFolders = [...HERO_FOLDERS.map((f) => `hero/${f}`), "media"];
      for (const folder of baseFolders) {
        await bunnyPut(
          hostname,
          zone,
          accessKey,
          `projects/${slug}/${folder}/.boxieskeep`,
          new Uint8Array(0),
          "application/octet-stream",
        );
      }

      /* c. migration: legacy projects/{uuid}/... → projects/{slug}/... */
      let filesMoved = 0;
      if (legacyRootNames.has(sh.id)) {
        const legacyDir = `projects/${sh.id}`;
        const legacyFiles = await bunnyWalkFiles(hostname, zone, accessKey, legacyDir);

        let destFiles: { relPath: string; size: number }[] = [];
        try {
          destFiles = await bunnyWalkFiles(hostname, zone, accessKey, `projects/${slug}`);
        } catch {
          destFiles = [];
        }
        const destSizeByPath = new Map(destFiles.map((f) => [f.relPath, f.size]));

        for (const f of legacyFiles) {
          if (isMarkerFile(f.relPath)) continue;
          const destRel = remapLegacyRelPath(f.relPath);
          const destPath = `projects/${slug}/${destRel}`;
          const oldPath = `${legacyDir}/${f.relPath}`;

          const existingSize = destSizeByPath.get(destRel);
          if (existingSize === undefined || existingSize !== f.size) {
            const obj = await bunnyGetObject(hostname, zone, accessKey, oldPath);
            await bunnyPut(hostname, zone, accessKey, destPath, obj.bytes, obj.contentType);
          }

          const newUrl = `${cdnBase}/${destPath}`;
          await db
            .from("archivos")
            .update({ storage_path: destPath, url: newUrl })
            .eq("storage_provider", "bunny")
            .eq("storage_path", oldPath);

          filesMoved++;
        }

        await bunnyDeleteDirRecursive(hostname, zone, accessKey, legacyDir);
        migrated.push({ id: sh.id, slug, filesMoved });
      }

      /* d. load tipologías + estructura draft/config */
      const usedNodeSlugs = new Set<string>();
      const tipologiaSlugs = new Set<string>();
      const amenitySlugs = new Set<string>();
      const nodes: { slug: string; folders: string[] }[] = [];

      const addNode = (rawSlug: string, folders: string[], bucket: Set<string> | null) => {
        const base = sanitizeSlug(rawSlug);
        if (!base) return;
        let final = base;
        let n = 2;
        while (usedNodeSlugs.has(final)) {
          final = `${base}-${n}`;
          n++;
        }
        usedNodeSlugs.add(final);
        if (bucket) bucket.add(final);
        nodes.push({ slug: final, folders });
      };

      const { data: tipos } = await db
        .from("tipologias")
        .select("id, nombre, modelo")
        .eq("proyecto_id", sh.id)
        .or("archived.is.null,archived.eq.false");
      // deno-lint-ignore no-explicit-any
      for (const t of (tipos || []) as any[]) {
        addNode(t.nombre || t.modelo || t.id, NODE_FOLDERS_FULL, tipologiaSlugs);
      }

      const { data: estructura } = await db
        .from("proyecto_estructura")
        .select("draft_json, config_json")
        .eq("proyecto_id", sh.id)
        .maybeSingle();
      // deno-lint-ignore no-explicit-any
      const draft: any = (estructura?.draft_json && typeof estructura.draft_json === "object")
        ? estructura.draft_json
        : {};
      // deno-lint-ignore no-explicit-any
      const config: any = (estructura?.config_json && typeof estructura.config_json === "object")
        ? estructura.config_json
        : {};

      if (Array.isArray(draft.tipologias)) {
        for (const t of draft.tipologias) {
          addNode(pickBunnySlug(t) || sanitizeSlug(t?.nombre || ""), NODE_FOLDERS_FULL, tipologiaSlugs);
        }
      }

      /* Collect Structure amenity names (SSOT) for purge + optional opt-in */
      const structureAmenityNames: string[] = [];
      const pushAmenityName = (raw: unknown) => {
        const n = typeof raw === "string"
          ? raw.trim()
          : String((raw as { nombre?: string })?.nombre || "").trim();
        if (!n) return;
        if (structureAmenityNames.some((x) => x.toLowerCase() === n.toLowerCase())) return;
        structureAmenityNames.push(n);
      };
      if (Array.isArray(draft.zoneNames)) draft.zoneNames.forEach(pushAmenityName);
      if (Array.isArray(draft.zoneNodes)) draft.zoneNodes.forEach(pushAmenityName);

      const { data: paRows } = await db
        .from("proyecto_amenidades")
        .select("amenidades(nombre)")
        .eq("proyecto_id", sh.id);
      // deno-lint-ignore no-explicit-any
      for (const row of (paRows || []) as any[]) {
        pushAmenityName(row?.amenidades?.nombre);
      }

      for (const name of structureAmenityNames) {
        const s = pickBunnySlug(name);
        if (s) amenitySlugs.add(s);
      }
      if (Array.isArray(draft.zoneNodes)) {
        for (const z of draft.zoneNodes) {
          const s = pickBunnySlug(z);
          if (s) amenitySlugs.add(s);
        }
      }

      const alreadyMigrated = !!(draft.mediaAmenitiesMigratedV5988 || config.mediaAmenitiesMigratedV5988);
      let mediaAmenityNames: string[] = Array.isArray(draft.mediaAmenityNames)
        ? draft.mediaAmenityNames.filter((x: unknown) => typeof x === "string" && String(x).trim())
        : (Array.isArray(config.mediaAmenityNames)
          ? config.mediaAmenityNames.filter((x: unknown) => typeof x === "string" && String(x).trim())
          : []);

      /* e. V5.9.88 one-shot: purge auto amenity Media folders; keep Hero + tipologías */
      if (!alreadyMigrated) {
        const purgedFolders: string[] = [];
        let mediaChildren: BunnyDirItem[] = [];
        try {
          mediaChildren = await bunnyListDir(hostname, zone, accessKey, `projects/${slug}/media`);
        } catch {
          mediaChildren = [];
        }
        for (const child of mediaChildren) {
          if (!child.isDirectory) continue;
          const folderSlug = sanitizeSlug(child.name);
          if (!folderSlug) continue;
          if (tipologiaSlugs.has(folderSlug)) continue;
          /* One-shot: Media must end as Hero + tipologías only */
          const dirPath = `projects/${slug}/media/${folderSlug}`;
          try {
            const files = await bunnyWalkFiles(hostname, zone, accessKey, dirPath);
            for (const f of files) {
              const full = `${dirPath}/${f.relPath}`;
              await db
                .from("archivos")
                .delete()
                .eq("storage_provider", "bunny")
                .eq("storage_path", full);
            }
            await bunnyDeleteDirRecursive(hostname, zone, accessKey, dirPath);
            purgedFolders.push(folderSlug);
          } catch (purgeErr) {
            console.warn("[bunny-media] amenity purge failed", slug, folderSlug, purgeErr);
          }
        }
        mediaAmenityNames = [];
        const nextDraft = Object.assign({}, draft, {
          mediaAmenityNames: [],
          mediaAmenitiesMigratedV5988: true,
        });
        const nextConfig = Object.assign({}, config, {
          mediaAmenityNames: [],
          mediaAmenitiesMigratedV5988: true,
        });
        if (estructura) {
          await db.from("proyecto_estructura").update({
            draft_json: nextDraft,
            config_json: nextConfig,
            updated_at: new Date().toISOString(),
          }).eq("proyecto_id", sh.id);
        } else {
          await db.from("proyecto_estructura").insert({
            proyecto_id: sh.id,
            draft_json: nextDraft,
            config_json: nextConfig,
            updated_at: new Date().toISOString(),
          });
        }
        draft.mediaAmenityNames = [];
        draft.mediaAmenitiesMigratedV5988 = true;
        config.mediaAmenityNames = [];
        config.mediaAmenitiesMigratedV5988 = true;
        amenitiesPurged.push({ id: sh.id, slug, folders: purgedFolders });
      }

      /* f. ensure tipología folders + opted-in amenity folders only */
      for (const name of mediaAmenityNames) {
        const key = String(name).trim().toLowerCase();
        if (!structureAmenityNames.some((n) => n.toLowerCase() === key)) continue;
        const zn = Array.isArray(draft.zoneNodes)
          ? draft.zoneNodes.find((z: { nombre?: string }) =>
            String(z?.nombre || "").toLowerCase() === key
          )
          : null;
        addNode(pickBunnySlug(zn) || pickBunnySlug(name), NODE_FOLDERS_ZONE, null);
      }
      if (Array.isArray(draft.customNodes)) {
        for (const c of draft.customNodes) {
          addNode(pickBunnySlug(c), NODE_FOLDERS_ZONE, null);
        }
      }

      for (const node of nodes) {
        for (const cat of node.folders) {
          await bunnyPut(
            hostname,
            zone,
            accessKey,
            `projects/${slug}/media/${node.slug}/${cat}/.boxieskeep`,
            new Uint8Array(0),
            "application/octet-stream",
          );
        }
      }

      ensured.push({ id: sh.id, slug });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push({ id: sh.id, slug, error: message });
    }
  }

  return json(200, {
    ok: true,
    showrooms: showrooms.length,
    migrated,
    amenitiesPurged,
    ensured,
    errors,
  });
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
      if (peek && peek.action === "ensure_folders") {
        return await handleEnsureFolders(req);
      }
      if (peek && peek.action === "list_folder") {
        return await handleListFolder(req);
      }
      if (peek && peek.action === "delete_folder") {
        return await handleDeleteFolder(req);
      }
      if (peek && peek.action === "rename_folder") {
        return await handleRenameFolder(req);
      }
      if (peek && peek.action === "sync_all_showrooms") {
        return await handleSyncAllShowrooms(req);
      }
      return json(400, {
        ok: false,
        error:
          'Usa multipart upload o JSON { action: "delete"|"probe"|"ensure_folders"|"list_folder"|"delete_folder"|"rename_folder"|"sync_all_showrooms", ... }',
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
