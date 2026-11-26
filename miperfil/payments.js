/**
 * Mi perfil — Pagos: proyectos plegables, pagar entrega/anticipo, solicitar otro pago.
 */
(function () {
  var euro = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  var state = { pedidos: [], email: '', name: '' };
  var EXTRA_KEY = 'boxiesExtraPayRequests';

  function $(id) { return document.getElementById(id); }

  function escapeHtml(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function money(cents) {
    return euro.format((Number(cents) || 0) / 100);
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

  function statusLabel(s) {
    s = String(s || '').toLowerCase();
    if (s === 'pendiente_anticipo') return 'Anticipo pendiente';
    if (s === 'en_produccion') return 'En producción';
    if (s === 'pendiente_entrega') return 'Entrega pendiente';
    if (s === 'pagado') return 'Pagado';
    if (s === 'cancelado') return 'Cancelado';
    return s || '—';
  }

  function readExtraMap() {
    try {
      return JSON.parse(localStorage.getItem(EXTRA_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function writeExtraMap(map) {
    try { localStorage.setItem(EXTRA_KEY, JSON.stringify(map || {})); } catch (e) {}
  }

  function extraPending(pedidoId) {
    var row = readExtraMap()[pedidoId];
    return !!(row && row.status === 'pending_confirmation');
  }

  function markExtraPending(pedidoId, label) {
    var map = readExtraMap();
    map[pedidoId] = {
      status: 'pending_confirmation',
      label: label || '',
      requested_at: new Date().toISOString()
    };
    writeExtraMap(map);
  }

  function render() {
    var list = $('paysList');
    if (!list) return;
    if (!state.pedidos.length) {
      list.innerHTML =
        '<p class="desc">Todavía no hay proyectos contratados. Cuando pagues un anticipo, aparecerán aquí.</p>';
      return;
    }

    list.innerHTML = state.pedidos.map(function (p, i) {
      var st = String(p.status || '').toLowerCase();
      var depositDone = st === 'en_produccion' || st === 'pendiente_entrega' || st === 'pagado';
      var balanceDone = st === 'pagado';
      var canDeposit = st === 'pendiente_anticipo';
      var canBalance = st === 'en_produccion' || st === 'pendiente_entrega';
      var open = i === 0 ? ' open' : '';
      var extraOn = extraPending(p.id);

      var actions = '';
      if (canDeposit) {
        actions +=
          '<button type="button" class="btn primary" data-pay-stage="deposit" data-pedido-id="' +
          escapeHtml(p.id) + '">Pagar anticipo · ' + escapeHtml(money(p.deposit_cents)) + '</button>';
      }
      if (canBalance) {
        actions +=
          '<button type="button" class="btn primary" data-pay-stage="balance" data-pedido-id="' +
          escapeHtml(p.id) + '">Pagar entrega (50% restante) · ' +
          escapeHtml(money(p.balance_cents)) + '</button>';
      }
      if (balanceDone && depositDone) {
        actions += '<p class="desc pay-done-note">Anticipo y entrega al día.</p>';
      }
      if (extraOn) {
        actions +=
          '<div class="pay-extra is-pending">' +
            '<span class="pay-extra-status">Otro pago · Pendiente de confirmación</span>' +
            '<p class="desc">El equipo te enviará el enlace cuando lo revise.</p>' +
          '</div>';
      } else {
        actions +=
          '<button type="button" class="btn" data-extra-pay="' + escapeHtml(p.id) +
          '">Realizar otro pago</button>' +
          '<p class="desc pay-extra-hint">Para extras o excedentes. Queda pendiente hasta que admin confirme el cobro.</p>';
      }

      return (
        '<details class="pay-project"' + open + ' data-pedido-id="' + escapeHtml(p.id) + '">' +
          '<summary>' +
            '<span class="pay-project-title">' + escapeHtml(p.proyecto_label || 'Showroom') + '</span>' +
            '<span class="pay-project-meta">' + escapeHtml(statusLabel(st)) +
              ' · ' + escapeHtml(money(p.quote_total_cents)) + '</span>' +
            '<span class="accordion-chevron">＋</span>' +
          '</summary>' +
          '<div class="pay-project-body">' +
            '<div class="pay-split">' +
              '<div class="pay-split-card' + (depositDone ? ' is-done' : '') + '">' +
                '<small>Anticipo 50%</small><strong>' + escapeHtml(money(p.deposit_cents)) + '</strong>' +
                '<span>' + (depositDone ? 'Pagado' : 'Pendiente') + '</span>' +
              '</div>' +
              '<div class="pay-split-card' + (balanceDone ? ' is-done' : '') + '">' +
                '<small>Entrega 50%</small><strong>' + escapeHtml(money(p.balance_cents)) + '</strong>' +
                '<span>' + (balanceDone ? 'Pagado' : 'Restante') + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="pay-actions">' + actions + '</div>' +
            '<p class="desc pay-status" data-pay-status="' + escapeHtml(p.id) + '"></p>' +
          '</div>' +
        '</details>'
      );
    }).join('');
  }

  async function createCheckout(pedido, stage) {
    var sb = client();
    var session = await sb.auth.getSession();
    var token = session && session.data && session.data.session && session.data.session.access_token;
    var headers = {
      'Content-Type': 'application/json',
      apikey: anonKey()
    };
    if (token) headers.Authorization = 'Bearer ' + token;
    else headers.Authorization = 'Bearer ' + anonKey();

    var res = await fetch(functionsBase() + '/paddle-create-checkout', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        stage: stage,
        pedido_id: pedido.id,
        customer_name: state.name || pedido.customer_name || '',
        customer_email: state.email || pedido.customer_email || '',
        proyecto_label: pedido.proyecto_label || 'Showroom 360Preventa',
        quote_total_euros: (Number(pedido.quote_total_cents) || 0) / 100,
        quote_snapshot: pedido.quote_snapshot || undefined,
        source: 'miperfil',
        is_test: !!pedido.is_test
      })
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error(data.error || data.message || ('Error ' + res.status));
    return data;
  }

  function openCheckout(transactionId, email, stage) {
    var q = new URLSearchParams();
    q.set('txn', String(transactionId || ''));
    if (email) q.set('email', String(email));
    if (stage) q.set('stage', String(stage));
    window.location.assign('/pagos/?' + q.toString());
  }

  async function stashDepositWelcome() {
    if (!window.ClientAccount || typeof ClientAccount.stashWelcome !== 'function') return;
    try {
      var sb = client();
      var session = await sb.auth.getSession();
      var user = session && session.data && session.data.session && session.data.session.user;
      if (!user) return;
      var email = String(user.email || state.email || '').toLowerCase();
      var prof = await sb.from('profiles')
        .select('nombre_visible,nombre,telefono')
        .eq('id', user.id)
        .maybeSingle();
      var name = String(
        (prof.data && (prof.data.nombre_visible || prof.data.nombre)) ||
        state.name ||
        (email ? email.split('@')[0] : 'Cliente')
      ).trim();
      var phone = String(
        (prof.data && prof.data.telefono) ||
        (user.user_metadata && (user.user_metadata.telefono || user.user_metadata.phone)) ||
        ''
      );
      var password = ClientAccount.phonePassword(phone);
      ClientAccount.stashWelcome({
        name: name,
        email: email,
        phone: phone,
        password: password,
        password_masked: ClientAccount.maskPassword(password || phone),
        portal: '/miperfil/',
        created_at: new Date().toISOString(),
        stage: 'deposit'
      });
    } catch (e) {
      console.warn('[pays] stash welcome', e);
    }
  }

  async function payStage(pedidoId, stage, btn) {
    var pedido = state.pedidos.find(function (p) { return p.id === pedidoId; });
    if (!pedido) return;
    var statusEl = document.querySelector('[data-pay-status="' + pedidoId + '"]');
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = 'Preparando checkout…';
    try {
      if (stage === 'deposit') await stashDepositWelcome();
      var data = await createCheckout(pedido, stage);
      if (!data.transaction_id) throw new Error('Sin transaction_id');
      if (statusEl) statusEl.textContent = 'Abriendo pago…';
      openCheckout(data.transaction_id, state.email || pedido.customer_email, stage);
    } catch (err) {
      if (statusEl) statusEl.textContent = (err && err.message) || 'No se pudo iniciar el pago';
      if (btn) btn.disabled = false;
    }
  }

  async function requestExtra(pedidoId, btn) {
    var pedido = state.pedidos.find(function (p) { return p.id === pedidoId; });
    if (!pedido) return;
    if (!window.confirm('¿Solicitar otro pago (extra / excedente) para “' +
      (pedido.proyecto_label || 'este proyecto') + '”?\nQuedará pendiente de confirmación del equipo.')) {
      return;
    }
    if (btn) btn.disabled = true;
    markExtraPending(pedidoId, pedido.proyecto_label);
    try {
      if (window.BoxiesClientChat && typeof BoxiesClientChat.send === 'function') {
        await BoxiesClientChat.send(
          'Solicita otro pago (extra/excedente) para: ' + (pedido.proyecto_label || 'proyecto'),
          true
        );
      }
    } catch (e) {
      console.warn('[pays] notify', e);
    }
    render();
  }

  async function load() {
    var list = $('paysList');
    if (list) list.innerHTML = '<p class="desc">Cargando proyectos…</p>';
    try {
      var sb = client();
      var session = await sb.auth.getSession();
      var user = session && session.data && session.data.session && session.data.session.user;
      if (!user) throw new Error('Sesión expirada.');
      state.email = String(user.email || '').toLowerCase();
      state.name = String(
        (user.user_metadata && (user.user_metadata.nombre || user.user_metadata.name)) || ''
      ).trim();

      var pedRes = await sb
        .from('panel_pedidos')
        .select('id,customer_name,customer_email,proyecto_label,status,quote_total_cents,deposit_cents,balance_cents,quote_snapshot,is_test,created_at')
        .eq('customer_email', state.email)
        .order('created_at', { ascending: false })
        .limit(40);
      if (pedRes.error) throw pedRes.error;
      state.pedidos = pedRes.data || [];
      if (!state.name && state.pedidos[0]) {
        state.name = state.pedidos[0].customer_name || '';
      }
      render();
    } catch (err) {
      if (list) {
        list.innerHTML = '<p class="desc miperfil-error">' + escapeHtml(err.message || 'Error') + '</p>';
      }
    }
  }

  function bind() {
    var list = $('paysList');
    if (list && !list.dataset.bound) {
      list.dataset.bound = '1';
      list.addEventListener('click', function (e) {
        var payBtn = e.target.closest('[data-pay-stage]');
        if (payBtn) {
          e.preventDefault();
          payStage(
            payBtn.getAttribute('data-pedido-id'),
            payBtn.getAttribute('data-pay-stage'),
            payBtn
          );
          return;
        }
        var extraBtn = e.target.closest('[data-extra-pay]');
        if (extraBtn) {
          e.preventDefault();
          requestExtra(extraBtn.getAttribute('data-extra-pay'), extraBtn);
        }
      });
    }
    var headerBtn = $('payHeaderBtn');
    if (headerBtn && !headerBtn.dataset.bound) {
      headerBtn.dataset.bound = '1';
      headerBtn.addEventListener('click', function () {
        if (typeof window.BoxiesMiPerfilShowPays === 'function') {
          window.BoxiesMiPerfilShowPays();
        }
      });
    }
  }

  function setHeaderVisible(on) {
    var btn = $('payHeaderBtn');
    if (!btn) return;
    btn.classList.toggle('portal-hidden', !on);
  }

  window.BoxiesMiPerfilPays = {
    load: load,
    bind: bind,
    setHeaderVisible: setHeaderVisible,
    reload: load
  };
})();
