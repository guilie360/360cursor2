/**
 * Mi perfil — espacio cliente (chrome del panel).
 */
(function () {
  var loginView = document.getElementById('loginView');
  var homeView = document.getElementById('homeView');
  var logoutBtn = document.getElementById('logoutBtn');
  var errEl = document.getElementById('loginError');
  var goalCaption = document.getElementById('hunterGoalCaption');
  var goalBonus = document.getElementById('hunterGoalBonus');
  var goalTrack = document.getElementById('hunterGoalTrack');
  var goalFill = document.getElementById('hunterGoalFill');

  function $(id) { return document.getElementById(id); }

  function setAuthChrome(on) {
    document.body.classList.toggle('workspace-authenticated', !!on);
    document.body.classList.toggle('nav-panel-authed', !!on);
  }

  function setFooterProgress(pct, caption, bonusLabel, bonusValue) {
    var p = Math.max(0, Math.min(100, Number(pct) || 0));
    if (goalTrack) {
      goalTrack.style.setProperty('--goal-step', p + '%');
      goalTrack.setAttribute('aria-valuenow', String(p));
    }
    if (goalFill) goalFill.style.width = p + '%';
    if (goalCaption) goalCaption.textContent = caption || 'Mi perfil · avance';
    if (goalBonus) {
      goalBonus.innerHTML = '<small>' + (bonusLabel || 'Estado') + '</small>' + (bonusValue || '—');
    }
  }

  function money(cents) {
    var n = Number(cents || 0) / 100;
    try {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
      }).format(n);
    } catch (e) {
      return n.toFixed(0) + ' €';
    }
  }

  function statusLabel(s) {
    s = String(s || '').toLowerCase();
    if (s === 'pendiente_anticipo') return 'Pendiente de anticipo';
    if (s === 'en_produccion' || s === 'pendiente_entrega') return 'En producción';
    if (s === 'pagado') return 'Entregado / pagado';
    if (s === 'cancelado') return 'Cancelado';
    return s || 'Sin pedido aún';
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
    throw new Error('No se pudo conectar con la cuenta.');
  }

  function showLogin() {
    setAuthChrome(false);
    if (loginView) loginView.classList.remove('portal-hidden');
    if (homeView) homeView.classList.add('portal-hidden');
    setFooterProgress(0, 'Mi perfil · 360Preventa', 'Acceso', 'Cliente');
  }

  function showHome() {
    setAuthChrome(true);
    if (loginView) loginView.classList.add('portal-hidden');
    if (homeView) homeView.classList.remove('portal-hidden');
  }

  function footerFromPedido(ped) {
    var st = String((ped && ped.status) || '').toLowerCase();
    if (!ped) {
      setFooterProgress(0, 'Proyecto · sin pedido', 'Estado', 'Pendiente');
      return;
    }
    if (st === 'pagado') {
      setFooterProgress(100, 'Proyecto · entregado', 'Estado', 'Completo');
      return;
    }
    if (st === 'en_produccion' || st === 'pendiente_entrega') {
      setFooterProgress(50, 'Proyecto · en producción', 'Estado', 'Anticipo');
      return;
    }
    if (st === 'pendiente_anticipo') {
      setFooterProgress(25, 'Proyecto · anticipo', 'Estado', 'Pendiente');
      return;
    }
    setFooterProgress(35, 'Proyecto · en curso', 'Estado', statusLabel(st));
  }

  async function loadHome(user) {
    showHome();
    var email = (user && user.email) || '';

    var welcomeTitle = $('welcomeTitle');
    var welcomeLead = $('welcomeLead');
    var params = new URLSearchParams(location.search || '');
    var nameHint = email ? email.split('@')[0] : '';
    if (welcomeTitle) welcomeTitle.textContent = nameHint ? ('Hola, ' + nameHint) : 'Hola';
    if (welcomeLead) {
      welcomeLead.textContent = params.get('bienvenida') === '1'
        ? 'Pago recibido. Este es tu espacio: aquí verás el avance de tu showroom.'
        : 'Aquí ves el estado de tu proyecto y los siguientes pasos.';
    }

    var sb = client();
    try {
      var pedidos = await sb.from('panel_pedidos').select('*').order('created_at', { ascending: false }).limit(5);
      var ped = (pedidos.data && pedidos.data[0]) || null;
      if ($('pedidoStatus')) $('pedidoStatus').textContent = statusLabel(ped && ped.status);
      if ($('pedidoLabel')) {
        $('pedidoLabel').textContent = ped
          ? (ped.proyecto_label || 'Showroom 360Preventa')
          : 'Todavía no hay un pedido con este correo. Si acabas de cotizar, descarga el PDF o completa el anticipo.';
      }
      if ($('pedidoMoney')) {
        $('pedidoMoney').textContent = ped
          ? ('Total ' + money(ped.quote_total_cents || ped.total_cents) + ' · Anticipo ' + money(ped.deposit_cents))
          : '';
      }
      footerFromPedido(ped);
    } catch (e) {
      if ($('pedidoLabel')) $('pedidoLabel').textContent = 'No se pudo cargar el pedido.';
      setFooterProgress(0, 'Proyecto · sin datos', 'Estado', '—');
    }

    try {
      var quotes = await sb
        .from('panel_cotizaciones')
        .select('id,customer_name,proyecto_label,total_euros,created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      var box = $('quotesList');
      var rows = quotes.data || [];
      if (!box) return;
      if (!rows.length) {
        box.textContent = 'Aún no hay cotizaciones guardadas con este correo.';
      } else {
        box.innerHTML = rows.map(function (q) {
          return (
            '<div class="miperfil-quote-row">' +
              '<span>' + (q.proyecto_label || 'Cotización') +
                '<br><small>' + new Date(q.created_at).toLocaleDateString('es-ES') + '</small>' +
              '</span>' +
              '<strong>' + (Number(q.total_euros) || 0).toLocaleString('es-ES') + ' €</strong>' +
            '</div>'
          );
        }).join('');
      }
    } catch (e2) {
      if ($('quotesList')) $('quotesList').textContent = 'No se pudieron cargar las cotizaciones.';
    }
  }

  async function boot() {
    showLogin();
    try {
      var sb = client();
      var session = await sb.auth.getSession();
      var user = session && session.data && session.data.session && session.data.session.user;
      if (!user) return;

      var prof = await sb.from('profiles').select('rol,nombre_visible').eq('id', user.id).maybeSingle();
      var rol = String((prof.data && prof.data.rol) || '').toLowerCase();
      if (rol === 'admin' || rol === 'super_admin' || rol === 'hunter' || rol === 'asesor') {
        location.replace('/panel_gestion/');
        return;
      }
      if (prof.data && prof.data.nombre_visible && $('welcomeTitle')) {
        /* se pinta en loadHome */
      }
      await loadHome(user);
    } catch (err) {
      console.warn('[miperfil] boot', err);
      showLogin();
      if (errEl) errEl.textContent = '';
    }
  }

  var form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (errEl) errEl.textContent = '';
      var email = ($('email').value || '').trim().toLowerCase();
      var phone = ($('password').value || '').trim();
      var password = (window.ClientAccount && ClientAccount.phonePassword)
        ? ClientAccount.phonePassword(phone)
        : phone.replace(/\D/g, '');
      try {
        var sb = client();
        var result = await sb.auth.signInWithPassword({ email: email, password: password });
        if (result.error) throw result.error;
        await loadHome(result.data.user);
      } catch (err) {
        if (errEl) errEl.textContent = (err && err.message) || 'No se pudo entrar. Revisa correo y celular.';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      try {
        var sb = client();
        await sb.auth.signOut();
      } catch (e) {}
      location.href = '/miperfil/';
    });
  }

  boot();
})();
