/**
 * Pagos Stripe (EUR) — generar Checkout + listar panel_cobros.
 *
 * Secrets (Supabase Edge Functions, no en el navegador):
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 * Webhook URL:
 *   https://emefdwzdfnqgjohbtvvn.supabase.co/functions/v1/stripe-webhook
 * Eventos: checkout.session.completed, checkout.session.expired
 */
(function () {
  var FN_CREATE = '/functions/v1/stripe-create-checkout';
  var euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

  function moneyFromCents(cents) {
    return euro.format((Number(cents) || 0) / 100);
  }

  function statusLabel(status) {
    var map = {
      pending: 'Pendiente',
      cobrado: 'Cobrado',
      fallido: 'Fallido',
      cancelado: 'Cancelado'
    };
    return map[status] || status || '—';
  }

  function getClient() {
    try {
      if (window.PlatformAuth && typeof window.PlatformAuth.getClient === 'function') {
        return window.PlatformAuth.getClient();
      }
    } catch (e) {}
    return null;
  }

  async function getAccessToken() {
    var client = getClient();
    if (!client) throw new Error('No hay cliente Supabase. Recarga e inicia sesión.');
    var result = await client.auth.getSession();
    if (result.error) throw result.error;
    var token = result.data && result.data.session && result.data.session.access_token;
    if (!token) throw new Error('Sesión caducada. Vuelve a iniciar sesión.');
    return token;
  }

  async function fetchCobros() {
    var client = getClient();
    if (!client) return [];
    var result = await client
      .from('panel_cobros')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function createCheckout(payload) {
    var token = await getAccessToken();
    var base = (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) || '';
    var anon = (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) || '';
    var res = await fetch(base + FN_CREATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        apikey: anon
      },
      body: JSON.stringify(payload)
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      throw new Error(data.error || ('Error ' + res.status + ' al crear el enlace'));
    }
    return data;
  }

  function groupByMonth(rows) {
    var groups = {};
    rows.forEach(function (row) {
      var d = new Date(row.paid_at || row.created_at);
      if (isNaN(d.getTime())) d = new Date();
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return Object.keys(groups).sort().reverse().map(function (key) {
      var parts = key.split('-');
      var label = new Date(Number(parts[0]), Number(parts[1]) - 1, 1)
        .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      return { key: key, label: label.charAt(0).toUpperCase() + label.slice(1), rows: groups[key] };
    });
  }

  function computeKpis(rows) {
    var facturado = 0;
    var cobrado = 0;
    var pendiente = 0;
    rows.forEach(function (r) {
      var n = Number(r.amount_cents) || 0;
      if (r.status === 'cobrado') cobrado += n;
      else if (r.status === 'pending') pendiente += n;
      if (r.status === 'cobrado' || r.status === 'pending') facturado += n;
    });
    return { facturado: facturado, cobrado: cobrado, pendiente: pendiente };
  }

  function render(root, rows, notice) {
    var kpis = computeKpis(rows);
    var months = groupByMonth(rows);
    var monthsHtml = months.length
      ? months.map(function (m) {
          var rowsHtml = m.rows.map(function (r) {
            return (
              '<tr>' +
              '<td>' + escapeHtml(r.proyecto_label || r.concepto || '—') + '</td>' +
              '<td>' + escapeHtml(r.concepto || '—') + '</td>' +
              '<td><span class="status-pill status-pill--' + escapeHtml(r.status) + '">' +
              escapeHtml(statusLabel(r.status)) + '</span></td>' +
              '<td>' + moneyFromCents(r.amount_cents) + '</td>' +
              '<td>' + (r.checkout_url && r.status === 'pending'
                ? '<button type="button" class="btn panel-pay-copy" data-url="' + escapeAttr(r.checkout_url) + '">Copiar enlace</button>'
                : '—') + '</td>' +
              '</tr>'
            );
          }).join('');
          return (
            '<details class="profile-accordion payments-month" open>' +
            '<summary><span>' + escapeHtml(m.label) + '</span><span class="accordion-chevron">＋</span></summary>' +
            '<div class="profile-accordion-content">' +
            '<div class="portal-table-wrap"><table class="portal-table"><thead><tr>' +
            '<th>Proyecto</th><th>Concepto</th><th>Estado</th><th>Importe</th><th>Enlace</th>' +
            '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div></div></details>'
          );
        }).join('')
      : '<p class="desc">Aún no hay cobros. Genera el primer enlace arriba.</p>';

    root.innerHTML =
      '<div class="panel-pay-stripe cardish">' +
      '<div class="eyebrow">STRIPE · ESPAÑA · EUR</div>' +
      '<h3>Cobrar con Stripe</h3>' +
      '<p class="desc">Crea un enlace de pago seguro para tu cliente. Cuando pague, el cobro pasará a Cobrado automáticamente.</p>' +
      '<form id="panelPayForm" class="panel-pay-form">' +
      '<label class="field">Importe (€)<input id="panelPayAmount" type="number" min="0.5" step="0.01" required placeholder="2190.00"></label>' +
      '<label class="field">Concepto<input id="panelPayConcepto" type="text" required maxlength="200" placeholder="Anticipo showroom"></label>' +
      '<label class="field">Proyecto / referencia<input id="panelPayProyecto" type="text" maxlength="200" placeholder="Miralago · opcional"></label>' +
      '<label class="field">Email del cliente<input id="panelPayEmail" type="email" maxlength="200" placeholder="cliente@empresa.com · opcional"></label>' +
      '<div class="panel-pay-actions">' +
      '<button class="btn primary" type="submit" id="panelPaySubmit">Generar enlace de cobro</button>' +
      '</div>' +
      '<p class="panel-pay-status" id="panelPayStatus" aria-live="polite"></p>' +
      '</form></div>' +
      (notice ? '<div class="portal-note">' + escapeHtml(notice) + '</div>' : '') +
      '<div class="portal-dashboard-kpis">' +
      '<div class="portal-kpi"><small>Facturado</small><strong>' + moneyFromCents(kpis.facturado) + '</strong><span class="kpi-trend">Pendiente + cobrado</span></div>' +
      '<div class="portal-kpi"><small>Cobrado</small><strong>' + moneyFromCents(kpis.cobrado) + '</strong><span class="kpi-trend">Confirmado por Stripe</span></div>' +
      '<div class="portal-kpi"><small>Pendiente de cobro</small><strong>' + moneyFromCents(kpis.pendiente) + '</strong><span class="kpi-trend">Enlaces abiertos</span></div>' +
      '</div>' +
      '<h3>Movimientos</h3>' +
      '<div class="payments-period-list">' + monthsHtml + '</div>' +
      '<div class="portal-note">Pasarela: Stripe Checkout (EUR). Configura <code>STRIPE_SECRET_KEY</code> y <code>STRIPE_WEBHOOK_SECRET</code> en Supabase Secrets. Webhook: <code>…/functions/v1/stripe-webhook</code>.</div>';

    wireForm(root);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function wireForm(root) {
    var form = root.querySelector('#panelPayForm');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var status = root.querySelector('#panelPayStatus');
        var btn = root.querySelector('#panelPaySubmit');
        var amount = Number((root.querySelector('#panelPayAmount') || {}).value);
        var concepto = ((root.querySelector('#panelPayConcepto') || {}).value || '').trim();
        var proyecto = ((root.querySelector('#panelPayProyecto') || {}).value || '').trim();
        var email = ((root.querySelector('#panelPayEmail') || {}).value || '').trim();
        if (!Number.isFinite(amount) || amount < 0.5) {
          if (status) status.textContent = 'Importe mínimo 0,50 €.';
          return;
        }
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Generando…';
        }
        if (status) status.textContent = '';
        try {
          var origin = location.origin;
          var data = await createCheckout({
            amount_euros: amount,
            concepto: concepto,
            proyecto_label: proyecto,
            customer_email: email,
            origin: origin,
            success_url: origin + '/panel_gestion/?pago=ok',
            cancel_url: origin + '/panel_gestion/?pago=cancelado'
          });
          var msg = data.url
            ? ('Enlace listo — ábrelo o cópialo desde la tabla (estado Pendiente).')
            : 'Cobro creado.';
          await mount(root, msg);
          var statusEl = document.getElementById('panelPayStatus');
          if (statusEl && data.url) {
            statusEl.innerHTML =
              'Enlace listo. <a href="' + escapeAttr(data.url) + '" target="_blank" rel="noopener">Abrir pago</a> · ' +
              '<button type="button" class="btn panel-pay-copy" data-url="' + escapeAttr(data.url) + '">Copiar</button>';
          }
        } catch (err) {
          if (status) status.textContent = (err && err.message) || 'No se pudo crear el enlace.';
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Generar enlace de cobro';
          }
        }
      });
    }

    root.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.panel-pay-copy');
      if (!btn) return;
      var url = btn.getAttribute('data-url') || '';
      if (!url) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          btn.textContent = 'Copiado';
          setTimeout(function () { btn.textContent = 'Copiar enlace'; }, 1500);
        }).catch(function () {
          window.prompt('Copia el enlace:', url);
        });
      } else {
        window.prompt('Copia el enlace:', url);
      }
    });
  }

  async function mount(host, extraNotice) {
    var root = host && host.querySelector
      ? (host.id === 'panelPaymentsRoot' ? host : host.querySelector('#panelPaymentsRoot') || host)
      : document.getElementById('panelPaymentsRoot');
    if (!root) return;
    root.innerHTML = '<div class="portal-note">Cargando cobros…</div>';
    var params = new URLSearchParams(location.search || '');
    var notice = extraNotice || '';
    if (!notice && params.get('pago') === 'ok') {
      notice = 'Pago completado en Stripe. En unos segundos debería aparecer como Cobrado.';
    }
    if (!notice && params.get('pago') === 'cancelado') {
      notice = 'El cliente canceló el Checkout. El cobro sigue pendiente si el enlace no expiró.';
    }
    try {
      var rows = await fetchCobros();
      render(root, rows, notice);
    } catch (err) {
      render(root, [], (err && err.message) || 'No se pudieron cargar los cobros.');
    }
  }

  function prefillFromQuote() {
    try {
      var priceEl = document.getElementById('stickyPrice');
      var raw = (priceEl && priceEl.textContent) || '';
      var num = Number(String(raw).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
      if (!Number.isFinite(num) || num <= 0) return;
      sessionStorage.setItem('boxiesPayPrefill', JSON.stringify({
        amount: num,
        concepto: 'Cotización showroom 360Preventa',
        t: Date.now()
      }));
    } catch (e) {}
  }

  function applyPrefill(root) {
    try {
      var raw = sessionStorage.getItem('boxiesPayPrefill');
      if (!raw) return;
      sessionStorage.removeItem('boxiesPayPrefill');
      var data = JSON.parse(raw);
      var amount = root.querySelector('#panelPayAmount');
      var concepto = root.querySelector('#panelPayConcepto');
      if (amount && data.amount) amount.value = String(data.amount);
      if (concepto && data.concepto) concepto.value = data.concepto;
    } catch (e) {}
  }

  window.PanelPayments = {
    mount: async function (host) {
      await mount(host || document.getElementById('portalSubpage'));
      var root = document.getElementById('panelPaymentsRoot');
      if (root) applyPrefill(root);
    },
    prefillFromQuote: prefillFromQuote
  };
})();
