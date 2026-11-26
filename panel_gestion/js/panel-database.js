/**
 * Base de datos (admin): cuentas cliente — lista plegable, texto seleccionable.
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

  function copyable(value) {
    var v = String(value == null ? '' : value);
    if (!v) return '<span class="muted">—</span>';
    return '<span class="db-copy" tabindex="0">' + escapeHtml(v) + '</span>';
  }

  function field(label, value) {
    return (
      '<div class="db-field">' +
        '<span class="db-field-label">' + escapeHtml(label) + '</span>' +
        copyable(value) +
      '</div>'
    );
  }

  function pctButtons(selected, clientId) {
    var html = '';
    for (var p = 0; p <= 100; p += 5) {
      var on = Number(selected) === p ? ' is-on' : '';
      html += '<button type="button" class="db-pct-btn' + on + '" data-set-pct="' + p + '" data-client-id="' + escapeHtml(clientId) + '">' + p + '%</button>';
    }
    return html;
  }

  function renderList(clients) {
    if (!clients || !clients.length) {
      return '<p class="desc db-empty">Sin cuentas.</p>';
    }
    return clients.map(function (c, i) {
      var ped = c.latest_pedido;
      var pkg = c.package_summary || 'Sin paquete';
      var money = ped
        ? (moneyFromCents(ped.quote_total_cents) + ' · ant. ' + moneyFromCents(ped.deposit_cents))
        : (c.latest_cotizacion ? moneyFromCents(c.latest_cotizacion.total_cents) : '');
      var status = ped ? statusLabel(ped.status) : '';
      var pct = Number(c.etapa_pct || 0);
      var etapa = c.etapa_nombre || '';
      var openAttr = i === 0 ? ' open' : '';
      return (
        '<details class="db-account"' + openAttr + ' data-client-id="' + escapeHtml(c.id) + '">' +
          '<summary>' +
            '<span class="db-account-title">' + escapeHtml(c.name || c.email || 'Cliente') + '</span>' +
            '<span class="db-account-meta">' + escapeHtml(c.email || '') + (pct ? (' · ' + pct + '%') : '') + '</span>' +
            '<span class="accordion-chevron">＋</span>' +
          '</summary>' +
          '<div class="db-account-body">' +
            field('Nombre', c.name) +
            field('Correo', c.email) +
            field('Teléfono', c.telefono) +
            field('Contraseña', c.password_hint) +
            field('Paquete', pkg) +
            field('Importe', money) +
            field('Estado', status) +
            '<details class="db-stage">' +
              '<summary>Etapa del proyecto · ' + pct + '%</summary>' +
              '<div class="db-stage-body">' +
                '<label class="db-stage-name">Nombre de etapa' +
                  '<input type="text" class="db-stage-input" data-stage-name="' + escapeHtml(c.id) + '" value="' + escapeHtml(etapa) + '" placeholder="Ej. En producción" maxlength="80">' +
                '</label>' +
                '<div class="db-pct-grid">' + pctButtons(pct, c.id) + '</div>' +
                '<button type="button" class="btn primary db-stage-save" data-save-stage="' + escapeHtml(c.id) + '">Guardar etapa</button>' +
              '</div>' +
            '</details>' +
            '<div class="db-account-actions">' +
              '<button type="button" class="btn db-delete-btn" data-delete-client="' + escapeHtml(c.id) + '" data-client-email="' + escapeHtml(c.email || '') + '" data-client-name="' + escapeHtml(c.name || '') + '">Eliminar</button>' +
            '</div>' +
          '</div>' +
        '</details>'
      );
    }).join('');
  }

  async function loadList(root) {
    var list = root.querySelector('#dbClientsList');
    var countEl = root.querySelector('#dbClientsCount');
    if (list) list.innerHTML = '<p class="desc db-empty">…</p>';
    try {
      var data = await api({ action: 'list' });
      var clients = data.clients || [];
      if (list) list.innerHTML = renderList(clients);
      if (countEl) countEl.textContent = String(clients.length);
    } catch (err) {
      if (list) list.innerHTML = '<p class="desc db-empty">' + escapeHtml(err.message || 'Error') + '</p>';
      if (countEl) countEl.textContent = '0';
    }
  }

  async function deleteClient(root, btn) {
    var id = btn.getAttribute('data-delete-client');
    var email = btn.getAttribute('data-client-email') || '';
    var name = btn.getAttribute('data-client-name') || 'esta cuenta';
    if (!id) return;
    if (!window.confirm('¿Eliminar “' + name + '” (' + email + ')?')) return;
    btn.disabled = true;
    try {
      await api({ action: 'delete', user_id: id });
      await loadList(root);
    } catch (err) {
      alert(err.message || 'No se pudo eliminar');
      btn.disabled = false;
    }
  }

  function mount(root) {
    if (!root) return;
    var host = root.querySelector('#panelDatabaseRoot') || root;
    if (!host.querySelector('#dbClientsList')) {
      host.innerHTML =
        '<details class="db-shell" open>' +
          '<summary class="db-shell-summary">' +
            '<span>Cuentas cliente</span>' +
            '<span class="db-shell-right">' +
              '<span class="status-pill" id="dbClientsCount">0</span>' +
              '<button class="btn" type="button" id="dbClientsRefresh">Actualizar</button>' +
              '<span class="accordion-chevron">＋</span>' +
            '</span>' +
          '</summary>' +
          '<div class="db-shell-body" id="dbClientsList"></div>' +
        '</details>';
    }

    var refresh = host.querySelector('#dbClientsRefresh');
    if (refresh && !refresh.dataset.bound) {
      refresh.dataset.bound = '1';
      refresh.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        loadList(host);
      });
    }
    if (!host.dataset.deleteBound) {
      host.dataset.deleteBound = '1';
      host.addEventListener('click', function (e) {
        var del = e.target.closest('[data-delete-client]');
        if (del && host.contains(del)) {
          e.preventDefault();
          e.stopPropagation();
          deleteClient(host, del);
          return;
        }
        var pctBtn = e.target.closest('[data-set-pct]');
        if (pctBtn && host.contains(pctBtn)) {
          e.preventDefault();
          e.stopPropagation();
          var wrap = pctBtn.closest('.db-pct-grid');
          if (wrap) {
            wrap.querySelectorAll('.db-pct-btn').forEach(function (b) { b.classList.remove('is-on'); });
          }
          pctBtn.classList.add('is-on');
          return;
        }
        var save = e.target.closest('[data-save-stage]');
        if (save && host.contains(save)) {
          e.preventDefault();
          e.stopPropagation();
          saveStage(host, save);
        }
      });
    }
    loadList(host);
  }

  async function saveStage(root, btn) {
    var id = btn.getAttribute('data-save-stage');
    if (!id) return;
    var card = btn.closest('.db-account');
    var nameInput = card && card.querySelector('[data-stage-name="' + id + '"]');
    var on = card && card.querySelector('.db-pct-btn.is-on');
    var pct = on ? Number(on.getAttribute('data-set-pct')) : 0;
    var nombre = nameInput ? nameInput.value.trim() : '';
    btn.disabled = true;
    try {
      await api({
        action: 'update_stage',
        user_id: id,
        etapa_pct: pct,
        etapa_nombre: nombre
      });
      await loadList(root);
    } catch (err) {
      alert(err.message || 'No se pudo guardar la etapa');
      btn.disabled = false;
    }
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
      if (small) small.textContent = 'Cuentas cliente.';
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
