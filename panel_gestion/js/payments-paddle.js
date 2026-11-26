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

  function pagosCheckoutUrl(transactionId, email) {
    var q = new URLSearchParams();
    q.set('txn', String(transactionId || ''));
    if (email) q.set('email', String(email));
    return window.location.origin + '/pagos/?' + q.toString();
  }

  /** Abre el checkout en /pagos (URL limpia), no encima de /cotizar. */
  async function openCheckout(transactionId, email) {
    if (!transactionId) throw new Error('Falta transaction_id');
    // Si ya estamos en /pagos, abrir overlay aquí.
    if (/\/pagos\/?/i.test(window.location.pathname)) {
      var Paddle = await loadPaddle();
      Paddle.Checkout.open({
        transactionId: transactionId,
        settings: {
          displayMode: 'overlay',
          variant: 'one-page',
          theme: 'dark',
          successUrl: window.location.origin + '/pagos/?pago=ok'
        },
        customer: email ? { email: email } : undefined
      });
      return true;
    }
    window.location.assign(pagosCheckoutUrl(transactionId, email));
    return true;
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
    if (depBtn) {
      depBtn.disabled = !!depositDone;
      depBtn.style.display = depositDone ? 'none' : '';
      if (!depositDone) {
        depBtn.textContent = 'Contratar · anticipo 50% · ' + moneyFromCents(parts.deposit);
      }
    }
    // Pagar entrega no vive en este modal: se genera después (panel / enlace)
    if (balBtn) {
      balBtn.hidden = true;
      balBtn.style.display = 'none';
      balBtn.disabled = true;
      balBtn.setAttribute('aria-hidden', 'true');
    }
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
        var phone = (document.getElementById('customerPhone') || {}).value || '';
        if (!email) {
          if (statusEl) statusEl.textContent = 'Indica el correo del cliente antes de pagar.';
          var emailInput = document.getElementById('customerEmail');
          if (emailInput) emailInput.focus();
          return;
        }
        if (window.ClientAccount) {
          var fieldErr = ClientAccount.validateFields({ name: name, email: email, phone: phone });
          if (fieldErr) {
            if (statusEl) statusEl.textContent = fieldErr;
            var phoneInput = document.getElementById('customerPhone');
            if (phoneInput) phoneInput.focus();
            return;
          }
        }
        btn.disabled = true;
        if (statusEl) statusEl.textContent = 'Creando tu acceso a Mi perfil…';
        try {
          if (window.ClientAccount && typeof ClientAccount.ensureClientAccess === 'function') {
            await ClientAccount.ensureClientAccess();
          }
          if (statusEl) statusEl.textContent = 'Creando cobro Paddle…';
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

  function checkoutShareUrl(transactionId, email) {
    var q = new URLSearchParams();
    q.set('txn', String(transactionId || ''));
    if (email) q.set('email', String(email));
    return window.location.origin + '/pagos/?' + q.toString();
  }

  async function generateLinkForQuote(row, stage) {
    stage = stage || 'deposit';
    var totalEuros = (Number(row.total_cents) || 0) / 100;
    var data = await createCheckout({
      stage: stage,
      quote_total_euros: totalEuros,
      customer_name: row.customer_name,
      customer_email: row.customer_email,
      proyecto_label: row.proyecto_label || 'Showroom 360Preventa',
      source: 'panel_pagos',
      quote_snapshot: row.quote_snapshot || undefined,
      pedido_id: row.pedido_id || undefined,
      is_test: !!row.is_test
    });
    var url = checkoutShareUrl(data.transaction_id, row.customer_email);
    if (window.PreventaQuotes && row.id) {
      try {
        await PreventaQuotes.markPedido(row.id, data.pedido_id, url);
      } catch (e) {}
    }
    return { data: data, url: url };
  }

  function quoteDayKey(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function quoteDayLabel(iso) {
    if (!iso) return 'Sin fecha';
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Sin fecha';
    var today = new Date();
    var yday = new Date();
    yday.setDate(today.getDate() - 1);
    var sameDay = function (a, b) {
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    };
    if (sameDay(d, today)) return 'Hoy';
    if (sameDay(d, yday)) return 'Ayer';
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function quoteTimeLabel(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function metaRow(label, value) {
    if (value == null || value === '') return '';
    return '<div class="pay-meta-row"><span>' + escapeHtml(label) + '</span><strong>' + value + '</strong></div>';
  }

  /** Dos puntos: Anticipo · Entrega (apagado / verde). Patrón tipo Stripe step dots. */
  function payStageFromPedidoStatus(status) {
    if (status === 'pagado') {
      return { deposit: true, balance: true, label: 'Anticipo y entrega pagados' };
    }
    if (status === 'en_produccion' || status === 'pendiente_entrega') {
      return { deposit: true, balance: false, label: 'Anticipo pagado · entrega pendiente' };
    }
    return { deposit: false, balance: false, label: 'Solo cotizado · sin pagos' };
  }

  function payStageFromCobro(row) {
    var paid = isPaidCobro(row);
    var stage = row && (row.payment_stage || (row.metadata && row.metadata.stage));
    if (stage === 'balance' || stage === 'entrega') {
      return {
        deposit: true,
        balance: !!paid,
        label: paid ? 'Anticipo y entrega pagados' : 'Anticipo ok · entrega pendiente'
      };
    }
    return {
      deposit: !!paid,
      balance: false,
      label: paid ? 'Anticipo pagado · entrega pendiente' : 'Pago pendiente'
    };
  }

  function payStageDotsHtml(stage) {
    stage = stage || { deposit: false, balance: false, label: 'Sin pagos' };
    var tip = stage.label || 'Estado de pago';
    return (
      '<span class="pay-stage-dots" title="' + escapeHtml(tip) + '" aria-label="' + escapeHtml(tip) + '">' +
        '<i class="pay-stage-dot' + (stage.deposit ? ' is-on' : '') + '" data-stage="deposit"></i>' +
        '<i class="pay-stage-dot' + (stage.balance ? ' is-on' : '') + '" data-stage="balance"></i>' +
      '</span>'
    );
  }

  function clientCardHtml(opts) {
    opts = opts || {};
    return (
      '<details class="quote-crm-row pay-client-card ' + escapeHtml(opts.extraClass || '') + '"' +
        (opts.attrs || '') + '>' +
        '<summary class="quote-crm-row-summary">' +
          '<span class="quote-crm-row-title">' + escapeHtml(opts.title || 'Sin nombre') + '</span>' +
          (opts.time ? '<span class="quote-crm-row-time">' + escapeHtml(opts.time) + '</span>' : '') +
          '<span class="pay-ledger-amount">' + escapeHtml(opts.amount || '—') + '</span>' +
          (opts.stageHtml || '') +
          '<span class="quote-crm-row-chevron" aria-hidden="true"></span>' +
        '</summary>' +
        '<div class="quote-crm-row-body">' +
          (opts.bodyHtml || '') +
        '</div>' +
      '</details>'
    );
  }

  function bindPayTabs(root) {
    var tabs = root.querySelectorAll('[data-pay-tab]');
    var panels = {
      quotes: root.querySelector('[data-pay-panel="quotes"]'),
      books: root.querySelector('[data-pay-panel="books"]')
    };
    function activate(name) {
      tabs.forEach(function (btn) {
        var on = btn.getAttribute('data-pay-tab') === name;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      Object.keys(panels).forEach(function (key) {
        if (!panels[key]) return;
        panels[key].hidden = key !== name;
      });
    }
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activate(btn.getAttribute('data-pay-tab') || 'quotes');
      });
    });
    activate('quotes');
  }

  function bindQuotesPanel(root) {
    var search = root.querySelector('[data-quote-search]');
    var monthEl = root.querySelector('[data-quote-month]');
    var sortEl = root.querySelector('[data-quote-sort]');
    var list = root.querySelector('[data-quote-list]');
    var status = root.querySelector('[data-quote-status]');
    var hideTests = root.querySelector('[data-quote-hide-tests]');
    var purgeTests = root.querySelector('[data-quote-purge-tests]');
    if (!list || !window.PreventaQuotes) return;

    var cacheRows = [];
    var pedidoById = {};

    function fillMonthOptions(rows) {
      if (!monthEl) return;
      var keys = {};
      keys[currentMonthKey()] = true;
      (rows || []).forEach(function (r) {
        var k = monthKeyFromIso(r.created_at);
        if (k) keys[k] = true;
      });
      var selected = monthEl.value || 'all';
      var ordered = Object.keys(keys).sort().reverse();
      monthEl.innerHTML =
        '<option value="all"' + (selected === 'all' ? ' selected' : '') + '>Todos los meses</option>' +
        ordered.map(function (k) {
          return '<option value="' + escapeHtml(k) + '"' + (k === selected ? ' selected' : '') + '>' +
            escapeHtml(monthLabel(k)) + '</option>';
        }).join('');
    }

    function paint() {
      var month = monthEl ? monthEl.value : 'all';
      var rows = cacheRows.filter(function (r) {
        if (month && month !== 'all' && monthKeyFromIso(r.created_at) !== month) return false;
        return true;
      });
      if (!rows.length) {
        list.innerHTML = '<p class="desc">Sin cotizaciones en este periodo.</p>';
        return;
      }
      var html = '';
      var lastDay = null;
      rows.forEach(function (r) {
        var day = quoteDayKey(r.created_at);
        if (day !== lastDay) {
          lastDay = day;
          html += '<div class="quote-crm-day">' + escapeHtml(quoteDayLabel(r.created_at)) + '</div>';
        }
        var title = String(r.customer_name || '').trim() || String(r.customer_email || '').trim() || 'Sin nombre';
        var time = r.created_at ? new Date(r.created_at).toLocaleString('es-ES', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        }) : '';
        var pedido = r.pedido_id ? pedidoById[r.pedido_id] : null;
        var stage = payStageFromPedidoStatus(pedido && pedido.status);
        var body =
          '<div class="pay-meta-grid">' +
            (r.is_test ? '<div class="quote-crm-test-tag">prueba</div>' : '') +
            metaRow('Email', escapeHtml(r.customer_email || '—')) +
            metaRow('Teléfono', escapeHtml(r.customer_phone || '—')) +
            metaRow('País', escapeHtml(r.customer_country || '—')) +
            metaRow('Proyecto', escapeHtml(r.proyecto_label || '—')) +
            metaRow('Pago', escapeHtml(stage.label)) +
            metaRow('Creada', escapeHtml(r.created_at ? new Date(r.created_at).toLocaleString('es-ES') : '—')) +
            metaRow('Total cotización', moneyFromCents(r.total_cents)) +
          '</div>' +
          '<div class="quote-crm-row-actions">' +
            '<button type="button" class="btn primary" data-quote-charge="deposit">Cobrar</button>' +
            '<button type="button" class="btn" data-quote-open="1"' + (r.last_checkout_url ? '' : ' disabled') + '>Link</button>' +
            '<button type="button" class="btn" data-quote-test="1">' + (r.is_test ? 'No prueba' : 'Prueba') + '</button>' +
            '<button type="button" class="btn" data-quote-delete="1">Borrar</button>' +
          '</div>' +
          '<p class="desc pay-auto-hint">Se crea sola al descargar el PDF del cotizador</p>';
        html += clientCardHtml({
          title: title,
          time: time,
          amount: moneyFromCents(r.total_cents),
          stageHtml: payStageDotsHtml(stage),
          bodyHtml: body,
          attrs: ' data-quote-id="' + escapeHtml(r.id) + '"'
        });
      });
      list.innerHTML = html;

      list.querySelectorAll('.quote-crm-row').forEach(function (el) {
        var id = el.getAttribute('data-quote-id');
        var row = cacheRows.find(function (x) { return x.id === id; });
        if (!row) return;
        var chargeBtn = el.querySelector('[data-quote-charge]');
        var openBtn = el.querySelector('[data-quote-open]');
        var testBtn = el.querySelector('[data-quote-test]');
        var delBtn = el.querySelector('[data-quote-delete]');
        if (chargeBtn) {
          chargeBtn.addEventListener('click', async function () {
            chargeBtn.disabled = true;
            if (status) status.textContent = 'Generando checkout Paddle…';
            try {
              var out = await generateLinkForQuote(row, 'deposit');
              if (status) status.textContent = 'Link listo. Copiado al portapapeles si el navegador lo permite.';
              try { await navigator.clipboard.writeText(out.url); } catch (eClip) {}
              var go = window.confirm('Link de cobro creado.\n\n' + out.url + '\n\n¿Abrir checkout ahora?');
              if (go) window.location.assign(out.url);
              else refresh();
            } catch (err) {
              if (status) status.textContent = err.message || 'No se pudo generar el link.';
              chargeBtn.disabled = false;
            }
          });
        }
        if (openBtn) {
          openBtn.addEventListener('click', function () {
            if (row.last_checkout_url) window.open(row.last_checkout_url, '_blank', 'noopener');
          });
        }
        if (testBtn) {
          testBtn.addEventListener('click', async function () {
            testBtn.disabled = true;
            try {
              await PreventaQuotes.setTestFlag(row.id, !row.is_test);
              refresh();
            } catch (err) {
              if (status) status.textContent = err.message || 'No se pudo marcar.';
              testBtn.disabled = false;
            }
          });
        }
        if (delBtn) {
          delBtn.addEventListener('click', async function () {
            if (!window.confirm('¿Eliminar cotización de ' + row.customer_name + '?')) return;
            delBtn.disabled = true;
            try {
              await PreventaQuotes.deleteQuote(row.id);
              if (status) status.textContent = 'Cotización eliminada.';
              refresh();
            } catch (err) {
              if (status) status.textContent = err.message || 'No se pudo eliminar.';
              delBtn.disabled = false;
            }
          });
        }
      });
    }

    async function refresh() {
      list.innerHTML = '<p class="desc">Cargando cotizaciones…</p>';
      if (status) status.textContent = '';
      try {
        var sort = sortEl && sortEl.value === 'oldest' ? 'oldest' : 'newest';
        var pair = await Promise.all([
          PreventaQuotes.listQuotes({
            query: search ? search.value : '',
            hideTests: !!(hideTests && hideTests.checked),
            sort: sort
          }),
          fetchPedidos().catch(function () { return []; })
        ]);
        cacheRows = pair[0] || [];
        pedidoById = {};
        (pair[1] || []).forEach(function (p) {
          if (p && p.id) pedidoById[p.id] = p;
        });
        fillMonthOptions(cacheRows);
        if (!cacheRows.length) {
          list.innerHTML = '<p class="desc">Sin cotizaciones. Se crean automáticamente al descargar el PDF.</p>';
          return;
        }
        paint();
      } catch (err) {
        list.innerHTML = '<div class="portal-note">No se pudieron cargar cotizaciones: ' + escapeHtml(err.message) + '</div>';
      }
    }

    var searchTimer = null;
    if (search) {
      search.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(refresh, 220);
      });
    }
    if (hideTests) hideTests.addEventListener('change', refresh);
    if (sortEl) sortEl.addEventListener('change', refresh);
    if (monthEl) monthEl.addEventListener('change', paint);
    if (purgeTests) {
      purgeTests.addEventListener('click', async function () {
        if (!window.confirm('¿Eliminar TODAS las cotizaciones marcadas como prueba?')) return;
        purgeTests.disabled = true;
        try {
          var n = await PreventaQuotes.deleteTestQuotes();
          if (status) status.textContent = n ? ('Eliminadas: ' + n) : 'No había pruebas marcadas.';
          refresh();
        } catch (err) {
          if (status) status.textContent = err.message || 'No se pudieron borrar las pruebas.';
        } finally {
          purgeTests.disabled = false;
        }
      });
    }
    var purgeAll = root.querySelector('[data-quote-purge-all]');
    if (purgeAll) {
      purgeAll.addEventListener('click', async function () {
        if (!window.confirm('¿Vaciar TODAS las cotizaciones guardadas? Esta acción no se puede deshacer.')) return;
        purgeAll.disabled = true;
        try {
          var n = await PreventaQuotes.deleteAllQuotes();
          if (status) status.textContent = 'Lista vaciada (' + n + ').';
          refresh();
        } catch (err) {
          if (status) status.textContent = err.message || 'No se pudo vaciar.';
        } finally {
          purgeAll.disabled = false;
        }
      });
    }
    refresh();
  }

  var PADDLE_FEE_RATE = 0.05; // estimado hasta reconciliar payouts reales

  function isPaidCobro(r) {
    return r && (r.status === 'cobrado' || r.status === 'paid' || r.status === 'completed');
  }

  function isOpenCobro(r) {
    return r && (r.status === 'pending' || r.status === 'pendiente');
  }

  function looksLikeTestPay(row) {
    if (!row) return false;
    if (row.is_test === true || row.is_test === 'true' || row.is_test === 1) return true;
    var meta = row.metadata;
    if (meta && (meta.is_test === true || meta.is_test === 'true')) return true;
    if (meta && String(meta.paddle_env || '') === 'sandbox') return true;
    var blob = [
      row.customer_email,
      row.customer_name,
      row.concepto,
      row.proyecto_label
    ].join(' ').toLowerCase();
    return /\b(test|prueba|testing|demo|asdf|testeo)\b/i.test(blob);
  }

  async function deleteTestPays() {
    var client = getClient();
    if (!client) throw new Error('Sin sesión de equipo');
    var result = await client.rpc('panel_pagos_delete_tests');
    if (result.error) throw new Error(result.error.message || 'No se pudieron borrar las pruebas');
    var data = result.data || {};
    return {
      cobros: Number(data.cobros) || 0,
      pedidos: Number(data.pedidos) || 0
    };
  }

  async function deleteCobro(id) {
    var client = getClient();
    if (!client) throw new Error('Sin sesión de equipo');
    var result = await client.rpc('panel_cobros_delete', { p_id: id });
    if (result.error) throw new Error(result.error.message || 'No se pudo eliminar el cobro');
    return true;
  }

  async function setCobroTestFlag(id, isTest) {
    var client = getClient();
    if (!client) throw new Error('Sin sesión de equipo');
    var result = await client.rpc('panel_cobros_set_test', {
      p_id: id,
      p_is_test: !!isTest
    });
    if (result.error) throw new Error(result.error.message || 'No se pudo marcar como prueba');
    return true;
  }

  function cobroWhen(r) {
    return r.paid_at || r.updated_at || r.created_at;
  }

  function monthKeyFromIso(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function monthLabel(key) {
    var parts = String(key || '').split('-');
    if (parts.length < 2) return key || '—';
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    var label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function currentMonthKey() {
    var n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
  }

  function stageLabel(stage) {
    if (stage === 'deposit' || stage === 'anticipo') return 'Anticipo';
    if (stage === 'balance' || stage === 'entrega') return 'Entrega';
    return stage || 'Cobro';
  }

  function estimateFeeCents(amountCents) {
    return Math.round((Number(amountCents) || 0) * PADDLE_FEE_RATE);
  }

  function estimateHunterCents(amountCents) {
    return Math.round((Number(amountCents) || 0) * HUNTER_RATE);
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function createSinglePagePdf(jpegDataUrl, canvas) {
    var pageW = 595.28;
    var pageH = 841.89;
    var pxW = canvas.width;
    var pxH = Math.round(pxW * pageH / pageW);
    var sc = Math.min(1, pxH / canvas.height);
    var dw = canvas.width * sc;
    var dh = canvas.height * sc;
    var ox = (pxW - dw) / 2;
    var slice = document.createElement('canvas');
    slice.width = pxW;
    slice.height = pxH;
    var ctx = slice.getContext('2d');
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, pxW, pxH);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, ox, 0, dw, dh);
    var data = slice.toDataURL('image/jpeg', 0.96).split(',')[1];
    var binary = atob(data);
    var bytes = new Uint8Array(binary.length);
    for (var j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
    var enc = new TextEncoder();
    var chunks = [];
    var offsets = [0];
    var length = 0;
    function addBytes(b) { chunks.push(b); length += b.length; }
    function addText(t) { addBytes(enc.encode(t)); }
    var content = 'q\n' + pageW + ' 0 0 ' + pageH + ' 0 0 cm\n/Im0 Do\nQ';
    addText('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    offsets[1] = length; addText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    offsets[2] = length; addText('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    offsets[3] = length; addText('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageW + ' ' + pageH + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n');
    offsets[4] = length; addText('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + pxW + ' /Height ' + pxH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + bytes.length + ' >>\nstream\n');
    addBytes(bytes); addText('\nendstream\nendobj\n');
    offsets[5] = length; addText('5 0 obj\n<< /Length ' + enc.encode(content).length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
    var total = 6;
    var xref = length;
    addText('xref\n0 ' + total + '\n0000000000 65535 f \n');
    for (var i = 1; i < total; i++) addText(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    addText('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  async function loadPdfLogo() {
    var logo = new Image();
    var candidates = [
      '/panel_gestion/assets/logo-pdf.png',
      '/panel_gestion/assets/logo.png',
      'assets/logo-pdf.png',
      'assets/logo.png'
    ];
    await new Promise(function (resolve) {
      var i = 0;
      function tryNext() {
        if (i >= candidates.length) {
          logo.removeAttribute('src');
          return resolve();
        }
        logo.onload = function () { resolve(); };
        logo.onerror = function () { i += 1; tryNext(); };
        logo.src = candidates[i++];
      }
      tryNext();
    });
    return logo;
  }

  async function buildAccountingCanvas(opts) {
    opts = opts || {};
    try {
      await Promise.all([
        document.fonts.load('400 52px Italiana'),
        document.fonts.load('400 22px Manrope'),
        document.fonts.load('700 22px Manrope')
      ]);
    } catch (e) {}

    var logo = await loadPdfLogo();
    var T = {
      bg: '#0d0d0d',
      ink: '#f1eee8',
      muted: '#b2a797',
      acc: '#c5a675',
      gold: '#d0b88f'
    };
    var SERIF = 'Italiana,Georgia,serif';
    var SANS = 'Manrope,Arial,sans-serif';
    var monthTitle = opts.monthLabel || 'Mes';
    var kpis = opts.kpis || {};
    var rows = (opts.rows || []).slice(0, 18);
    var more = Math.max(0, (opts.rows || []).length - rows.length);

    var W = 1200;
    var pad = 92;
    var right = W - pad;
    var headerH = 390;
    var kpiH = 150;
    var rowH = 54;
    var footerH = 110;
    var H = headerH + kpiH + 40 + rows.length * rowH + (more ? 36 : 0) + footerH + 40;
    H = Math.max(H, 1697);

    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var c = canvas.getContext('2d');
    function rr(x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    c.fillStyle = T.bg;
    c.fillRect(0, 0, W, H);
    var ambient = c.createRadialGradient(W * 0.78, 90, 20, W * 0.78, 90, 720);
    ambient.addColorStop(0, 'rgba(205,178,138,.045)');
    ambient.addColorStop(0.42, 'rgba(205,178,138,.012)');
    ambient.addColorStop(1, 'rgba(205,178,138,0)');
    c.fillStyle = ambient;
    c.fillRect(0, 0, W, H);

    var cx = 30;
    var cy = 30;
    var cw = W - 60;
    var ch = H - 60;
    c.save();
    c.shadowColor = 'rgba(0,0,0,.88)';
    c.shadowBlur = 58;
    c.shadowOffsetY = 22;
    var card = c.createLinearGradient(cx, cy, cx, cy + ch);
    card.addColorStop(0, '#1b1b1b');
    card.addColorStop(0.48, '#151515');
    card.addColorStop(1, '#101010');
    rr(cx, cy, cw, ch, 22);
    c.fillStyle = card;
    c.fill();
    c.restore();
    rr(cx, cy, cw, ch, 22);
    c.strokeStyle = 'rgba(205,178,138,.20)';
    c.lineWidth = 1.5;
    c.stroke();

    var logoW = 0;
    if (logo.naturalWidth) {
      var logoH = 72;
      logoW = logoH * logo.naturalWidth / logo.naturalHeight;
      c.drawImage(logo, pad, 70, logoW, logoH);
      logoW += 24;
    }
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.fillStyle = T.acc;
    c.font = '700 15px ' + SANS;
    c.fillText('360PREVENTA  ·  CONTABILIDAD', pad + logoW, 108);
    c.fillStyle = T.ink;
    c.font = '400 52px ' + SERIF;
    c.fillText(monthTitle, pad, 210);
    c.fillStyle = T.muted;
    c.font = '400 20px ' + SANS;
    c.fillText('Resumen de ingresos y movimientos del mes', pad, 252);
    c.textAlign = 'right';
    c.fillStyle = '#918777';
    c.font = '500 14px ' + SANS;
    c.fillText(new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric'
    }).format(new Date()), right, 108);

    c.strokeStyle = 'rgba(205,178,138,.45)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(pad, 290);
    c.lineTo(right, 290);
    c.stroke();

    var kpiItems = [
      { label: 'Cobrado bruto', value: kpis.bruto || '—' },
      { label: 'Neto estimado', value: kpis.neto || '—' },
      { label: 'Hunter 8%', value: kpis.hunter || '—' },
      { label: 'Pendiente', value: kpis.pendiente || '—' }
    ];
    var gap = 16;
    var boxW = (W - 2 * pad - gap * 3) / 4;
    var kpiY = 318;
    kpiItems.forEach(function (item, i) {
      var x = pad + i * (boxW + gap);
      c.save();
      c.shadowColor = 'rgba(0,0,0,.5)';
      c.shadowBlur = 18;
      c.shadowOffsetY = 8;
      rr(x, kpiY, boxW, 118, 13);
      c.fillStyle = '#111111';
      c.fill();
      c.restore();
      rr(x, kpiY, boxW, 118, 13);
      c.strokeStyle = 'rgba(205,178,138,.18)';
      c.lineWidth = 1;
      c.stroke();
      c.textAlign = 'left';
      c.fillStyle = T.muted;
      c.font = '600 12px ' + SANS;
      c.fillText(item.label.toUpperCase(), x + 18, kpiY + 36);
      c.fillStyle = T.gold;
      c.font = '400 28px ' + SERIF;
      c.fillText(item.value, x + 18, kpiY + 84);
    });

    var y = kpiY + 150;
    c.fillStyle = T.acc;
    c.font = '700 13px ' + SANS;
    c.textAlign = 'left';
    c.fillText('MOVIMIENTOS', pad, y);
    y += 24;

    if (!rows.length) {
      c.fillStyle = T.muted;
      c.font = '400 18px ' + SANS;
      c.fillText('Sin movimientos en este mes.', pad, y + 28);
    } else {
      rows.forEach(function (r, i) {
        var rh = rowH;
        if (i % 2 === 0) {
          c.save();
          c.shadowColor = 'rgba(0,0,0,.4)';
          c.shadowBlur = 12;
          c.shadowOffsetY = 4;
          rr(pad - 12, y, W - 2 * pad + 24, rh - 4, 9);
          c.fillStyle = 'rgba(255,255,255,.025)';
          c.fill();
          c.restore();
        }
        var mid = y + rh / 2 + 5;
        c.textAlign = 'left';
        c.fillStyle = T.ink;
        c.font = '600 16px ' + SANS;
        c.fillText(r.when || '—', pad, mid);
        c.fillStyle = T.muted;
        c.font = '400 15px ' + SANS;
        c.fillText(r.client || '—', pad + 150, mid);
        c.fillText(r.stage || '', pad + 520, mid);
        c.fillText(r.status || '', pad + 680, mid);
        c.textAlign = 'right';
        c.fillStyle = T.ink;
        c.font = '700 16px ' + SANS;
        c.fillText(r.amount || '—', right, mid);
        c.strokeStyle = 'rgba(205,178,138,.12)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(pad, y + rh - 2);
        c.lineTo(right, y + rh - 2);
        c.stroke();
        y += rh;
      });
      if (more > 0) {
        c.textAlign = 'left';
        c.fillStyle = T.muted;
        c.font = '400 14px ' + SANS;
        c.fillText('… y ' + more + ' movimiento' + (more === 1 ? '' : 's') + ' más en el panel.', pad, y + 22);
      }
    }

    c.fillStyle = '#8f887d';
    c.font = '400 13px ' + SANS;
    c.textAlign = 'center';
    c.fillText('360PREVENTA.COM  ·  INFORME INTERNO DE PAGOS', W / 2, H - 56);
    return canvas;
  }

  function renderPanel(root) {
    root.innerHTML =
      '<div class="panel-pay-stripe panel-pay-paddle">' +
        '<div class="pay-tabs" role="tablist" aria-label="Secciones de Pagos">' +
          '<button type="button" class="pay-tab is-active" role="tab" data-pay-tab="quotes" aria-selected="true">Cotizaciones</button>' +
          '<button type="button" class="pay-tab" role="tab" data-pay-tab="books" aria-selected="false">Contabilidad</button>' +
        '</div>' +

        '<section class="pay-tab-panel" data-pay-panel="quotes">' +
          '<p class="desc pay-books-lead">Fichas de clientes creadas al descargar el PDF. Aquí cobras y gestionas el pipeline.</p>' +
          '<div class="portal-form quote-crm-toolbar pay-toolbar">' +
            '<label>Buscar<input type="search" data-quote-search placeholder="Nombre o email…" autocomplete="off"></label>' +
            '<label class="quote-crm-sort-label">Mes<select data-quote-month></select></label>' +
            '<label class="quote-crm-sort-label">Ordenar' +
              '<select data-quote-sort>' +
                '<option value="newest" selected>Más recientes</option>' +
                '<option value="oldest">Más antiguas</option>' +
              '</select>' +
            '</label>' +
            '<div class="quote-crm-toolbar-actions">' +
              '<label class="quote-crm-check"><input type="checkbox" data-quote-hide-tests checked> Ocultar pruebas</label>' +
              '<button type="button" class="btn" data-quote-purge-tests>Borrar pruebas</button>' +
              '<button type="button" class="btn" data-quote-purge-all>Vaciar</button>' +
            '</div>' +
          '</div>' +
          '<p class="desc" data-quote-status aria-live="polite"></p>' +
          '<div class="portal-list" data-quote-list></div>' +
        '</section>' +

        '<section class="pay-tab-panel" data-pay-panel="books" hidden>' +
          '<div class="pay-books" data-pay-books>' +
            '<p class="desc pay-books-lead">Ingresos del mes. Los datos se rellenan solos cuando Paddle confirma el pago.</p>' +
            '<div class="portal-form quote-crm-toolbar pay-toolbar">' +
              '<label>Buscar<input type="search" data-pay-search placeholder="Nombre o email…" autocomplete="off"></label>' +
              '<label class="quote-crm-sort-label">Mes<select data-pay-month></select></label>' +
              '<div class="quote-crm-toolbar-actions">' +
                '<label class="quote-crm-check"><input type="checkbox" data-pay-hide-tests checked> Ocultar pruebas</label>' +
                '<button type="button" class="btn" data-pay-purge-tests>Borrar pruebas</button>' +
                '<button type="button" class="btn" data-pay-export>Descargar PDF</button>' +
              '</div>' +
            '</div>' +
            '<p class="desc" data-pay-status aria-live="polite"></p>' +
            '<div class="pay-kpi-grid" data-pay-kpis></div>' +
            '<div class="eyebrow pay-ledger-eyebrow">MOVIMIENTOS</div>' +
            '<div class="pay-ledger" data-pay-ledger><p class="desc">Cargando…</p></div>' +
            '<p class="desc pay-books-note" data-pay-note></p>' +
          '</div>' +
        '</section>' +
      '</div>';
    bindPayTabs(root);
    bindQuotesPanel(root);
    bindAccountingPanel(root);
  }

  function bindAccountingPanel(root) {
    var monthEl = root.querySelector('[data-pay-month]');
    var searchEl = root.querySelector('[data-pay-search]');
    var hideTestsEl = root.querySelector('[data-pay-hide-tests]');
    var purgeTestsBtn = root.querySelector('[data-pay-purge-tests]');
    var statusEl = root.querySelector('[data-pay-status]');
    var kpisEl = root.querySelector('[data-pay-kpis]');
    var ledgerEl = root.querySelector('[data-pay-ledger]');
    var noteEl = root.querySelector('[data-pay-note]');
    var exportBtn = root.querySelector('[data-pay-export]');
    if (!monthEl || !kpisEl || !ledgerEl) return;

    var cache = { cobros: [], pedidos: [], month: currentMonthKey() };

    function buildMonthOptions(cobros, pedidos) {
      var keys = {};
      keys[currentMonthKey()] = true;
      (cobros || []).forEach(function (r) {
        var k = monthKeyFromIso(cobroWhen(r));
        if (k) keys[k] = true;
      });
      (pedidos || []).forEach(function (p) {
        var k = monthKeyFromIso(p.created_at);
        if (k) keys[k] = true;
      });
      return Object.keys(keys).sort().reverse();
    }

    function needleOk(row, needle) {
      if (!needle) return true;
      var blob = [
        row.customer_email,
        row.customer_name,
        row.proyecto_label,
        row.concepto
      ].join(' ').toLowerCase();
      return blob.indexOf(needle) >= 0;
    }

    function hideTestsOn() {
      return !!(hideTestsEl && hideTestsEl.checked);
    }

    function accountingRows(month) {
      var needle = searchEl ? String(searchEl.value || '').trim().toLowerCase() : '';
      var hideTests = hideTestsOn();
      return (cache.cobros || []).filter(function (r) {
        if (hideTests && looksLikeTestPay(r)) return false;
        if (!(r.provider === 'paddle' || r.paddle_transaction_id || r.provider === 'stripe' || !r.provider)) {
          return false;
        }
        if (monthKeyFromIso(cobroWhen(r)) !== month) return false;
        return needleOk(r, needle);
      });
    }

    function renderKpis(month) {
      var rows = accountingRows(month);
      var paid = rows.filter(isPaidCobro);
      var open = rows.filter(isOpenCobro);
      var bruto = paid.reduce(function (s, r) { return s + (Number(r.amount_cents) || 0); }, 0);
      var fee = paid.reduce(function (s, r) { return s + estimateFeeCents(r.amount_cents); }, 0);
      var hunter = paid.reduce(function (s, r) { return s + estimateHunterCents(r.amount_cents); }, 0);
      var neto = Math.max(0, bruto - fee);
      var pendiente = open.reduce(function (s, r) { return s + (Number(r.amount_cents) || 0); }, 0);

      (cache.pedidos || []).forEach(function (p) {
        if (hideTestsOn() && looksLikeTestPay(p)) return;
        if (p.status === 'en_produccion' || p.status === 'pendiente_entrega') {
          pendiente += Number(p.balance_cents) || 0;
        } else if (p.status === 'pendiente_anticipo') {
          pendiente += Number(p.deposit_cents) || 0;
        }
      });

      kpisEl.innerHTML =
        '<div class="pay-kpi"><small>Cobrado bruto</small><strong>' + moneyFromCents(bruto) + '</strong><em>' + paid.length + ' cobros</em></div>' +
        '<div class="pay-kpi"><small>Neto estimado</small><strong>' + moneyFromCents(neto) + '</strong><em>−' + Math.round(PADDLE_FEE_RATE * 100) + '% fee Paddle</em></div>' +
        '<div class="pay-kpi"><small>Hunter a pagar</small><strong>' + moneyFromCents(hunter) + '</strong><em>8% sobre cobrado</em></div>' +
        '<div class="pay-kpi"><small>Pendiente</small><strong>' + moneyFromCents(pendiente) + '</strong><em>links / entregas</em></div>';
    }

    function renderLedger(month) {
      var rows = accountingRows(month).slice().sort(function (a, b) {
        return new Date(cobroWhen(b)) - new Date(cobroWhen(a));
      });
      if (!rows.length) {
        ledgerEl.innerHTML = '<p class="desc">Sin movimientos en ' + escapeHtml(monthLabel(month)) + '.</p>';
        if (noteEl) noteEl.textContent = 'Esto se llena solo: al pagar el cliente en Paddle, el webhook marca el cobro como Cobrado.';
        return;
      }

      var paid = rows.filter(isPaidCobro);
      var open = rows.filter(isOpenCobro);
      var other = rows.filter(function (r) { return !isPaidCobro(r) && !isOpenCobro(r); });
      var ordered = paid.concat(open, other);

      ledgerEl.innerHTML =
        '<div class="portal-list pay-ledger-list">' +
        ordered.map(function (r) {
          var when = cobroWhen(r);
          var day = when ? new Date(when).toLocaleString('es-ES', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
          }) : '—';
          var stageName = stageLabel(r.payment_stage || (r.metadata && r.metadata.stage));
          var fee = estimateFeeCents(r.amount_cents);
          var stateClass = isPaidCobro(r) ? 'is-paid' : (isOpenCobro(r) ? 'is-open' : 'is-other');
          var title = String(r.customer_name || '').trim() || String(r.customer_email || '').trim() || 'Cobro';
          var dots = payStageFromCobro(r);
          if (r.pedido_id && cache.pedidos) {
            var ped = cache.pedidos.find(function (p) { return p.id === r.pedido_id; });
            if (ped) dots = payStageFromPedidoStatus(ped.status);
          }
          var isTest = looksLikeTestPay(r);
          var body =
            (isTest ? '<div class="quote-crm-test-tag">prueba</div>' : '') +
            '<div class="pay-meta-grid">' +
              metaRow('Estado', escapeHtml(statusLabel(r.status))) +
              metaRow('Tipo', escapeHtml(stageName)) +
              metaRow('Pago', escapeHtml(dots.label)) +
              metaRow('Proyecto', escapeHtml(r.proyecto_label || '—')) +
              metaRow('Importe', moneyFromCents(r.amount_cents)) +
              metaRow('Fee estimado', moneyFromCents(fee)) +
              metaRow('Neto estimado', moneyFromCents(Math.max(0, (Number(r.amount_cents) || 0) - fee))) +
              metaRow('Hunter', moneyFromCents(estimateHunterCents(r.amount_cents))) +
              (r.paddle_transaction_id ? metaRow('ID Paddle', escapeHtml(r.paddle_transaction_id)) : '') +
            '</div>' +
            '<div class="quote-crm-row-actions">' +
              '<button type="button" class="btn" data-pay-test="' + escapeHtml(r.id) + '">' +
                (isTest ? 'No prueba' : 'Prueba') +
              '</button>' +
              '<button type="button" class="btn" data-pay-delete="' + escapeHtml(r.id) + '">Borrar</button>' +
            '</div>' +
            '<p class="desc pay-auto-hint">Paddle confirma el cobro. Puedes marcar/borrar pruebas para limpiar sandbox.</p>';
          return clientCardHtml({
            title: title,
            time: day,
            amount: moneyFromCents(r.amount_cents),
            stageHtml: payStageDotsHtml(dots),
            extraClass: 'pay-ledger-row ' + stateClass + (isTest ? ' is-test' : ''),
            bodyHtml: body
          });
        }).join('') +
        '</div>';

      if (noteEl) {
        noteEl.textContent = 'Pendiente = link creado, aún no pagado. Cobrado = pago confirmado por Paddle. Desmarca “Ocultar pruebas” para ver sandbox y borrarlas.';
      }
    }

    function paint() {
      var month = monthEl.value || currentMonthKey();
      cache.month = month;
      renderKpis(month);
      renderLedger(month);
    }

    function fillMonthSelect(keys) {
      var selected = monthEl.value || currentMonthKey();
      if (keys.indexOf(selected) < 0) selected = keys[0] || currentMonthKey();
      monthEl.innerHTML = keys.map(function (k) {
        return '<option value="' + escapeHtml(k) + '"' + (k === selected ? ' selected' : '') + '>' +
          escapeHtml(monthLabel(k)) + '</option>';
      }).join('');
    }

    async function refresh() {
      kpisEl.innerHTML = '<p class="desc">Cargando…</p>';
      ledgerEl.innerHTML = '<p class="desc">Cargando…</p>';
      try {
        var pair = await Promise.all([fetchCobros(), fetchPedidos()]);
        cache.cobros = pair[0] || [];
        cache.pedidos = pair[1] || [];
        fillMonthSelect(buildMonthOptions(cache.cobros, cache.pedidos));
        paint();
      } catch (err) {
        kpisEl.innerHTML = '';
        ledgerEl.innerHTML = '<div class="portal-note">No se pudo cargar contabilidad: ' + escapeHtml(err.message) + '</div>';
      }
    }

    monthEl.addEventListener('change', paint);
    if (hideTestsEl) hideTestsEl.addEventListener('change', paint);
    if (searchEl) {
      var t = null;
      searchEl.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(paint, 180);
      });
    }
    if (purgeTestsBtn) {
      purgeTestsBtn.addEventListener('click', async function () {
        if (!window.confirm('¿Eliminar TODOS los cobros y pedidos marcados como prueba (incl. sandbox)?')) return;
        purgeTestsBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'Borrando pruebas…';
        try {
          var out = await deleteTestPays();
          if (statusEl) {
            statusEl.textContent = 'Eliminados: ' + out.cobros + ' cobros · ' + out.pedidos + ' pedidos';
          }
          await refresh();
        } catch (err) {
          if (statusEl) statusEl.textContent = err.message || 'No se pudieron borrar las pruebas.';
        } finally {
          purgeTestsBtn.disabled = false;
        }
      });
    }
    if (ledgerEl) {
      ledgerEl.addEventListener('click', async function (e) {
        var delBtn = e.target.closest('[data-pay-delete]');
        var testBtn = e.target.closest('[data-pay-test]');
        if (!delBtn && !testBtn) return;
        e.preventDefault();
        e.stopPropagation();
        var id = (delBtn || testBtn).getAttribute(delBtn ? 'data-pay-delete' : 'data-pay-test');
        if (!id) return;
        var row = (cache.cobros || []).find(function (r) { return r.id === id; });
        try {
          if (delBtn) {
            if (!window.confirm('¿Eliminar este cobro de Contabilidad?')) return;
            delBtn.disabled = true;
            await deleteCobro(id);
            if (statusEl) statusEl.textContent = 'Cobro eliminado.';
          } else {
            testBtn.disabled = true;
            var next = !(row && looksLikeTestPay(row));
            await setCobroTestFlag(id, next);
            if (statusEl) statusEl.textContent = next ? 'Marcado como prueba.' : 'Ya no es prueba.';
          }
          await refresh();
        } catch (err) {
          if (statusEl) statusEl.textContent = err.message || 'No se pudo actualizar.';
          if (delBtn) delBtn.disabled = false;
          if (testBtn) testBtn.disabled = false;
        }
      });
    }
    if (exportBtn) {
      exportBtn.addEventListener('click', async function () {
        var month = monthEl.value || currentMonthKey();
        var rows = accountingRows(month).slice().sort(function (a, b) {
          return new Date(cobroWhen(b)) - new Date(cobroWhen(a));
        });
        var paid = rows.filter(isPaidCobro);
        var open = rows.filter(isOpenCobro);
        var bruto = paid.reduce(function (s, r) { return s + (Number(r.amount_cents) || 0); }, 0);
        var fee = paid.reduce(function (s, r) { return s + estimateFeeCents(r.amount_cents); }, 0);
        var hunter = paid.reduce(function (s, r) { return s + estimateHunterCents(r.amount_cents); }, 0);
        var pendiente = open.reduce(function (s, r) { return s + (Number(r.amount_cents) || 0); }, 0);
        (cache.pedidos || []).forEach(function (p) {
          if (hideTestsOn() && looksLikeTestPay(p)) return;
          if (p.status === 'en_produccion' || p.status === 'pendiente_entrega') {
            pendiente += Number(p.balance_cents) || 0;
          } else if (p.status === 'pendiente_anticipo') {
            pendiente += Number(p.deposit_cents) || 0;
          }
        });
        exportBtn.disabled = true;
        var prev = exportBtn.textContent;
        exportBtn.textContent = 'Generando PDF…';
        if (statusEl) statusEl.textContent = 'Preparando informe…';
        try {
          var canvas = await buildAccountingCanvas({
            monthLabel: monthLabel(month),
            kpis: {
              bruto: moneyFromCents(bruto),
              neto: moneyFromCents(Math.max(0, bruto - fee)),
              hunter: moneyFromCents(hunter),
              pendiente: moneyFromCents(pendiente)
            },
            rows: rows.map(function (r) {
              var when = cobroWhen(r);
              var client = String(r.customer_name || r.customer_email || 'Cobro').trim();
              if (client.length > 28) client = client.slice(0, 27) + '…';
              return {
                when: when ? new Date(when).toLocaleDateString('es-ES', {
                  day: '2-digit', month: 'short'
                }) : '—',
                client: client,
                stage: stageLabel(r.payment_stage || (r.metadata && r.metadata.stage)),
                status: statusLabel(r.status),
                amount: moneyFromCents(r.amount_cents)
              };
            })
          });
          var jpeg = canvas.toDataURL('image/jpeg', 0.96);
          var pdf = createSinglePagePdf(jpeg, canvas);
          downloadBlob(pdf, 'Contabilidad_' + month + '.pdf');
          if (statusEl) statusEl.textContent = 'PDF descargado.';
        } catch (err) {
          if (statusEl) statusEl.textContent = err.message || 'No se pudo generar el PDF.';
        } finally {
          exportBtn.disabled = false;
          exportBtn.textContent = prev || 'Descargar PDF';
        }
      });
    }

    refresh();
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
    openCheckout: openCheckout,
    productId: PRODUCT_REF,
    clientToken: CLIENT_TOKEN
  };
  window.PreventaPaddle = window.PanelPaddle;

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
