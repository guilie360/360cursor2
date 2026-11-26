/**
 * Base de datos (admin): cuentas cliente Mi perfil + pedidos/cotizaciones.
 */
(function () {
  var FN = '/functions/v1/admin-clients';
  var euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

  function moneyFromCents(cents) {
    return euro.format((Number(cents) || 0) / 100);
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

  async function api(payload) {
    var token = await getAccessToken();
    if (!token) throw new Error('Sesión admin requerida.');
    var base = (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) ||
      'https://emefdwzdfnqgjohbtvvn.supabase.co';
    var anon = (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) || '';
    var res = await fetch(base + FN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(payload || {})
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error(data.error || data.message || ('Error ' + res.status));
    return data;
  }

  function escapeHtml(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function statusLabel(s) {
    s = String(s || '').toLowerCase();
    if (s === 'pendiente_anticipo') return 'Pendiente anticipo';
    if (s === 'en_produccion' || s === 'pendiente_entrega') return 'En producción';
    if (s === 'pagado') return 'Pagado';
    if (s === 'cancelado') return 'Cancelado';
    return s || '—';
  }

  function renderRows(clients) {
    if (!clients || !clients.length) {
      return '<tr><td colspan="6" class="muted">No hay cuentas cliente todavía.</td></tr>';
    }
    return clients.map(function (c) {
      var ped = c.latest_pedido;
      var pkg = escapeHtml(c.package_summary || 'Sin paquete');
      var money = ped
        ? ('Total ' + moneyFromCents(ped.quote_total_cents) +
          ' · Anticipo ' + moneyFromCents(ped.deposit_cents))
        : (c.latest_cotizacion
          ? ('Cotización ' + moneyFromCents(c.latest_cotizacion.total_cents))
          : '—');
      var pass = c.password_hint
        ? '<code class="db-pass">' + escapeHtml(c.password_hint) + '</code>'
        : '<span class="muted">—</span>';
      var created = c.created_at
        ? new Date(c.created_at).toLocaleString('es-ES')
        : '—';
      return (
        '<tr data-client-id="' + escapeHtml(c.id) + '">' +
          '<td>' +
            '<b>' + escapeHtml(c.name || 'Cliente') + '</b>' +
            '<br><small class="muted">' + escapeHtml(created) + ' · ' + escapeHtml(c.rol || 'cliente') + '</small>' +
          '</td>' +
          '<td>' +
            '<div>' + escapeHtml(c.email || '—') + '</div>' +
            '<small class="muted">' + escapeHtml(c.telefono || 'sin teléfono') + '</small>' +
          '</td>' +
          '<td>' + pass + '<br><small class="muted">celular sin +57</small></td>' +
          '<td>' +
            '<div>' + pkg + '</div>' +
            '<small class="muted">' + escapeHtml(money) +
              (ped ? ' · ' + escapeHtml(statusLabel(ped.status)) : '') +
            '</small>' +
          '</td>' +
          '<td><small>' + (c.pedidos_count || 0) + ' ped. · ' + (c.cotizaciones_count || 0) + ' cot.</small></td>' +
          '<td>' +
            '<button type="button" class="btn db-delete-btn" data-delete-client="' + escapeHtml(c.id) + '" data-client-email="' + escapeHtml(c.email || '') + '" data-client-name="' + escapeHtml(c.name || '') + '">Eliminar</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('');
  }

  async function loadList(root) {
    var status = root.querySelector('#dbClientsStatus');
    var body = root.querySelector('#dbClientsBody');
    var countEl = root.querySelector('#dbClientsCount');
    if (status) status.textContent = 'Cargando cuentas desde Supabase…';
    try {
      var data = await api({ action: 'list' });
      var clients = data.clients || [];
      if (body) body.innerHTML = renderRows(clients);
      if (countEl) countEl.textContent = String(clients.length);
      if (status) {
        status.textContent = clients.length
          ? ('Mostrando ' + clients.length + ' cuenta(s) cliente / prueba.')
          : 'No hay cuentas cliente en Auth.';
      }
    } catch (err) {
      if (body) body.innerHTML = '<tr><td colspan="6" class="muted">' + escapeHtml(err.message || 'Error') + '</td></tr>';
      if (status) status.textContent = err.message || 'No se pudo cargar.';
    }
  }

  async function deleteClient(root, btn) {
    var id = btn.getAttribute('data-delete-client');
    var email = btn.getAttribute('data-client-email') || '';
    var name = btn.getAttribute('data-client-name') || 'esta cuenta';
    if (!id) return;
    var ok = window.confirm(
      '¿Eliminar permanentemente “' + name + '” (' + email + ')?\n\n' +
      'Se borran Auth, perfil, pedidos, cotizaciones, cobros y mensajes de chat.\n' +
      'Esta acción no se puede deshacer.'
    );
    if (!ok) return;
    btn.disabled = true;
    var status = root.querySelector('#dbClientsStatus');
    if (status) status.textContent = 'Eliminando ' + email + '…';
    try {
      await api({ action: 'delete', user_id: id });
      await loadList(root);
    } catch (err) {
      alert(err.message || 'No se pudo eliminar');
      btn.disabled = false;
      if (status) status.textContent = err.message || 'Error al eliminar';
    }
  }

  function mount(root) {
    if (!root) return;
    var host = root.querySelector('#panelDatabaseRoot') || root;
    if (!host.querySelector('#dbClientsBody')) {
      host.innerHTML =
        '<div class="database-toolbar">' +
          '<div class="database-toolbar-copy">' +
            '<b>Cuentas cliente · Supabase</b>' +
            '<small>Correo, contraseña (celular), paquete y pedidos. Solo admin.</small>' +
          '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
            '<span class="status-pill" id="dbClientsCount">0</span>' +
            '<button class="btn" type="button" id="dbClientsRefresh">Actualizar</button>' +
          '</div>' +
        '</div>' +
        '<div id="dbClientsStatus" class="database-status" role="status">Cargando…</div>' +
        '<div class="portal-table-wrap" style="margin-top:14px">' +
          '<table class="portal-table db-clients-table">' +
            '<thead><tr>' +
              '<th>Nombre</th><th>Correo / Tel</th><th>Contraseña</th><th>Paquete / pedido</th><th>Regs</th><th></th>' +
            '</tr></thead>' +
            '<tbody id="dbClientsBody"><tr><td colspan="6" class="muted">Cargando…</td></tr></tbody>' +
          '</table>' +
        '</div>' +
        '<p class="desc" style="margin-top:14px">La contraseña de Mi perfil es el celular sin +57. Eliminar limpia Auth + pedidos/cotizaciones de prueba.</p>';
    }

    var refresh = host.querySelector('#dbClientsRefresh');
    if (refresh && !refresh.dataset.bound) {
      refresh.dataset.bound = '1';
      refresh.addEventListener('click', function () { loadList(host); });
    }
    if (!host.dataset.deleteBound) {
      host.dataset.deleteBound = '1';
      host.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-delete-client]');
        if (!btn || !host.contains(btn)) return;
        e.preventDefault();
        deleteClient(host, btn);
      });
    }
    loadList(host);
  }

  function unlockDatabaseCardForAdmin() {
    var rol = '';
    try {
      rol = String(document.body.dataset.panelRole || sessionStorage.getItem('boxiesPanelRole') || '').toLowerCase();
    } catch (e) {}
    var isAdmin = rol === 'admin' || rol === 'super_admin';
    var card = document.querySelector('[data-page="database"]');
    if (!card) return;
    if (isAdmin) {
      card.classList.remove('portal-card--locked');
      card.removeAttribute('data-portal-locked');
      card.removeAttribute('aria-disabled');
      var badge = card.querySelector('.portal-lock-badge');
      if (badge) badge.remove();
      var small = card.querySelector('small');
      if (small) small.textContent = 'Cuentas cliente, pedidos y limpieza de pruebas.';
    } else {
      card.classList.add('portal-card--secondary', 'portal-card--locked');
      card.setAttribute('data-portal-locked', '1');
      card.setAttribute('aria-disabled', 'true');
      if (!card.querySelector('.portal-lock-badge')) {
        var b = document.createElement('span');
        b.className = 'portal-lock-badge';
        b.textContent = 'ADMIN';
        card.insertBefore(b, card.firstChild);
      }
    }
  }

  window.PanelDatabase = {
    mount: mount,
    unlockForAdmin: unlockDatabaseCardForAdmin,
    reload: function () {
      var root = document.getElementById('panelDatabaseRoot') ||
        document.querySelector('[data-module="database"]');
      if (root) mount(root);
    }
  };

  document.addEventListener('DOMContentLoaded', unlockDatabaseCardForAdmin);
  var mo = new MutationObserver(unlockDatabaseCardForAdmin);
  mo.observe(document.body, { attributes: true, attributeFilter: ['data-panel-role', 'class'] });
})();
