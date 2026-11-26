/**
 * Mi perfil — home panel-style + Mi información.
 */
(function () {
  var loginView = document.getElementById('loginView');
  var homeView = document.getElementById('homeView');
  var infoView = document.getElementById('infoView');
  var docsView = document.getElementById('docsView');
  var paysView = document.getElementById('paysView');
  var logoutBtn = document.getElementById('logoutBtn');
  var portalBack = document.getElementById('portalBack');
  var payHeaderBtn = document.getElementById('payHeaderBtn');
  var errEl = document.getElementById('loginError');
  var goalCaption = document.getElementById('hunterGoalCaption');
  var goalBonus = document.getElementById('hunterGoalBonus');
  var goalTrack = document.getElementById('hunterGoalTrack');
  var goalFill = document.getElementById('hunterGoalFill');
  var currentUser = null;

  function $(id) { return document.getElementById(id); }

  function setAuthChrome(on) {
    document.body.classList.toggle('workspace-authenticated', !!on);
    document.body.classList.toggle('nav-panel-authed', !!on);
  }

  function setFooterProgress(pct, caption, bonusLabel, bonusValue) {
    var p = Math.max(0, Math.min(100, Number(pct) || 0));
    p = Math.round(p / 5) * 5;
    if (goalTrack) {
      goalTrack.style.setProperty('--goal-step', p + '%');
      goalTrack.setAttribute('aria-valuenow', String(p));
    }
    if (goalFill) goalFill.style.width = p + '%';
    if (goalCaption) goalCaption.textContent = caption || 'Mi perfil · avance';
    if (goalBonus) {
      goalBonus.innerHTML = '<small>' + (bonusLabel || 'Etapa') + '</small>' + (bonusValue || '—');
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
    throw new Error('No se pudo conectar con la cuenta.');
  }

  function setClientName(name) {
    var n = String(name || '').trim();
    try {
      if (n) document.body.dataset.clientName = n;
      else delete document.body.dataset.clientName;
    } catch (e) {}
    try {
      if (n) sessionStorage.setItem('boxiesClientName', n);
      else sessionStorage.removeItem('boxiesClientName');
    } catch (e2) {}
    try {
      if (window.BoxiesGlobalNav && typeof window.BoxiesGlobalNav.refresh === 'function') {
        window.BoxiesGlobalNav.refresh();
      }
    } catch (e3) {}
  }

  function hideAll() {
    [loginView, homeView, infoView, docsView, paysView].forEach(function (el) {
      if (el) el.classList.add('portal-hidden');
    });
  }

  function setPayHeader(on) {
    try {
      if (window.BoxiesMiPerfilPays) BoxiesMiPerfilPays.setHeaderVisible(!!on);
      else if (payHeaderBtn) payHeaderBtn.classList.toggle('portal-hidden', !on);
    } catch (e) {}
  }

  function showLogin() {
    setAuthChrome(false);
    setClientName('');
    setPayHeader(false);
    hideAll();
    if (loginView) loginView.classList.remove('portal-hidden');
    if (portalBack) portalBack.classList.add('portal-hidden');
    setFooterProgress(0, 'Mi perfil · 360Preventa', 'Acceso', 'Cliente');
  }

  function showHome() {
    setAuthChrome(true);
    setPayHeader(true);
    hideAll();
    if (homeView) homeView.classList.remove('portal-hidden');
    if (portalBack) portalBack.classList.add('portal-hidden');
    try {
      if (window.BoxiesMiPerfilPays && typeof BoxiesMiPerfilPays.refreshHeader === 'function') {
        BoxiesMiPerfilPays.refreshHeader();
      }
    } catch (e) {}
  }

  function showInfo() {
    setAuthChrome(true);
    setPayHeader(true);
    hideAll();
    if (infoView) infoView.classList.remove('portal-hidden');
    if (portalBack) portalBack.classList.remove('portal-hidden');
  }

  function showDocs() {
    setAuthChrome(true);
    setPayHeader(true);
    hideAll();
    if (docsView) docsView.classList.remove('portal-hidden');
    if (portalBack) portalBack.classList.remove('portal-hidden');
    try {
      if (window.BoxiesMiPerfilDocs) {
        BoxiesMiPerfilDocs.bind();
        BoxiesMiPerfilDocs.load();
      }
    } catch (e) {}
  }

  function showPays() {
    setAuthChrome(true);
    setPayHeader(true);
    hideAll();
    if (paysView) paysView.classList.remove('portal-hidden');
    if (portalBack) portalBack.classList.remove('portal-hidden');
    try {
      if (window.BoxiesMiPerfilPays) {
        BoxiesMiPerfilPays.bind();
        BoxiesMiPerfilPays.load();
      }
    } catch (e) {}
  }

  window.BoxiesMiPerfilShowPays = showPays;

  function applyStage(profile, ped) {
    var pct = Number(profile && profile.etapa_pct);
    if (!Number.isFinite(pct)) pct = 0;
    var nombre = String((profile && profile.etapa_nombre) || '').trim();
    if (!nombre && ped) {
      var st = String(ped.status || '').toLowerCase();
      if (st === 'en_produccion' || st === 'pendiente_entrega') {
        nombre = 'En producción';
        if (!pct) pct = 50;
      } else if (st === 'pagado') {
        nombre = 'Entregado';
        if (!pct) pct = 100;
      } else if (st === 'pendiente_anticipo') {
        nombre = 'Anticipo pendiente';
        if (!pct) pct = 5;
      }
    }
    if (!nombre) nombre = pct ? ('Avance ' + pct + '%') : 'Pedido';
    setFooterProgress(pct, 'Proyecto · ' + pct + '%', 'Etapa', nombre);
    var lead = $('welcomeLead');
    if (lead) lead.textContent = nombre + (pct ? (' · ' + pct + '%') : '');
  }

  async function loadHome(user, profile) {
    currentUser = user;
    showHome();
    var email = (user && user.email) || '';
    var displayName = String(
      (profile && (profile.nombre_visible || profile.nombre)) || ''
    ).trim();
    if (!displayName && email) displayName = email.split('@')[0];
    setClientName(displayName);

    var welcomeTitle = $('welcomeTitle');
    var params = new URLSearchParams(location.search || '');
    if (welcomeTitle) welcomeTitle.textContent = displayName ? ('Hola, ' + displayName) : 'Hola';
    if (params.get('bienvenida') === '1' && $('welcomeLead')) {
      $('welcomeLead').textContent = 'Pago recibido. Aquí monitoreas tu proyecto.';
    }

    if ($('infoName')) $('infoName').value = displayName || '';
    if ($('infoEmail')) $('infoEmail').value = email || '';
    if ($('infoPhone')) {
      $('infoPhone').value = String((profile && profile.telefono) || '').replace(/\D/g, '') ||
        (window.ClientAccount && profile && profile.telefono
          ? ClientAccount.phonePassword(profile.telefono)
          : '');
      var metaPhone = user && user.user_metadata && (user.user_metadata.telefono || user.user_metadata.phone);
      if (!$('infoPhone').value && metaPhone) {
        $('infoPhone').value = (window.ClientAccount
          ? ClientAccount.phonePassword(metaPhone)
          : String(metaPhone).replace(/\D/g, ''));
      }
    }

    var sb = client();
    var ped = null;
    try {
      var pedidos = await sb.from('panel_pedidos').select('*').order('created_at', { ascending: false }).limit(1);
      ped = (pedidos.data && pedidos.data[0]) || null;
    } catch (e) {}
    applyStage(profile || {}, ped);
  }

  async function boot() {
    showLogin();
    try {
      var sb = client();
      var session = await sb.auth.getSession();
      var user = session && session.data && session.data.session && session.data.session.user;
      if (!user) return;

      var prof = await sb.from('profiles').select('rol,nombre_visible,nombre,telefono,etapa_nombre,etapa_pct').eq('id', user.id).maybeSingle();
      var rol = String((prof.data && prof.data.rol) || '').toLowerCase();
      if (rol === 'admin' || rol === 'super_admin' || rol === 'hunter' || rol === 'asesor') {
        location.replace('/panel_gestion/');
        return;
      }
      await loadHome(user, prof.data || null);
    } catch (err) {
      console.warn('[miperfil] boot', err);
      showLogin();
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
        var user = result.data.user;
        var prof = await sb.from('profiles').select('rol,nombre_visible,nombre,telefono,etapa_nombre,etapa_pct').eq('id', user.id).maybeSingle();
        await loadHome(user, prof.data || null);
      } catch (err) {
        if (errEl) errEl.textContent = (err && err.message) || 'No se pudo entrar. Revisa correo y celular.';
      }
    });
  }

  document.querySelectorAll('[data-miperfil-page]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
      var page = btn.getAttribute('data-miperfil-page');
      if (page === 'info') showInfo();
      else if (page === 'docs') showDocs();
    });
  });

  if (portalBack) {
    portalBack.addEventListener('click', function () {
      showHome();
    });
  }

  var infoForm = document.getElementById('infoForm');
  if (infoForm) {
    infoForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var status = $('infoStatus');
      if (status) status.textContent = 'Guardando…';
      try {
        var sb = client();
        var session = await sb.auth.getSession();
        var token = session && session.data && session.data.session && session.data.session.access_token;
        if (!token) throw new Error('Sesión expirada. Vuelve a entrar.');
        var base = (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) || '';
        var anon = (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) || '';
        var res = await fetch(base.replace(/\/$/, '') + '/functions/v1/client-profile-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anon,
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({
            name: ($('infoName').value || '').trim(),
            email: ($('infoEmail').value || '').trim().toLowerCase(),
            phone: ($('infoPhone').value || '').trim()
          })
        });
        var data = {};
        try { data = await res.json(); } catch (e2) {}
        if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
        setClientName(data.name || $('infoName').value);
        if ($('welcomeTitle')) {
          $('welcomeTitle').textContent = 'Hola, ' + (data.name || $('infoName').value || 'Cliente');
        }
        if (status) {
          status.textContent = 'Guardado.';
          status.classList.remove('miperfil-error');
        }
      } catch (err) {
        if (status) {
          status.textContent = (err && err.message) || 'Error al guardar';
          status.classList.add('miperfil-error');
        }
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

  window.BoxiesMiPerfilHome = function () {
    showHome();
    try { window.scrollTo(0, 0); } catch (e) {}
  };

  try {
    if (window.BoxiesMiPerfilPays) BoxiesMiPerfilPays.bind();
  } catch (ePay) {}

  boot();
})();
