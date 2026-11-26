/**
 * Mi perfil — Mis documentos: cotización, contrato, invoice.
 */
(function () {
  var euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  var state = {
    quotes: [],
    pedido: null,
    cobros: []
  };

  function $(id) { return document.getElementById(id); }

  function escapeHtml(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function money(cents) {
    return euro.format((Number(cents) || 0) / 100);
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch (e) {
      return '—';
    }
  }

  function client() {
    try {
      if (window.PlatformAuth && typeof PlatformAuth.createClient === 'function') {
        return PlatformAuth.createClient({ remember: true });
      }
    } catch (e) {}
    if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
      return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    throw new Error('No se pudo conectar.');
  }

  function functionsBase() {
    var url = (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) || '';
    return url ? url.replace(/\/$/, '') + '/functions/v1' : '';
  }

  function anonKey() {
    return (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) || '';
  }

  async function downloadQuote(quote) {
    if (!window.QuotePdf || typeof QuotePdf.downloadFromQuote !== 'function') {
      throw new Error('Generador de PDF no cargado.');
    }
    return QuotePdf.downloadFromQuote(quote);
  }

  function renderDocs() {
    var list = $('docsList');
    if (!list) return;
    var cards = [];

    // Cotizaciones
    if (state.quotes.length) {
      state.quotes.forEach(function (q, idx) {
        var snap = q.quote_snapshot || {};
        var exact = !!(snap.pdf && Array.isArray(snap.pdf.rows) && snap.pdf.rows.length);
        cards.push(
          '<article class="doc-card" data-doc="quote" data-quote-idx="' + idx + '">' +
            '<div class="doc-card-top"><span class="doc-kind">Cotización</span><span class="doc-date">' + escapeHtml(fmtDate(q.created_at)) + '</span></div>' +
            '<h3>' + escapeHtml(q.proyecto_label || 'Showroom') + '</h3>' +
            '<p class="desc">' + escapeHtml(money(q.total_cents)) +
              (exact ? ' · mismo PDF de Cotizar' : ' · se regenera con el motor de Cotizar') +
            '</p>' +
            '<button type="button" class="btn" data-dl-quote="' + idx + '">Descargar PDF</button>' +
          '</article>'
        );
      });
    } else {
      cards.push(
        '<article class="doc-card is-empty">' +
          '<div class="doc-card-top"><span class="doc-kind">Cotización</span></div>' +
          '<h3>Aún no hay cotización</h3>' +
          '<p class="desc">Se guarda al descargar el PDF en Cotizar (panel o /cotizar).</p>' +
        '</article>'
      );
    }

    // Contrato
    var contrato = state.pedido && state.pedido.contrato_url;
    if (contrato) {
      cards.push(
        '<article class="doc-card" data-doc="contrato">' +
          '<div class="doc-card-top"><span class="doc-kind">Contrato</span><span class="doc-status is-ready">Listo para firmar</span></div>' +
          '<h3>' + escapeHtml((state.pedido && state.pedido.proyecto_label) || 'Contrato de servicios') + '</h3>' +
          '<p class="desc">Ábrelo para revisar y firmar.</p>' +
          '<a class="btn primary" href="' + escapeHtml(contrato) + '" target="_blank" rel="noopener">Abrir contrato</a>' +
        '</article>'
      );
    } else {
      cards.push(
        '<article class="doc-card is-pending" data-doc="contrato">' +
          '<div class="doc-card-top"><span class="doc-kind">Contrato</span><span class="doc-status">Pendiente</span></div>' +
          '<h3>Contrato para firmar</h3>' +
          '<p class="desc">Cuando el equipo lo publique, aparecerá aquí el enlace.</p>' +
        '</article>'
      );
    }

    // Invoices / cobros
    var paid = (state.cobros || []).filter(function (c) {
      return String(c.status || '').toLowerCase() === 'cobrado' && c.paddle_transaction_id;
    });
    if (paid.length) {
      paid.forEach(function (c) {
        cards.push(
          '<article class="doc-card" data-doc="invoice" data-cobro-id="' + escapeHtml(c.id) + '">' +
            '<div class="doc-card-top"><span class="doc-kind">Invoice</span><span class="doc-date">' + escapeHtml(fmtDate(c.paid_at || c.created_at)) + '</span></div>' +
            '<h3>' + escapeHtml(c.concepto || 'Anticipo') + '</h3>' +
            '<p class="desc">' + escapeHtml(money(c.amount_cents)) + ' · factura Paddle</p>' +
            '<button type="button" class="btn" data-dl-invoice="' + escapeHtml(c.id) + '">Descargar invoice</button>' +
          '</article>'
        );
      });
    } else {
      cards.push(
        '<article class="doc-card is-pending" data-doc="invoice">' +
          '<div class="doc-card-top"><span class="doc-kind">Invoice</span><span class="doc-status">Pendiente</span></div>' +
          '<h3>Invoice del anticipo</h3>' +
          '<p class="desc">Disponible cuando el anticipo esté cobrado.</p>' +
        '</article>'
      );
    }

    list.innerHTML = cards.join('');
  }

  async function loadDocs() {
    var list = $('docsList');
    if (list) list.innerHTML = '<p class="desc">Cargando documentos…</p>';
    try {
      var sb = client();
      var session = await sb.auth.getSession();
      var user = session && session.data && session.data.session && session.data.session.user;
      if (!user) throw new Error('Sesión expirada.');

      var email = String(user.email || '').toLowerCase();
      var quotesRes = await sb
        .from('panel_cotizaciones')
        .select('id,customer_name,customer_email,proyecto_label,total_cents,quote_snapshot,created_at,pedido_id')
        .eq('customer_email', email)
        .order('created_at', { ascending: false })
        .limit(20);

      var pedRes = await sb
        .from('panel_pedidos')
        .select('id,customer_name,customer_email,proyecto_label,status,contrato_url,quote_total_cents,quote_snapshot,deposit_cents,created_at')
        .eq('customer_email', email)
        .order('created_at', { ascending: false })
        .limit(1);

      var pedido = (pedRes.data && pedRes.data[0]) || null;
      var cobros = [];
      if (pedido && pedido.id) {
        var cobRes = await sb
          .from('panel_cobros')
          .select('id,concepto,amount_cents,status,payment_stage,paddle_transaction_id,paid_at,created_at')
          .eq('pedido_id', pedido.id)
          .order('created_at', { ascending: false })
          .limit(10);
        cobros = cobRes.data || [];
      }

      // Fallback: if no quote rows but pedido has total, synthesize one card
      state.quotes = quotesRes.data || [];
      if (!state.quotes.length && pedido && pedido.quote_total_cents) {
        state.quotes = [{
          id: 'pedido:' + pedido.id,
          customer_name: pedido.customer_name,
          customer_email: pedido.customer_email || email,
          proyecto_label: pedido.proyecto_label,
          total_cents: pedido.quote_total_cents,
          quote_snapshot: pedido.quote_snapshot,
          created_at: pedido.created_at
        }];
      }

      state.pedido = pedido;
      state.cobros = cobros;
      renderDocs();
    } catch (err) {
      if (list) {
        list.innerHTML = '<p class="desc miperfil-error">' + escapeHtml(err.message || 'No se pudieron cargar') + '</p>';
      }
    }
  }

  async function downloadInvoice(cobroId) {
    var sb = client();
    var session = await sb.auth.getSession();
    var token = session && session.data && session.data.session && session.data.session.access_token;
    if (!token) throw new Error('Sesión expirada.');
    var res = await fetch(functionsBase() + '/client-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey(),
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ cobro_id: cobroId || undefined })
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error(data.error || 'No se pudo obtener el invoice');
    if (!data.url) throw new Error('Sin URL de invoice');
    window.open(data.url, '_blank', 'noopener');
  }

  function bind() {
    var list = $('docsList');
    if (!list || list.dataset.bound) return;
    list.dataset.bound = '1';
    list.addEventListener('click', async function (e) {
      var qBtn = e.target.closest('[data-dl-quote]');
      if (qBtn) {
        e.preventDefault();
        var idx = Number(qBtn.getAttribute('data-dl-quote'));
        var quote = state.quotes[idx];
        if (!quote) return;
        qBtn.disabled = true;
        var prevQ = qBtn.textContent;
        qBtn.textContent = 'Generando PDF…';
        try {
          await downloadQuote(quote);
        } catch (err) {
          alert((err && err.message) || 'No se pudo generar el PDF');
        } finally {
          qBtn.disabled = false;
          qBtn.textContent = prevQ || 'Descargar PDF';
        }
        return;
      }
      var iBtn = e.target.closest('[data-dl-invoice]');
      if (iBtn) {
        e.preventDefault();
        iBtn.disabled = true;
        var prev = iBtn.textContent;
        iBtn.textContent = 'Preparando…';
        try {
          await downloadInvoice(iBtn.getAttribute('data-dl-invoice'));
        } catch (err) {
          alert(err.message || 'No se pudo descargar el invoice');
        } finally {
          iBtn.disabled = false;
          iBtn.textContent = prev || 'Descargar invoice';
        }
      }
    });
  }

  window.BoxiesMiPerfilDocs = {
    load: loadDocs,
    bind: bind
  };
})();
