/**
 * Cotizaciones CRM — guarda al descargar PDF; el equipo lista / borra / cobra en Pagos.
 */
(function () {
  var TABLE = 'panel_cotizaciones';
  var anonClient = null;

  function supabaseUrl() {
    return (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) ||
      'https://emefdwzdfnqgjohbtvvn.supabase.co';
  }

  function supabaseAnonKey() {
    return (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) ||
      'sb_publishable_GmJNU3DZQqPgNBi6QVa5bA_2h--bgKz';
  }

  function getAnonClient() {
    if (anonClient) return anonClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      anonClient = window.supabase.createClient(supabaseUrl(), supabaseAnonKey());
      return anonClient;
    }
    return null;
  }

  /** Cliente con sesión de equipo (listar/borrar). */
  function getClient() {
    try {
      if (window.PlatformAuth && typeof window.PlatformAuth.getClient === 'function') {
        var c = window.PlatformAuth.getClient();
        if (c) return c;
      }
    } catch (e) {}
    return getAnonClient();
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase().slice(0, 320);
  }

  function normalizeName(name) {
    return String(name || '').trim().slice(0, 200);
  }

  async function saveQuote(opts) {
    opts = opts || {};
    // Insert siempre con anon: funciona en cotizador público/interno aunque no haya JWT de equipo.
    var client = getAnonClient() || getClient();
    if (!client) throw new Error('Supabase no disponible para guardar la cotización.');
    var name = normalizeName(opts.customerName || opts.customer_name);
    var email = normalizeEmail(opts.customerEmail || opts.customer_email);
    var totalEuros = Number(opts.totalEuros != null ? opts.totalEuros : opts.total_euros);
    var totalCents = opts.totalCents != null
      ? Math.round(Number(opts.totalCents))
      : Math.round(totalEuros * 100);
    if (name.length < 2) throw new Error('Nombre obligatorio.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email inválido.');
    if (!Number.isFinite(totalCents) || totalCents < 100) throw new Error('Total inválido.');

    var snapshot = opts.quoteSnapshot || opts.quote_snapshot || {};
    try {
      // Evitar fallos por estructuras no serializables del draft
      snapshot = JSON.parse(JSON.stringify(snapshot));
    } catch (eSnap) {
      snapshot = { total: totalCents / 100 };
    }

    var row = {
      customer_name: name,
      customer_email: email,
      proyecto_label: String(opts.proyectoLabel || opts.proyecto_label || 'Showroom 360Preventa').slice(0, 200),
      total_cents: totalCents,
      currency: 'eur',
      quote_snapshot: snapshot,
      source: String(opts.source || 'cotizador').slice(0, 40),
      is_test: !!opts.isTest || !!opts.is_test
    };

    // Sin .select(): anon puede INSERT pero no SELECT (RLS), y RETURNING fallaría.
    var result = await client.from(TABLE).insert(row);
    if (result.error) {
      var msg = result.error.message || result.error.details || 'Error al guardar cotización';
      throw new Error(msg);
    }
    return { ok: true, total_cents: totalCents };
  }

  async function listQuotes(opts) {
    opts = opts || {};
    var client = getClient();
    if (!client) throw new Error('Sin sesión de equipo para listar cotizaciones.');
    var q = String(opts.query || '').trim();
    var onlyTests = opts.onlyTests === true;
    var hideTests = opts.hideTests === true;

    var req = client.from(TABLE).select('*').order('created_at', { ascending: false }).limit(200);
    if (onlyTests) req = req.eq('is_test', true);
    if (hideTests) req = req.eq('is_test', false);
    var result = await req;
    if (result.error) throw result.error;
    var rows = result.data || [];
    if (!q) return rows;
    var needle = q.toLowerCase();
    return rows.filter(function (r) {
      var name = String(r.customer_name || '').toLowerCase();
      var email = String(r.customer_email || '').toLowerCase();
      return name.indexOf(needle) >= 0 || email.indexOf(needle) >= 0;
    }).slice(0, 150);
  }

  async function deleteQuote(id) {
    var client = getClient();
    if (!client) throw new Error('Sin sesión de equipo.');
    var result = await client.from(TABLE).delete().eq('id', id);
    if (result.error) throw result.error;
    return true;
  }

  async function deleteTestQuotes() {
    var client = getClient();
    if (!client) throw new Error('Sin sesión de equipo.');
    var result = await client.from(TABLE).delete().eq('is_test', true);
    if (result.error) throw result.error;
    return true;
  }

  async function markPedido(id, pedidoId, checkoutUrl) {
    var client = getClient();
    if (!client || !id) return null;
    var patch = { updated_at: new Date().toISOString() };
    if (pedidoId) patch.pedido_id = pedidoId;
    if (checkoutUrl) patch.last_checkout_url = checkoutUrl;
    var result = await client.from(TABLE).update(patch).eq('id', id).select('*').maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  }

  window.PreventaQuotes = {
    saveQuote: saveQuote,
    listQuotes: listQuotes,
    deleteQuote: deleteQuote,
    deleteTestQuotes: deleteTestQuotes,
    markPedido: markPedido,
    getClient: getClient
  };
})();
