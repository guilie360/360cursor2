/**
 * Pagos Paddle (EUR) — anticipo 50% + entrega 50%, IVA en checkout.
 * Client token sandbox es público (test_*). La API key vive solo en Edge Functions.
 */
(function () {
  var FN_CREATE = '/functions/v1/paddle-create-checkout';
  var PRODUCT_REF = 'pro_01m7xm55aqj11tv2vsxvef1818';
  var CLIENT_TOKEN = (window.PADDLE_CLIENT_TOKEN || 'test_fa33546d73a21e0df2fe1760317');
  var PADDLE_ENV = (window.PADDLE_ENV || 'sandbox');
  var HUNTER_RATE = 0.08;
  var euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  var paddleReady = null;

  function moneyFromCents(cents) {
    return euro.format((Number(cents) || 0) / 100);
  }

  function splitCents(total) {
    var deposit = Math.round(total * 0.5);
    return { deposit: deposit, balance: total - deposit };
  }

  function hunterSplit(total) {
    var full = Math.round(total * HUNTER_RATE);
    var deposit = Math.round(full * 0.5);
    return { full: full, deposit: deposit, balance: full - deposit };
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
    if (!client) return null;
    var result = await client.auth.getSession();
    if (result.error) return null;
    return (result.data && result.data.session && result.data.session.access_token) || null;
  }

  function loadPaddle() {
    if (paddleReady) return paddleReady;
    paddleReady = new Promise(function (resolve, reject) {
      function init() {
        if (!window.Paddle) {
          reject(new Error('Paddle.js no cargó'));
          return;
        }
        try {
          if (PADDLE_ENV === 'sandbox') window.Paddle.Environment.set('sandbox');
          window.Paddle.Initialize({
            token: CLIENT_TOKEN,
            eventCallback: function (ev) {
              if (ev && ev.name === 'checkout.completed') {
                try {
                  window.dispatchEvent(new CustomEvent('paddle:checkout-completed', { detail: ev }));
                } catch (e) {}
              }
            }
          });
          resolve(window.Paddle);
        } catch (err) {
          reject(err);
        }
      }
      if (window.Paddle) {
        init();
        return;
      }
      var s = document.createElement('script');
      s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      s.async = true;
      s.onload = init;
      s.onerror = function () { reject(new Error('No se pudo cargar Paddle.js')); };
      document.head.appendChild(s);
    });
    return paddleReady;
  }

  async function createCheckout(payload) {
    var token = await getAccessToken();
    var base = (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) ||
      'https://emefdwzdfnqgjohbtvvn.supabase.co';
    var anon = (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) ||
      'sb_publishable_GmJNU3DZQqPgNBi6QVa5bA_2h--bgKz';
    var headers = {
      'Content-Type': 'application/json',
      apikey: anon
    };
    if (token) headers.Authorization = 'Bearer ' + token;
    else headers.Authorization = 'Bearer ' + anon;

    var res = await fetch(base + FN_CREATE, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      var msg = data.error || data.message || ('Error ' + res.status);
      if (res.status === 404) {
        msg = 'No se encontró la función de cobro (404). Recarga con Ctrl+F5.';
      }
      if (/secretos|PADDLE_API_KEY|Faltan secretos/i.test(msg)) {
        msg = 'Falta configurar PADDLE_API_KEY en Supabase Edge Functions Secrets.';
      }
      throw new Error(msg);
    }
    return data;
  }

  async function openCheckout(transactionId, email) {
    var Paddle = await loadPaddle();
    return new Promise(function (resolve) {
      Paddle.Checkout.open({
        transactionId: transactionId,
        settings: {
          displayMode: 'overlay',
          variant: 'one-page',
          theme: 'dark',
          successUrl: window.location.origin + window.location.pathname + '?pago=ok'
        },
        customer: email ? { email: email } : undefined
      });
      resolve(true);
    });
  }

  function scheduleHtml(totalCents, opts) {
    opts = opts || {};
    var parts = splitCents(totalCents);
    var hunter = hunterSplit(totalCents);
    var status = opts.status || 'pendiente_anticipo';
    var depositDone = status === 'en_produccion' || status === 'pendiente_entrega' || status === 'pagado';
    var balanceDone = status === 'pagado';
    var showHunter = !!opts.showHunter;
    var pedidoId = opts.pedidoId || '';

    return (
      '<section class="quote-pay-schedule" data-pedido-id="' + (pedidoId || '') + '">' +
        '<div class="quote-pay-head">' +
          '<span class="eyebrow">PLAN DE PAGOS</span>' +
          '<p class="desc">Importes en euros <strong>sin IVA</strong>. En el checkout, Paddle calcula automáticamente los impuestos según el país y si facturas como empresa (VAT). <em>+ IVA solo si aplica.</em></p>' +
        '</div>' +
        '<div class="quote-pay-grid">' +
          '<div class="quote-pay-card">' +
            '<small>Total del proyecto</small>' +
            '<strong>' + moneyFromCents(totalCents) + '</strong>' +
            '<span>Sin IVA</span>' +
          '</div>' +
          '<div class="quote-pay-card' + (depositDone ? ' is-done' : '') + '">' +
            '<small>Anticipo · 50%</small>' +
            '<strong>' + moneyFromCents(parts.deposit) + '</strong>' +
            '<span>' + (depositDone ? 'Pagado' : 'Para iniciar producción') + '</span>' +
          '</div>' +
          '<div class="quote-pay-card' + (balanceDone ? ' is-done' : '') + '">' +
            '<small>Entrega · 50%</small>' +
            '<strong>' + moneyFromCents(parts.balance) + '</strong>' +
            '<span>' + (balanceDone ? 'Pagado' : 'Al entregar el showroom') + '</span>' +
          '</div>' +
        '</div>' +
        (showHunter
          ? '<div class="quote-pay-hunter">' +
              '<small>Comisión Hunter · 8%</small>' +
              '<div class="quote-pay-hunter-row"><span>Total</span><strong>' + moneyFromCents(hunter.full) + '</strong></div>' +
              '<div class="quote-pay-hunter-row"><span>Con anticipo (50%)</span><strong>' + moneyFromCents(hunter.deposit) + '</strong></div>' +
              '<div class="quote-pay-hunter-row"><span>Con entrega (50%)</span><strong>' + moneyFromCents(hunter.balance) + '</strong></div>' +
            '</div>'
          : '') +
        '<div class="quote-pay-actions">' +
          '<button type="button" class="btn primary" data-pay-stage="deposit"' + (depositDone ? ' disabled' : '') + '>Pagar anticipo</button>' +
          '<button type="button" class="btn" data-pay-stage="balance"' + (!depositDone || balanceDone ? ' disabled' : '') + '>Pagar entrega</button>' +
        '</div>' +
        '<p class="quote-pay-status muted" aria-live="polite"></p>' +
      '</section>'
    );
  }

  function isInterno() {
    try {
      return !!(window.boxiesTeamSession || localStorage.getItem('boxiesPanelRole') || document.body.classList.contains('workspace-authenticated'));
    } catch (e) {
      return false;
    }
  }

  function fillOrderPayUI(totalEuros, meta) {
    meta = meta || {};
    var totalCents = Math.round(Number(totalEuros) * 100);
    if (!Number.isFinite(totalCents) || totalCents <= 0) return;
    var parts = splitCents(totalCents);
    var hunter = hunterSplit(totalCents);
    var setTxt = function (id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setTxt('orderPayTotal', moneyFromCents(totalCents));
    setTxt('orderPayDepositAmt', moneyFromCents(parts.deposit));
    setTxt('orderPayBalanceAmt', moneyFromCents(parts.balance));
    setTxt('orderPayHunterDeposit', moneyFromCents(hunter.deposit));
    setTxt('orderPayHunterBalance', moneyFromCents(hunter.balance));
    var hunterBox = document.getElementById('orderPayHunter');
    if (hunterBox) hunterBox.hidden = !isInterno();
    var host = document.getElementById('orderPaySchedule');
    if (host) {
      host.hidden = false;
      host.style.display = '';
      if (meta.pedidoId) host.setAttribute('data-pedido-id', meta.pedidoId);
    }
    var depBtn = document.getElementById('orderPayDeposit');
    var balBtn = document.getElementById('orderPayBalance');
    var status = meta.status || 'pendiente_anticipo';
    var depositDone = status === 'en_produccion' || status === 'pendiente_entrega' || status === 'pagado';
    var balanceDone = status === 'pagado';
    if (depBtn) depBtn.disabled = !!depositDone;
    if (balBtn) balBtn.disabled = !depositDone || balanceDone;
    var statusEl = document.getElementById('orderPayStatus');
    if (statusEl) statusEl.textContent = '';
  }

  function mountInOrderModal(totalEuros, meta) {
    meta = meta || {};
    fillOrderPayUI(totalEuros, meta);
    var ctx = {
      totalEuros: totalEuros,
      customerName: meta.customerName || '',
      customerEmail: meta.customerEmail || '',
      proyectoLabel: meta.proyectoLabel || 'Showroom 360Preventa',
      quoteSnapshot: meta.quoteSnapshot || null
    };
    window.__paddleOrderPayCtx = ctx;
    var host = document.getElementById('orderPaySchedule');
    if (host) bindStaticPayButtons(ctx);
  }

  function bindStaticPayButtons(ctx) {
    function run(stage, btn, payCtx) {
      return async function () {
        var c = payCtx || window.__paddleOrderPayCtx || ctx;
        var statusEl = document.getElementById('orderPayStatus');
        var email = (document.getElementById('customerEmail') || {}).value || c.customerEmail || '';
        var name = (document.getElementById('customerName') || {}).value || c.customerName || '';
        if (!email) {
          if (statusEl) statusEl.textContent = 'Indica el correo del cliente antes de pagar.';
          var emailInput = document.getElementById('customerEmail');
          if (emailInput) emailInput.focus();
          return;
        }
        btn.disabled = true;
        if (statusEl) statusEl.textContent = 'Creando cobro Paddle…';
        try {
          var payload = {
            stage: stage,
            quote_total_euros: c.totalEuros,
            customer_name: name,
            customer_email: email,
            proyecto_label: c.proyectoLabel,
            source: location.pathname.indexOf('cotizador') >= 0 ? 'cotizador' : 'panel',
            quote_snapshot: c.quoteSnapshot || undefined
          };
          var host = document.getElementById('orderPaySchedule');
          var pedidoId = host && host.getAttribute('data-pedido-id');
          if (pedidoId) payload.pedido_id = pedidoId;
          var data = await createCheckout(payload);
          if (data.pedido_id && host) host.setAttribute('data-pedido-id', data.pedido_id);
          if (statusEl) statusEl.textContent = 'Abriendo checkout… el IVA se calcula ahí si aplica.';
          await openCheckout(data.transaction_id, email);
          if (statusEl) statusEl.textContent = 'Checkout abierto. Al completar, el estado se actualizará automáticamente.';
        } catch (err) {
          if (statusEl) statusEl.textContent = err.message || 'No se pudo iniciar el pago.';
          btn.disabled = false;
        }
      };
    }
    var dep = document.getElementById('orderPayDeposit');
    var bal = document.getElementById('orderPayBalance');
    if (dep && !dep.dataset.paddleBound) {
      dep.dataset.paddleBound = '1';
      dep.addEventListener('click', function (ev) {
        ev.preventDefault();
        var c = window.__paddleOrderPayCtx || ctx;
        run('deposit', dep, c)();
      });
    }
    if (bal && !bal.dataset.paddleBound) {
      bal.dataset.paddleBound = '1';
      bal.addEventListener('click', function (ev) {
        ev.preventDefault();
        var c = window.__paddleOrderPayCtx || ctx;
        run('balance', bal, c)();
      });
    }
  }

  function bindSchedule(host, ctx) {
    var statusEl = host.querySelector('.quote-pay-status');
    host.querySelectorAll('[data-pay-stage]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var stage = btn.getAttribute('data-pay-stage');
        var email = (document.getElementById('customerEmail') || {}).value || ctx.customerEmail || '';
        var name = (document.getElementById('customerName') || {}).value || ctx.customerName || '';
        if (!email) {
          if (statusEl) statusEl.textContent = 'Indica el correo del cliente antes de pagar.';
          return;
        }
        btn.disabled = true;
        if (statusEl) statusEl.textContent = 'Creando cobro Paddle…';
        try {
          var payload = {
            stage: stage,
            quote_total_euros: ctx.totalEuros,
            customer_name: name,
            customer_email: email,
            proyecto_label: ctx.proyectoLabel,
            source: location.pathname.indexOf('cotizador') >= 0 ? 'cotizador' : 'panel',
            quote_snapshot: ctx.quoteSnapshot || undefined
          };
          var pedidoId = host.getAttribute('data-pedido-id');
          if (pedidoId) payload.pedido_id = pedidoId;
          var data = await createCheckout(payload);
          if (data.pedido_id) host.setAttribute('data-pedido-id', data.pedido_id);
          if (statusEl) statusEl.textContent = 'Abriendo checkout… el IVA se calcula ahí si aplica.';
          await openCheckout(data.transaction_id, email);
          if (statusEl) {
            statusEl.textContent = 'Checkout abierto. Al completar, el estado se actualizará automáticamente.';
          }
        } catch (err) {
          if (statusEl) statusEl.textContent = err.message || 'No se pudo iniciar el pago.';
          btn.disabled = false;
        }
      });
    });
  }

  function statusLabel(status) {
    return ({
      pending: 'Pendiente',
      cobrado: 'Cobrado',
      fallido: 'Fallido',
      cancelado: 'Cancelado',
      pendiente_anticipo: 'Pendiente anticipo',
      en_produccion: 'En producción',
      pendiente_entrega: 'Pendiente entrega',
      pagado: 'Pagado'
    })[status] || status || '—';
  }

  async function fetchPedidos() {
    var client = getClient();
    if (!client) return [];
    var result = await client.from('panel_pedidos').select('*').order('created_at', { ascending: false }).limit(100);
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function fetchCobros() {
    var client = getClient();
    if (!client) return [];
    var result = await client.from('panel_cobros').select('*').order('created_at', { ascending: false }).limit(200);
    if (result.error) throw result.error;
    return result.data || [];
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function renderPanel(root) {
    root.innerHTML = '<div class="portal-note">Cargando pedidos y cobros Paddle…</div>';
    Promise.all([fetchPedidos(), fetchCobros()]).then(function (pair) {
      var pedidos = pair[0];
      var cobros = pair[1].filter(function (r) { return r.provider === 'paddle' || r.paddle_transaction_id; });
      var pedidosHtml = pedidos.length
        ? pedidos.map(function (p) {
            return (
              '<div class="portal-list-item quote-pay-pedido">' +
                '<span><b>' + escapeHtml(p.proyecto_label || p.customer_name || 'Pedido') + '</b>' +
                '<small class="muted">' + escapeHtml(p.customer_email || '') + ' · ' + statusLabel(p.status) + '</small></span>' +
                '<span style="text-align:right"><b>' + moneyFromCents(p.quote_total_cents) + '</b>' +
                '<small class="muted">Anticipo ' + moneyFromCents(p.deposit_cents) + ' · Entrega ' + moneyFromCents(p.balance_cents) + '</small></span>' +
              '</div>'
            );
          }).join('')
        : '<p class="desc">Aún no hay pedidos 50/50. Se crean al pagar el anticipo desde la cotización.</p>';

      var cobrosHtml = cobros.length
        ? '<table class="panel-pay-table"><thead><tr><th>Concepto</th><th>Estado</th><th>Importe</th></tr></thead><tbody>' +
          cobros.map(function (r) {
            return '<tr><td>' + escapeHtml(r.concepto) + '</td><td>' + statusLabel(r.status) + '</td><td>' + moneyFromCents(r.amount_cents) + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<p class="desc">Sin cobros Paddle todavía.</p>';

      root.innerHTML =
        '<div class="panel-pay-stripe panel-pay-paddle">' +
          '<div class="eyebrow">PADDLE · SANDBOX</div>' +
          '<h3>Pedidos con anticipo y entrega</h3>' +
          '<p class="desc">Totales sin IVA. El impuesto lo calcula Paddle en el checkout (location). Comisión Hunter 8% en dos mitades.</p>' +
          '<div class="portal-list">' + pedidosHtml + '</div>' +
          '<h3 style="margin-top:22px">Cobros</h3>' +
          cobrosHtml +
        '</div>';
    }).catch(function (err) {
      root.innerHTML = '<div class="portal-note">No se pudieron cargar los pagos: ' + escapeHtml(err.message) + '</div>';
    });
  }

  window.PanelPaddle = {
    mount: function (root) {
      var el = root && (root.querySelector('[data-payments-root]') || root.querySelector('#panelPaymentsRoot') || root);
      if (!el) return;
      renderPanel(el);
    },
    mountInOrderModal: mountInOrderModal,
    fillOrderPayUI: fillOrderPayUI,
    scheduleHtml: scheduleHtml,
    splitCents: splitCents,
    hunterSplit: hunterSplit,
    moneyFromCents: moneyFromCents,
    productId: PRODUCT_REF,
    clientToken: CLIENT_TOKEN
  };

  // Bind estático en cuanto el DOM esté listo (botones del HTML del modal).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { bindStaticPayButtons({}); });
  } else {
    bindStaticPayButtons({});
  }

  document.addEventListener('paddle:checkout-completed', function () {
    var host = document.getElementById('orderPaySchedule');
    var statusEl = host && host.querySelector('.quote-pay-status');
    if (statusEl) statusEl.textContent = 'Pago recibido. Actualiza Pagos o recarga para ver el estado.';
  });
})();
