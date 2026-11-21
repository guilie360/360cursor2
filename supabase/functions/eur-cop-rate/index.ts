/**
 * Tasa EUR→COP desde Google Finance (público).
 * GET /functions/v1/eur-cop-rate
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const GOOGLE_URL = "https://www.google.com/finance/quote/EUR-COP";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
  });
}

function parseGoogleRate(html: string): number | null {
  // Precio principal en Google Finance: class="N6SYTe" → 3,762.4000
  const patterns = [
    /class="N6SYTe"[^>]*>\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*</i,
    /data-last-price="([0-9]+(?:\.[0-9]+)?)"/i,
    /\[\[([0-9]{4}\.[0-9]+)\],\[/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m || !m[1]) continue;
    const n = Number(String(m[1]).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 2000 && n < 10000) return n;
  }
  // Fallback: valor 3xxx más frecuente (rango típico EUR-COP)
  const all = html.match(/\b(3[5-9][0-9]{2}\.[0-9]{1,4})\b/g) || [];
  const counts = new Map<string, number>();
  for (const v of all) counts.set(v, (counts.get(v) || 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [v, c] of counts) {
    if (c > bestN) {
      best = v;
      bestN = c;
    }
  }
  if (best && bestN >= 2) {
    const n = Number(best);
    if (Number.isFinite(n) && n > 2000 && n < 10000) return n;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "GET") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  try {
    const res = await fetch(GOOGLE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return json(502, { ok: false, error: "google_http_" + res.status });
    }
    const html = await res.text();
    const rate = parseGoogleRate(html);
    if (!rate) {
      return json(502, { ok: false, error: "google_parse_failed" });
    }
    return json(200, {
      ok: true,
      base: "EUR",
      quote: "COP",
      rate,
      source: "google-finance",
      google_url: GOOGLE_URL,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    return json(500, {
      ok: false,
      error: err instanceof Error ? err.message : "fetch_failed",
    });
  }
});
