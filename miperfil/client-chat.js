/**
 * Chat Mi perfil → solo con admin (thread client:<uid>).
 */
(function () {
  var POLL_MS = 6000;
  var state = {
    ready: false,
    messages: [],
    userId: null,
    userName: '',
    channel: null,
    pollTimer: null,
    opening: false
  };

  function $(id) { return document.getElementById(id); }

  function escapeHtml(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function getClient() {
    try {
      if (window.PlatformAuth && typeof window.PlatformAuth.createClient === 'function') {
        return window.PlatformAuth.createClient({ remember: true });
      }
    } catch (e) {}
    return null;
  }

  function threadId() {
    return state.userId ? ('client:' + state.userId) : '';
  }

  function openPopup() {
    var popup = $('teamChatPopup');
    if (popup) popup.classList.remove('portal-hidden');
  }

  function closePopup() {
    var popup = $('teamChatPopup');
    if (popup) popup.classList.add('portal-hidden');
  }

  function isOpen() {
    var popup = $('teamChatPopup');
    return !!(popup && !popup.classList.contains('portal-hidden'));
  }

  function setBadge(n) {
    var badge = $('chatUnreadBadge');
    if (!badge) return;
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.style.display = n ? 'block' : 'none';
  }

  function getSeenAt() {
    try { return Number(localStorage.getItem('boxiesClientChatSeenAt') || 0); } catch (e) { return 0; }
  }

  function markRead() {
    var last = 0;
    (state.messages || []).forEach(function (m) {
      var t = new Date(m.created_at).getTime();
      if (t > last) last = t;
    });
    try { localStorage.setItem('boxiesClientChatSeenAt', String(last || Date.now())); } catch (e) {}
    setBadge(0);
  }

  function countUnread() {
    var seen = getSeenAt();
    return (state.messages || []).filter(function (m) {
      if (m.sender_id === state.userId) return false;
      return new Date(m.created_at).getTime() > seen;
    }).length;
  }

  async function refreshIdentity() {
    var client = getClient();
    if (!client) return false;
    var session = await client.auth.getSession();
    var user = session && session.data && session.data.session && session.data.session.user;
    if (!user) return false;
    state.userId = user.id;
    var prof = await client.from('profiles').select('nombre_visible,nombre,rol').eq('id', user.id).maybeSingle();
    var p = (prof && prof.data) || {};
    state.userName = String(p.nombre_visible || p.nombre || user.email || 'Cliente').trim();
    return true;
  }

  async function fetchMessages() {
    var client = getClient();
    if (!client || !state.userId) return [];
    var result = await client
      .from('panel_team_messages')
      .select('*')
      .eq('thread', threadId())
      .order('created_at', { ascending: true })
      .limit(200);
    if (result.error) throw new Error(result.error.message || 'No se pudo cargar el chat');
    return result.data || [];
  }

  function render() {
    var box = $('teamChatMessages');
    var title = $('chatPopupTitle');
    if (title) title.textContent = 'Chat con 360Preventa';
    if (!box) return;
    if (!state.messages.length) {
      box.innerHTML = '<p class="desc">Escribe al equipo. Te responde un admin aquí mismo.</p>';
    } else {
      box.innerHTML = state.messages.map(function (m) {
        var mine = m.sender_id === state.userId;
        return (
          '<div class="team-chat-message' + (mine ? ' is-mine' : '') + '">' +
            '<strong>' + escapeHtml(m.sender_name || (mine ? 'Tú' : 'Admin')) + '</strong>' +
            '<p>' + escapeHtml(m.body || '') + '</p>' +
            '<time>' + new Date(m.created_at).toLocaleString('es-ES') + '</time>' +
          '</div>'
        );
      }).join('');
      box.scrollTop = box.scrollHeight;
    }
    if (!isOpen()) setBadge(countUnread());
    else setBadge(0);
  }

  async function reload() {
    try {
      state.messages = await fetchMessages();
      render();
    } catch (e) {
      console.warn('[ClientChat] reload', e);
    }
  }

  async function send(text, notifyAdmin) {
    var client = getClient();
    if (!client) throw new Error('Sin sesión');
    var body = String(text || '').trim();
    if (!body) throw new Error('Escribe un mensaje');
    var result = await client.rpc('panel_client_chat_post', {
      p_body: body,
      p_client_id: null,
      p_kind: 'text',
      p_meta: {},
      p_notify_admin: !!notifyAdmin
    });
    if (result.error) throw new Error(result.error.message || 'No se pudo enviar');
    await reload();
    markRead();
    return result.data;
  }

  function subscribe() {
    var client = getClient();
    if (!client || !state.userId || state.channel) return;
    try {
      state.channel = client
        .channel('client-admin-chat:' + state.userId)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'panel_team_messages',
          filter: 'thread=eq.' + threadId()
        }, function () { reload(); })
        .subscribe();
    } catch (e) {
      console.warn('[ClientChat] realtime', e);
    }
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(function () { reload(); }, POLL_MS);
  }

  async function open(opts) {
    opts = opts || {};
    if (state.opening) return;
    state.opening = true;
    try {
      var ok = await refreshIdentity();
      if (!ok) {
        alert('Entra a Mi perfil para chatear con el admin.');
        return;
      }
      openPopup();
      await reload();
      markRead();
      subscribe();
      if (opts.notify) {
        var canPing = true;
        try {
          var lastPing = Number(sessionStorage.getItem('boxiesClientChatPingAt') || 0);
          if (lastPing && (Date.now() - lastPing) < 5 * 60 * 1000) canPing = false;
        } catch (e0) {}
        if (canPing) {
          var ping = 'Hola, soy ' + (state.userName || 'cliente') + '. Quiero chatear.';
          try {
            await send(ping, true);
            try { sessionStorage.setItem('boxiesClientChatPingAt', String(Date.now())); } catch (e1) {}
          } catch (err) {
            console.warn('[ClientChat] notify', err);
          }
        }
      }
      setTimeout(function () {
        try { $('teamChatInput') && $('teamChatInput').focus(); } catch (e) {}
      }, 40);
    } finally {
      state.opening = false;
    }
  }

  function toggle() {
    if (isOpen()) closePopup();
    else open({ notify: false });
  }

  function bindUi() {
    var form = $('teamChatForm');
    if (form && !form.dataset.clientBound) {
      form.dataset.clientBound = '1';
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var input = $('teamChatInput');
        var text = input && input.value.trim();
        if (!text) return;
        try {
          input.disabled = true;
          await send(text, false);
          input.value = '';
        } catch (err) {
          alert(err.message || 'No se pudo enviar');
        } finally {
          if (input) input.disabled = false;
        }
      }, true);
    }

    var floatBtn = $('teamChatFloat');
    if (floatBtn && !floatBtn.dataset.clientBound) {
      floatBtn.dataset.clientBound = '1';
      floatBtn.addEventListener('click', function (e) {
        e.preventDefault();
        toggle();
      });
    }

    var closeBtn = $('teamChatPopupClose');
    if (closeBtn && !closeBtn.dataset.clientBound) {
      closeBtn.dataset.clientBound = '1';
      closeBtn.addEventListener('click', closePopup);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePopup();
    });
  }

  async function start() {
    bindUi();
    var ok = await refreshIdentity();
    if (!ok) return;
    state.ready = true;
    await reload();
    subscribe();
  }

  window.BoxiesClientChat = {
    open: open,
    close: closePopup,
    toggle: toggle,
    reload: reload,
    send: send,
    start: start
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 300); });
  } else {
    setTimeout(start, 300);
  }
})();
