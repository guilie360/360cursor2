/**
 * Chat de equipo en vivo (Supabase) + solicitud/aprobación de clave Pagos.
 */
(function () {
  var THREAD = 'team';
  var POLL_MS = 8000;
  var state = {
    messages: [],
    ready: false,
    channel: null,
    pollTimer: null,
    userId: null,
    userName: '',
    userRol: ''
  };

  function getClient() {
    try {
      if (window.PlatformAuth && typeof window.PlatformAuth.getClient === 'function') {
        return window.PlatformAuth.getClient();
      }
    } catch (e) {}
    return null;
  }

  function panelRole() {
    try {
      return String(document.body.dataset.panelRole || sessionStorage.getItem('boxiesPanelRole') || '').toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function isAdmin() {
    var r = panelRole();
    return r === 'admin' || r === 'super_admin';
  }

  function escapeHtml(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function $(id) { return document.getElementById(id); }

  async function refreshIdentity() {
    var client = getClient();
    if (!client) return false;
    var session = await client.auth.getSession();
    var user = session && session.data && session.data.session && session.data.session.user;
    if (!user) return false;
    state.userId = user.id;
    var prof = await client.from('profiles').select('nombre_visible,nombre,rol').eq('id', user.id).maybeSingle();
    var p = (prof && prof.data) || {};
    state.userName = String(p.nombre_visible || p.nombre || user.email || 'Equipo').trim();
    state.userRol = String(p.rol || panelRole() || 'usuario').toLowerCase();
    try {
      document.body.dataset.panelRole = state.userRol;
      sessionStorage.setItem('boxiesPanelRole', state.userRol);
    } catch (e) {}
    return true;
  }

  async function fetchMessages() {
    var client = getClient();
    if (!client) return [];
    var result = await client
      .from('panel_team_messages')
      .select('*')
      .eq('thread', THREAD)
      .order('created_at', { ascending: true })
      .limit(200);
    if (result.error) throw new Error(result.error.message || 'No se pudo cargar el chat');
    return result.data || [];
  }

  function updateBadge() {
    var badge = $('chatUnreadBadge');
    var team = $('teamChatUnread');
    var lastSeen = 0;
    try { lastSeen = Number(localStorage.getItem('boxiesChatSeenAt') || 0); } catch (e) {}
    var unread = state.messages.filter(function (m) {
      return m.sender_id !== state.userId && new Date(m.created_at).getTime() > lastSeen;
    }).length;
    if (badge) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.style.display = unread ? 'block' : 'none';
    }
    if (team) {
      team.textContent = String(unread);
      team.style.display = unread ? 'inline-block' : 'none';
    }
  }

  function markRead() {
    var last = state.messages.length
      ? new Date(state.messages[state.messages.length - 1].created_at).getTime()
      : Date.now();
    try { localStorage.setItem('boxiesChatSeenAt', String(last)); } catch (e) {}
    updateBadge();
  }

  function renderMessage(m) {
    var meta = m.meta || {};
    var status = meta.status || '';
    var isMine = m.sender_id === state.userId;
    var cls = 'team-chat-message' + (isMine ? ' is-mine' : '');
    var actions = '';
    if (m.kind === 'payments_key_request') {
      cls += ' is-pay-request';
      if (isAdmin() && status !== 'approved' && status !== 'rejected') {
        actions =
          '<div class="chat-msg-actions">' +
            '<button type="button" class="btn" data-pay-approve="' + escapeHtml(meta.request_id || '') + '">Aceptar</button>' +
            '<button type="button" class="btn" data-pay-reject="' + escapeHtml(meta.request_id || '') + '">Rechazar</button>' +
          '</div>';
      } else if (status === 'approved') {
        actions = '<p class="chat-msg-status">Aprobada · clave enviada</p>';
      } else if (status === 'rejected') {
        actions = '<p class="chat-msg-status">Rechazada</p>';
      }
    }
    if (m.kind === 'payments_key') cls += ' is-pay-key';
    return (
      '<div class="' + cls + '" data-msg-id="' + escapeHtml(m.id) + '">' +
        '<strong>' + escapeHtml(m.sender_name || 'Equipo') +
          (m.sender_rol ? ' · ' + escapeHtml(m.sender_rol) : '') +
        '</strong>' +
        '<p>' + escapeHtml(m.body || '') + '</p>' +
        actions +
        '<time>' + new Date(m.created_at).toLocaleString('es-ES') + '</time>' +
      '</div>'
    );
  }

  function render() {
    var box = $('teamChatMessages');
    if (!box) return;
    if (!state.messages.length) {
      box.innerHTML = '<p class="desc">Todavía no hay mensajes en el equipo.</p>';
    } else {
      box.innerHTML = state.messages.map(renderMessage).join('');
      box.scrollTop = box.scrollHeight;
    }
    var title = $('chatPopupTitle');
    if (title) title.textContent = 'Equipo';
    ensureRequestButton();
    updateBadge();
  }

  function ensureRequestButton() {
    var form = $('teamChatForm');
    if (!form || $('chatRequestPayKey')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'chatRequestPayKey';
    btn.className = 'btn chat-request-pay-btn';
    btn.textContent = isAdmin() ? 'Acceso Pagos OK' : 'Solicitar clave Pagos';
    if (isAdmin()) {
      btn.disabled = true;
      btn.title = 'Los administradores entran a Pagos sin clave';
    }
    form.appendChild(btn);
    btn.addEventListener('click', function () {
      requestPaymentsKey();
    });
  }

  async function reload() {
    try {
      state.messages = await fetchMessages();
      state.ready = true;
      render();
    } catch (err) {
      var box = $('teamChatMessages');
      if (box) box.innerHTML = '<p class="desc">No se pudo sincronizar el chat: ' + escapeHtml(err.message) + '</p>';
    }
  }

  function subscribe() {
    var client = getClient();
    if (!client || state.channel) return;
    try {
      state.channel = client
        .channel('panel-team-chat')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'panel_team_messages',
          filter: 'thread=eq.team'
        }, function () {
          reload();
        })
        .subscribe();
    } catch (e) {
      console.warn('[TeamChat] realtime', e);
    }
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(function () { reload(); }, POLL_MS);
  }

  async function sendText(text) {
    var client = getClient();
    if (!client) throw new Error('Sin sesión');
    var result = await client.rpc('panel_chat_post', {
      p_body: text,
      p_thread: THREAD,
      p_kind: 'text',
      p_meta: {}
    });
    if (result.error) throw new Error(result.error.message || 'No se pudo enviar');
    await reload();
  }

  async function requestPaymentsKey() {
    if (isAdmin()) {
      window.boxiesPaymentsUnlocked = true;
      alert('Como admin ya tienes acceso a Pagos.');
      return;
    }
    var client = getClient();
    if (!client) {
      alert('Entra con tu cuenta de equipo para solicitar la clave.');
      return;
    }
    var errEl = $('paymentsGateError');
    try {
      var result = await client.rpc('panel_payments_request_access');
      if (result.error) throw result.error;
      var popup = $('teamChatPopup');
      if (popup) popup.classList.remove('portal-hidden');
      await reload();
      markRead();
      if (errEl) {
        errEl.textContent = result.data && result.data.reused
          ? 'Ya hay una solicitud pendiente. El admin la verá en el chat.'
          : 'Solicitud enviada al chat del equipo. El admin debe aceptarla.';
      }
    } catch (err) {
      if (errEl) errEl.textContent = err.message || 'No se pudo solicitar la clave.';
      else alert(err.message || 'No se pudo solicitar la clave.');
    }
  }

  async function approveRequest(requestId) {
    var client = getClient();
    if (!client || !requestId) return;
    var result = await client.rpc('panel_payments_approve_access', { p_request_id: requestId });
    if (result.error) throw new Error(result.error.message || 'No se pudo aprobar');
    await reload();
  }

  async function rejectRequest(requestId) {
    var client = getClient();
    if (!client || !requestId) return;
    var result = await client.rpc('panel_payments_reject_access', { p_request_id: requestId });
    if (result.error) throw new Error(result.error.message || 'No se pudo rechazar');
    await reload();
  }

  async function verifyOtp(code) {
    if (isAdmin()) return true;
    var client = getClient();
    if (!client) return false;
    var result = await client.rpc('panel_payments_verify_otp', { p_code: String(code || '').trim() });
    if (result.error) throw new Error(result.error.message || 'Clave inválida');
    return !!result.data;
  }

  function bindUi() {
    var form = $('teamChatForm');
    if (form && !form.dataset.liveBound) {
      form.dataset.liveBound = '1';
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var input = $('teamChatInput');
        var text = input && input.value.trim();
        if (!text) return;
        try {
          input.disabled = true;
          await sendText(text);
          input.value = '';
        } catch (err) {
          alert(err.message || 'No se pudo enviar');
        } finally {
          if (input) input.disabled = false;
        }
      }, true);
    }

    var box = $('teamChatMessages');
    if (box && !box.dataset.liveBound) {
      box.dataset.liveBound = '1';
      box.addEventListener('click', async function (e) {
        var approve = e.target.closest('[data-pay-approve]');
        var reject = e.target.closest('[data-pay-reject]');
        if (!approve && !reject) return;
        e.preventDefault();
        try {
          if (approve) await approveRequest(approve.getAttribute('data-pay-approve'));
          else await rejectRequest(reject.getAttribute('data-pay-reject'));
        } catch (err) {
          alert(err.message || 'Error al resolver la solicitud');
        }
      });
    }

    var floatBtn = $('teamChatFloat');
    if (floatBtn && !floatBtn.dataset.liveBound) {
      floatBtn.dataset.liveBound = '1';
      floatBtn.addEventListener('click', function () {
        setTimeout(function () {
          markRead();
          reload();
        }, 50);
      });
    }
  }

  async function start() {
    bindUi();
    var ok = await refreshIdentity();
    if (!ok) return;
    await reload();
    subscribe();
  }

  window.BoxiesTeamChat = {
    start: start,
    reload: reload,
    requestPaymentsKey: requestPaymentsKey,
    verifyOtp: verifyOtp,
    isAdmin: isAdmin,
    markRead: markRead
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(start, 400);
    });
  } else {
    setTimeout(start, 400);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) reload();
  });
})();
