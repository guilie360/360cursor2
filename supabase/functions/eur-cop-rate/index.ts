/**
 * Tasa EUR→COP desde Google Finance (público).
 * GET /functions/v1/eur-cop-rate
 *
 * Markup real del precio:
 *   <div class="N6SYTe"><span jsname="Pdsbrc">...<span>3,762.4000</span></span></div>
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
      "Cache-Control": "no-store",
    },
  });
}

function toRate(raw: string): number | null {
  const n = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 2500 || n > 8000) return null;
  return n;
}

function parseGoogleRate(html: string): { rate: number; method: string } | null {
  const patterns: Array<{ method: string; re: RegExp }> = [
    // Precio principal anidado bajo N6SYTe → span → 3,762.4000
    {
      method: "n6syte-nested",
      re: /class="N6SYTe"[\s\S]{0,240}?<span>([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]+)<\/span>/i,
    },
    {
      method: "pdsbrc-nested",
      re: /jsname="Pdsbrc"[\s\S]{0,160}?<span>([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]+)<\/span>/i,
    },
    // Formato típico del ticker principal (4 decimales + miles con coma)
    {
      method: "comma-4dp",
      re: /\b([3-4],[0-9]{3}\.[0-9]{4})\b/,
    },
  ];

  for (const { method, re } of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    const rate = toRate(m[1]);
    if (rate != null) return { rate, method };
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
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return json(502, { ok: false, error: "google_http_" + res.status });
    }
    const html = await res.text();
    const parsed = parseGoogleRate(html);
    if (!parsed) {
      return json(502, {
        ok: false,
        error: "google_parse_failed",
        html_len: html.length,
        has_n6: html.includes("N6SYTe"),
      });
    }
    return json(200, {
      ok: true,
      base: "EUR",
      quote: "COP",
      rate: parsed.rate,
      source: "google-finance",
      parse_method: parsed.method,
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
