/**
 * Mi perfil — Mis showrooms: miniaturas + carpeta Drive por pedido.
 */
(function () {
  var state = { pedidos: [] };

  function $(id) { return document.getElementById(id); }

  function escapeHtml(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
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

  function render() {
    var root = $('showroomsRoot');
    if (!root) return;
    var pedidos = state.pedidos || [];
    var withShowroom = pedidos.filter(function (p) {
      return String(p.showroom_url || '').trim();
    });
    var withDrive = pedidos.filter(function (p) {
      return String(p.drive_folder_url || '').trim();
    });

    var showHtml = withShowroom.length
      ? ('<div class="showroom-thumbs">' +
        withShowroom.map(function (p) {
          var label = p.proyecto_label || 'Showroom';
          var url = String(p.showroom_url || '').trim();
          var thumb = String(p.showroom_thumb_url || '').trim();
          var cover = thumb
            ? ('<img src="' + escapeHtml(thumb) + '" alt="" loading="lazy">')
            : '<span class="showroom-thumb-fallback" aria-hidden="true"></span>';
          return (
            '<a class="showroom-thumb-card" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
              '<span class="showroom-thumb-media">' + cover + '</span>' +
              '<span class="showroom-thumb-meta">' +
                '<strong>' + escapeHtml(label) + '</strong>' +
                '<small>Abrir showroom</small>' +
              '</span>' +
            '</a>'
          );
        }).join('') +
        '</div>')
      : (
        '<article class="doc-card is-pending">' +
          '<div class="doc-card-top"><span class="doc-kind">Showrooms</span><span class="doc-status">Pendiente</span></div>' +
          '<h3>Aún no hay showrooms</h3>' +
          '<p class="desc">Cuando el equipo publique el enlace y la miniatura, aparecerán aquí.</p>' +
        '</article>'
      );

    var driveHtml = withDrive.length
      ? ('<div class="showroom-files">' +
        withDrive.map(function (p) {
          var label = p.proyecto_label || 'Proyecto';
          var url = String(p.drive_folder_url || '').trim();
          return (
            '<a class="showroom-file-card" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
              '<span class="showroom-file-icon" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24"><path d="M3 8h6l2 2h10v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8z"/><path d="M3 8V6a1 1 0 0 1 1-1h5l2 2"/></svg>' +
              '</span>' +
              '<span class="showroom-file-meta">' +
                '<strong>' + escapeHtml(label) + '</strong>' +
                '<small>Abrir carpeta Drive</small>' +
              '</span>' +
            '</a>'
          );
        }).join('') +
        '</div>')
      : (
        '<article class="doc-card is-pending">' +
          '<div class="doc-card-top"><span class="doc-kind">Archivos</span><span class="doc-status">Pendiente</span></div>' +
          '<h3>Sin carpeta Drive</h3>' +
          '<p class="desc">El equipo añadirá el enlace de archivos de tu proyecto.</p>' +
        '</article>'
      );

    root.innerHTML =
      '<div class="showroom-block">' +
        '<div class="eyebrow">Showrooms</div>' +
        showHtml +
      '</div>' +
      '<div class="showroom-block">' +
        '<div class="eyebrow">Archivos</div>' +
        driveHtml +
      '</div>';
  }

  async function load() {
    var root = $('showroomsRoot');
    if (root) root.innerHTML = '<p class="desc">Cargando showrooms…</p>';
    try {
      var sb = client();
      var session = await sb.auth.getSession();
      var user = session && session.data && session.data.session && session.data.session.user;
      if (!user) throw new Error('Sesión expirada.');
      var email = String(user.email || '').toLowerCase();
      var res = await sb
        .from('panel_pedidos')
        .select('id,proyecto_label,showroom_url,showroom_thumb_url,drive_folder_url,status,created_at')
        .eq('customer_email', email)
        .order('created_at', { ascending: false })
        .limit(20);
      if (res.error) throw new Error(res.error.message || 'No se pudieron cargar');
      state.pedidos = res.data || [];
      render();
    } catch (err) {
      if (root) {
        root.innerHTML = '<p class="desc miperfil-error">' + escapeHtml(err.message || 'Error') + '</p>';
      }
    }
  }

  window.BoxiesMiPerfilShowrooms = {
    bind: function () {},
    load: load
  };
})();
