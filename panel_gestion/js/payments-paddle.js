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
    var balanceDone = status === 'pagado';
    if (depBtn) {
      depBtn.disabled = !!depositDone;
      depBtn.style.display = depositDone ? 'none' : '';
      if (!depositDone) {
        depBtn.textContent = 'Contratar · anticipo ' + moneyFromCents(parts.deposit);
      } else if (!balanceDone && balBtn) {
        // Entrega solo cuando el anticipo ya está pagado
        balBtn.hidden = false;
        balBtn.style.display = '';
        balBtn.disabled = false;
        balBtn.textContent = 'Pagar entrega ' + moneyFromCents(parts.balance);
      }
    }
    if (balBtn && !depositDone) {
      balBtn.hidden = true;
      balBtn.style.display = 'none';
      balBtn.disabled = true;
    }
    if (balBtn && balanceDone) {
      balBtn.disabled = true;
      balBtn.style.display = 'none';
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
      pedido_id: row.pedido_id || undefined
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

  function bindQuotesPanel(root) {
    var search = root.querySelector('[data-quote-search]');
    var sortEl = root.querySelector('[data-quote-sort]');
    var list = root.querySelector('[data-quote-list]');
    var status = root.querySelector('[data-quote-status]');
    var hideTests = root.querySelector('[data-quote-hide-tests]');
    var purgeTests = root.querySelector('[data-quote-purge-tests]');
    if (!list || !window.PreventaQuotes) return;

    async function refresh() {
      list.innerHTML = '<p class="desc">Cargando cotizaciones…</p>';
      if (status) status.textContent = '';
      try {
        var sort = sortEl && sortEl.value === 'oldest' ? 'oldest' : 'newest';
        var rows = await PreventaQuotes.listQuotes({
          query: search ? search.value : '',
          hideTests: !!(hideTests && hideTests.checked),
          sort: sort
        });
        if (!rows.length) {
          list.innerHTML = '<p class="desc">Sin cotizaciones. Se crean al descargar el PDF.</p>';
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
          var when = r.created_at ? new Date(r.created_at).toLocaleString('es-ES') : '';
          var title = String(r.customer_name || '').trim() || String(r.customer_email || '').trim() || 'Sin nombre';
          var time = quoteTimeLabel(r.created_at);
          var metaBits = [
            r.customer_email || '',
            r.customer_phone || '',
            r.customer_country || '',
            r.proyecto_label || '',
            when
          ].filter(Boolean).map(escapeHtml);
          html += (
            '<details class="quote-crm-row" data-quote-id="' + escapeHtml(r.id) + '">' +
              '<summary class="quote-crm-row-summary">' +
                '<span class="quote-crm-row-title">' + escapeHtml(title) + '</span>' +
                (time ? '<span class="quote-crm-row-time">' + escapeHtml(time) + '</span>' : '') +
                '<span class="quote-crm-row-chevron" aria-hidden="true"></span>' +
              '</summary>' +
              '<div class="quote-crm-row-body">' +
                '<div class="quote-crm-row-meta">' +
                  (r.is_test ? '<span class="quote-crm-test-tag">prueba</span>' : '') +
                  '<small class="muted">' + metaBits.join(' · ') + '</small>' +
                  '<b class="quote-crm-row-amount">' + moneyFromCents(r.total_cents) + '</b>' +
                '</div>' +
                '<div class="quote-crm-row-actions">' +
                  '<button type="button" class="btn primary" data-quote-charge="deposit">Cobrar</button>' +
                  '<button type="button" class="btn" data-quote-open="1"' + (r.last_checkout_url ? '' : ' disabled') + '>Link</button>' +
                  '<button type="button" class="btn" data-quote-test="1">' + (r.is_test ? 'No prueba' : 'Prueba') + '</button>' +
                  '<button type="button" class="btn" data-quote-delete="1">Borrar</button>' +
                '</div>' +
              '</div>' +
            '</details>'
          );
        });
        list.innerHTML = html;

        if (hideTests && hideTests.checked && !rows.length) {
          if (status) status.textContent = 'Solo hay pruebas. Desmarca el filtro o bórralas.';
        }

        list.querySelectorAll('.quote-crm-row').forEach(function (el) {
          var id = el.getAttribute('data-quote-id');
          var row = rows.find(function (x) { return x.id === id; });
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
    var meta = row && row.metadata;
    if (meta && (meta.is_test === true || meta.is_test === 'true')) return true;
    var blob = [
      row && row.customer_email,
      row && row.customer_name,
      row && row.concepto,
      row && row.proyecto_label
    ].join(' ').toLowerCase();
    return /\b(test|prueba|testing|demo|asdf|testeo)\b/i.test(blob);
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

  function csvEscape(v) {
    var s = String(v == null ? '' : v);
    if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadCsv(filename, rows) {
    var csv = rows.map(function (line) {
      return line.map(csvEscape).join(';');
    }).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function renderPanel(root) {
    root.innerHTML =
      '<div class="panel-pay-stripe panel-pay-paddle">' +
        '<section class="pay-books" data-pay-books>' +
          '<div class="pay-books-head">' +
            '<div>' +
              '<div class="eyebrow">CONTABILIDAD</div>' +
              '<p class="desc pay-books-lead">Ingresos reales del mes · solo cobros confirmados</p>' +
            '</div>' +
            '<div class="pay-books-controls">' +
              '<label class="quote-crm-sort-label">Mes<select data-pay-month></select></label>' +
              '<button type="button" class="btn" data-pay-export>Exportar CSV</button>' +
            '</div>' +
          '</div>' +
          '<div class="pay-kpi-grid" data-pay-kpis></div>' +
          '<div class="eyebrow pay-ledger-eyebrow">LIBRO DEL MES</div>' +
          '<div class="pay-ledger" data-pay-ledger><p class="desc">Cargando…</p></div>' +
          '<p class="desc pay-books-note" data-pay-note></p>' +
        '</section>' +

        '<details class="quote-crm-activity pay-section-fold" open>' +
          '<summary><h3>Cotizaciones</h3><span class="pay-fold-hint">pipeline comercial</span></summary>' +
          '<div class="portal-form quote-crm-toolbar">' +
            '<label>Buscar<input type="search" data-quote-search placeholder="Nombre o email…" autocomplete="off"></label>' +
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
        '</details>' +

        '<details class="quote-crm-activity pay-section-fold">' +
          '<summary><h3>Pedidos en curso</h3><span class="pay-fold-hint">anticipo / entrega</span></summary>' +
          '<div data-pay-pedidos><p class="desc">Cargando…</p></div>' +
        '</details>' +
      '</div>';
    bindQuotesPanel(root);
    bindAccountingPanel(root);
  }

  function bindAccountingPanel(root) {
    var monthEl = root.querySelector('[data-pay-month]');
    var kpisEl = root.querySelector('[data-pay-kpis]');
    var ledgerEl = root.querySelector('[data-pay-ledger]');
    var noteEl = root.querySelector('[data-pay-note]');
    var exportBtn = root.querySelector('[data-pay-export]');
    var pedidosEl = root.querySelector('[data-pay-pedidos]');
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

    function accountingRows(month) {
      return (cache.cobros || []).filter(function (r) {
        if (looksLikeTestPay(r)) return false;
        if (!(r.provider === 'paddle' || r.paddle_transaction_id || r.provider === 'stripe' || !r.provider)) {
          return false;
        }
        return monthKeyFromIso(cobroWhen(r)) === month;
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

      // Entregas aún no cobradas de pedidos ya en producción
      (cache.pedidos || []).forEach(function (p) {
        if (looksLikeTestPay(p)) return;
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
        if (noteEl) noteEl.textContent = 'Cuando un checkout Paddle se confirme, aparecerá aquí automáticamente.';
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
          var stage = stageLabel(r.payment_stage || (r.metadata && r.metadata.stage));
          var fee = estimateFeeCents(r.amount_cents);
          var stateClass = isPaidCobro(r) ? 'is-paid' : (isOpenCobro(r) ? 'is-open' : 'is-other');
          return (
            '<details class="quote-crm-row pay-ledger-row ' + stateClass + '">' +
              '<summary class="quote-crm-row-summary">' +
                '<span class="quote-crm-row-title">' + escapeHtml(r.customer_email || r.proyecto_label || 'Cobro') + '</span>' +
                '<span class="quote-crm-row-time">' + escapeHtml(day) + '</span>' +
                '<span class="pay-ledger-amount">' + moneyFromCents(r.amount_cents) + '</span>' +
                '<span class="quote-crm-row-chevron" aria-hidden="true"></span>' +
              '</summary>' +
              '<div class="quote-crm-row-body">' +
                '<div class="quote-crm-row-meta">' +
                  '<small class="muted">' +
                    escapeHtml(stage) + ' · ' + escapeHtml(statusLabel(r.status)) +
                    (r.proyecto_label ? ' · ' + escapeHtml(r.proyecto_label) : '') +
                    (r.concepto ? ' · ' + escapeHtml(r.concepto) : '') +
                  '</small>' +
                  '<small class="muted">Fee est. ' + moneyFromCents(fee) +
                    ' · Neto est. ' + moneyFromCents(Math.max(0, (Number(r.amount_cents) || 0) - fee)) +
                    ' · Hunter ' + moneyFromCents(estimateHunterCents(r.amount_cents)) +
                  '</small>' +
                  (r.paddle_transaction_id
                    ? '<small class="muted">Txn ' + escapeHtml(r.paddle_transaction_id) + '</small>'
                    : '') +
                '</div>' +
              '</div>' +
            '</details>'
          );
        }).join('') +
        '</div>';

      if (noteEl) {
        noteEl.textContent = 'Fee e IVA son estimados hasta reconciliar con el payout de Paddle. Las pruebas no entran en contabilidad.';
      }
    }

    function renderPedidos() {
      if (!pedidosEl) return;
      var rows = (cache.pedidos || []).filter(function (p) {
        return !looksLikeTestPay(p);
      });
      if (!rows.length) {
        pedidosEl.innerHTML = '<p class="desc">Sin pedidos todavía.</p>';
        return;
      }
      pedidosEl.innerHTML =
        '<div class="portal-list">' +
        rows.map(function (p) {
          return (
            '<div class="portal-list-item quote-pay-pedido">' +
              '<span><b>' + escapeHtml(p.proyecto_label || p.customer_name || 'Pedido') + '</b>' +
              '<small class="muted">' + escapeHtml(p.customer_email || '') + ' · ' + statusLabel(p.status) + '</small></span>' +
              '<span style="text-align:right"><b>' + moneyFromCents(p.quote_total_cents) + '</b>' +
              '<small class="muted">Anticipo ' + moneyFromCents(p.deposit_cents) +
                ' · Entrega ' + moneyFromCents(p.balance_cents) + '</small></span>' +
            '</div>'
          );
        }).join('') +
        '</div>';
    }

    function paint() {
      var month = monthEl.value || currentMonthKey();
      cache.month = month;
      renderKpis(month);
      renderLedger(month);
      renderPedidos();
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
        if (pedidosEl) pedidosEl.innerHTML = '<div class="portal-note">' + escapeHtml(err.message) + '</div>';
      }
    }

    monthEl.addEventListener('change', paint);
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var month = monthEl.value || currentMonthKey();
        var rows = accountingRows(month).slice().sort(function (a, b) {
          return new Date(cobroWhen(b)) - new Date(cobroWhen(a));
        });
        var lines = [[
          'fecha', 'email', 'concepto', 'etapa', 'estado', 'bruto_eur', 'fee_est_eur', 'neto_est_eur', 'hunter_eur', 'txn'
        ]];
        rows.forEach(function (r) {
          var amount = Number(r.amount_cents) || 0;
          var fee = estimateFeeCents(amount);
          lines.push([
            cobroWhen(r) || '',
            r.customer_email || '',
            r.concepto || r.proyecto_label || '',
            stageLabel(r.payment_stage || (r.metadata && r.metadata.stage)),
            r.status || '',
            (amount / 100).toFixed(2),
            (fee / 100).toFixed(2),
            (Math.max(0, amount - fee) / 100).toFixed(2),
            (estimateHunterCents(amount) / 100).toFixed(2),
            r.paddle_transaction_id || ''
          ]);
        });
        downloadCsv('contabilidad-' + month + '.csv', lines);
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
