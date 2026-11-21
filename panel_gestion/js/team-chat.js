/**
 * Chat de equipo en vivo (Supabase) + canal "Clave dinámica" (OTP Pagos).
 */
(function () {
  var DB_THREAD = 'team';
  var POLL_MS = 8000;
  var KEY_KINDS = {
    payments_key_request: 1,
    payments_key_info: 1,
    payments_key: 1
  };

  var state = {
    messages: [],
    ready: false,
    channel: null,
    pollTimer: null,
    userId: null,
    userName: '',
    userRol: '',
    activeView: 'team', // team | clave | dm
    awaitingPaymentsGate: false,
    clearedAt: { team: 0, clave: 0 } // per-account watermarks (ms)
  };

  function hidePaymentsGate() {
    var gate = $('paymentsGateBackdrop');
    if (gate) gate.classList.add('portal-hidden');
  }

  function openPaymentsGateWithCode(code) {
    var gate = $('paymentsGateBackdrop');
    var input = $('paymentsDynamicKey');
    var errEl = $('paymentsGateError');
    if (gate) gate.classList.remove('portal-hidden');
    if (input) {
      input.value = String(code || '').replace(/\D/g, '');
      setTimeout(function () {
        try { input.focus(); input.select(); } catch (e) {}
      }, 40);
    }
    if (errEl) {
      errEl.textContent = code
        ? 'Clave copiada. Confirma para entrar a Pagos.'
        : '';
    }
  }

  function closeChatPopup() {
    var popup = $('teamChatPopup');
    if (popup) popup.classList.add('portal-hidden');
  }

  function openChatPopup() {
    var popup = $('teamChatPopup');
    if (popup) popup.classList.remove('portal-hidden');
  }

  function finishPaymentsKeyCopy(code) {
    if (!state.awaitingPaymentsGate) return false;
    state.awaitingPaymentsGate = false;
    closeChatPopup();
    openPaymentsGateWithCode(code);
    return true;
  }

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

  function isKeyKind(kind) {
    return !!KEY_KINDS[kind];
  }

  function scopeForMessage(m) {
    return isKeyKind(m.kind) ? 'clave' : 'team';
  }

  function isClearedForMe(m) {
    var scope = scopeForMessage(m);
    var cut = Number((state.clearedAt && state.clearedAt[scope]) || 0);
    if (!cut) return false;
    return new Date(m.created_at).getTime() <= cut;
  }

  function visibleMessages() {
    return (state.messages || []).filter(function (m) {
      if (isClearedForMe(m)) return false;
      var key = isKeyKind(m.kind);
      return state.activeView === 'clave' ? key : !key;
    });
  }

  async function loadClears() {
    var client = getClient();
    if (!client || !state.userId) return;
    try {
      var result = await client
        .from('panel_chat_clears')
        .select('scope,cleared_at')
        .eq('user_id', state.userId);
      var next = { team: 0, clave: 0 };
      (result.data || []).forEach(function (row) {
        if (row.scope === 'team' || row.scope === 'clave') {
          next[row.scope] = new Date(row.cleared_at).getTime() || 0;
        }
      });
      state.clearedAt = next;
    } catch (e) {
      console.warn('[TeamChat] clears', e);
    }
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
      .eq('thread', DB_THREAD)
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
      if (isClearedForMe(m)) return false;
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
    var bodyHtml = '<p>' + escapeHtml(m.body || '') + '</p>';

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

    if (m.kind === 'payments_key_info') cls += ' is-pay-key-info';

    if (m.kind === 'payments_key') {
      cls += ' is-pay-key';
      var otp = String(meta.otp || m.body || '').replace(/\D/g, '');
      bodyHtml = '<div class="chat-otp-code" data-otp-value="' + escapeHtml(otp) + '">' + escapeHtml(otp) + '</div>';
      actions =
        '<div class="chat-msg-actions">' +
          '<button type="button" class="btn" data-copy-otp="' + escapeHtml(otp) + '">Copiar código</button>' +
        '</div>';
    }

    return (
      '<div class="' + cls + '" data-msg-id="' + escapeHtml(m.id) + '">' +
        '<strong>' + escapeHtml(m.sender_name || 'Equipo') +
          (m.sender_rol ? ' · ' + escapeHtml(m.sender_rol) : '') +
        '</strong>' +
        bodyHtml +
        actions +
        '<time>' + new Date(m.created_at).toLocaleString('es-ES') + '</time>' +
      '</div>'
    );
  }

  function setChrome() {
    var title = $('chatPopupTitle');
    var input = $('teamChatInput');
    var teamTab = $('chatTeamTab');
    var directTab = $('chatDirectTab');
    var panel = $('chatRecipientPanel');
    var onClave = state.activeView === 'clave';

    if (title) title.textContent = onClave ? 'Clave dinámica' : 'Equipo';
    if (input) {
      input.placeholder = onClave
        ? 'Mensajes de Clave dinámica…'
        : 'Escribe un mensaje…';
      input.disabled = false;
    }
    if (teamTab) teamTab.classList.toggle('active', !onClave && (!panel || panel.classList.contains('portal-hidden')));
    if (directTab) directTab.classList.toggle('active', !!(panel && !panel.classList.contains('portal-hidden')));
    ensureRequestButton();
  }

  function render() {
    // Los DM locales los pinta app.js; no pisar esa vista.
    if (state.activeView === 'dm') {
      ensureRequestButton();
      return;
    }
    var box = $('teamChatMessages');
    if (!box) return;
    var list = visibleMessages();
    if (!list.length) {
      box.innerHTML = state.activeView === 'clave'
        ? '<p class="desc">Todavía no hay solicitudes de Clave dinámica.</p>'
        : '<p class="desc">Todavía no hay mensajes en el equipo.</p>';
    } else {
      box.innerHTML = list.map(renderMessage).join('');
      box.scrollTop = box.scrollHeight;
    }
    setChrome();
    updateBadge();
  }

  function openDmMode() {
    state.activeView = 'dm';
    ensureRequestButton();
  }

  function ensureRequestButton() {
    var form = $('teamChatForm');
    if (!form) return;
    var btn = $('chatRequestPayKey');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'chatRequestPayKey';
      btn.className = 'btn chat-request-pay-btn';
      form.appendChild(btn);
      btn.addEventListener('click', function () {
        // Solo abre el hilo. La solicitud se crea desde Verificar acceso
        // (o con "Solicitar" dentro de Clave dinámica), nunca en cada clic.
        openChatPopup();
        openClaveView();
      });
    }
    btn.textContent = 'Clave dinámica';
    btn.disabled = false;
    btn.title = 'Abrir el chat de Clave dinámica';
    btn.style.display = '';
  }

  function syncAppThread(thread) {
    try {
      if (typeof window.setActiveChatThread === 'function') {
        window.setActiveChatThread(thread);
      }
    } catch (e) {}
    var title = $('chatPopupTitle');
    if (title) {
      if (thread === 'clave') title.textContent = 'Clave dinámica';
      else if (thread === 'team') title.textContent = 'Equipo';
    }
  }

  function openClaveView() {
    state.activeView = 'clave';
    syncAppThread('clave');
    var panel = $('chatRecipientPanel');
    if (panel) panel.classList.add('portal-hidden');
    var teamTab = $('chatTeamTab');
    var directTab = $('chatDirectTab');
    if (teamTab) teamTab.classList.remove('active');
    if (directTab) directTab.classList.remove('active');
    render();
    markRead();
  }

  function openTeamView() {
    state.activeView = 'team';
    syncAppThread('team');
    var panel = $('chatRecipientPanel');
    if (panel) panel.classList.add('portal-hidden');
    var teamTab = $('chatTeamTab');
    var directTab = $('chatDirectTab');
    if (teamTab) teamTab.classList.add('active');
    if (directTab) directTab.classList.remove('active');
    render();
  }

  function injectClaveInMemberList() {
    var list = $('chatMemberList');
    if (!list) return;
    if (list.querySelector('[data-chat-clave]')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chat-member-option';
    btn.setAttribute('data-chat-clave', '1');
    btn.textContent = 'Clave dinámica';
    list.insertBefore(btn, list.firstChild);
    btn.addEventListener('click', function () {
      var panel = $('chatRecipientPanel');
      if (panel) panel.classList.add('portal-hidden');
      openClaveView();
    });
  }

  async function reload() {
    try {
      await loadClears();
      state.messages = await fetchMessages();
      state.ready = true;
      render();
      injectClaveInMemberList();
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
      p_thread: DB_THREAD,
      p_kind: 'text',
      p_meta: {}
    });
    if (result.error) throw new Error(result.error.message || 'No se pudo enviar');
    state.activeView = 'team';
    await reload();
  }

  function currentChatLabel() {
    if (state.activeView === 'clave') return 'Clave dinámica';
    if (state.activeView === 'dm') {
      var title = $('chatPopupTitle');
      return (title && title.textContent) || 'este chat privado';
    }
    return 'Equipo';
  }

  async function clearCurrentChat() {
    var label = currentChatLabel();
    var onClave = state.activeView === 'clave';
    var ok = window.confirm(
      '¿Borrar el chat “' + label + '” solo en tu cuenta?\n\n' +
      'Los mensajes desaparecen para ti. El resto del equipo sigue viéndolos.\n' +
      'Los mensajes nuevos sí te llegarán.'
    );
    if (!ok) return;

    // DMs locales: limpia solo ese hilo en localStorage (app.js).
    if (state.activeView === 'dm') {
      if (typeof window.clearActiveLocalChat === 'function') {
        window.clearActiveLocalChat();
      }
      return;
    }

    var client = getClient();
    if (!client) {
      alert('Entra con tu cuenta de equipo para borrar el chat.');
      return;
    }
    var scope = onClave ? 'clave' : 'team';
    var result = await client.rpc('panel_chat_mark_cleared', { p_scope: scope });
    if (result.error) throw new Error(result.error.message || 'No se pudo borrar el chat');
    var at = result.data ? new Date(result.data).getTime() : Date.now();
    state.clearedAt = state.clearedAt || { team: 0, clave: 0 };
    state.clearedAt[scope] = at || Date.now();
    render();
  }

  async function requestPaymentsKey() {
    if (isAdmin()) {
      window.boxiesPaymentsUnlocked = true;
      hidePaymentsGate();
      return;
    }
    // Ya desbloqueó Pagos en esta sesión: no generar otra solicitud
    if (window.boxiesPaymentsUnlocked) {
      hidePaymentsGate();
      return;
    }
    var client = getClient();
    if (!client) {
      alert('Entra con tu cuenta de equipo para solicitar la clave.');
      return;
    }
    var errEl = $('paymentsGateError');
    var gate = $('paymentsGateBackdrop');
    var fromGate = !!(gate && !gate.classList.contains('portal-hidden'));
    try {
      var result = await client.rpc('panel_payments_request_access');
      if (result.error) throw result.error;
      var data = result.data || {};
      // Clave ya aprobada vigente: solo abrir chat, sin nueva petición
      if (data.already_approved) {
        state.awaitingPaymentsGate = fromGate || state.awaitingPaymentsGate;
        hidePaymentsGate();
        openChatPopup();
        openClaveView();
        await reload();
        markRead();
        if (errEl) errEl.textContent = 'Ya tienes una clave vigente. Cópiala en Clave dinámica.';
        return;
      }
      // Desde Verificar acceso: cierra el popup y abre Clave dinámica a la espera
      state.awaitingPaymentsGate = fromGate || state.awaitingPaymentsGate;
      hidePaymentsGate();
      openChatPopup();
      openClaveView();
      await reload();
      markRead();
      if (errEl) {
        if (data.restored) {
          errEl.textContent = 'Solicitud restaurada en Clave dinámica. Espera la clave del admin.';
        } else if (data.reused) {
          errEl.textContent = 'Ya hay una solicitud pendiente. Cuando te den la clave, cópiala aquí.';
        } else {
          errEl.textContent = 'Solicitud enviada. Cuando te den la clave, cópiala para volver al acceso.';
        }
      }
    } catch (err) {
      if (fromGate) state.awaitingPaymentsGate = false;
      if (errEl) errEl.textContent = err.message || 'No se pudo solicitar la clave.';
      else alert(err.message || 'No se pudo solicitar la clave.');
      if (fromGate) openPaymentsGateWithCode('');
    }
  }

  async function approveRequest(requestId) {
    var client = getClient();
    if (!client || !requestId) return;
    var result = await client.rpc('panel_payments_approve_access', { p_request_id: requestId });
    if (result.error) throw new Error(result.error.message || 'No se pudo aprobar');
    openClaveView();
    await reload();
  }

  async function rejectRequest(requestId) {
    var client = getClient();
    if (!client || !requestId) return;
    var result = await client.rpc('panel_payments_reject_access', { p_request_id: requestId });
    if (result.error) throw new Error(result.error.message || 'No se pudo rechazar');
    openClaveView();
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
        var copyBtn = e.target.closest('[data-copy-otp]');
        if (copyBtn) {
          e.preventDefault();
          var code = copyBtn.getAttribute('data-copy-otp') || '';
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(code);
            } else {
              var ta = document.createElement('textarea');
              ta.value = code;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              ta.remove();
            }
            copyBtn.textContent = 'Copiado';
            // Desde el flujo de Pagos: cierra chat y reabre Verificar acceso con la clave
            if (finishPaymentsKeyCopy(code)) return;
            setTimeout(function () { copyBtn.textContent = 'Copiar código'; }, 1400);
          } catch (err) {
            alert('No se pudo copiar. Código: ' + code);
          }
          return;
        }
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

    var closeBtn = $('teamChatPopupClose');
    if (closeBtn && !closeBtn.dataset.liveBound) {
      closeBtn.dataset.liveBound = '1';
      closeBtn.addEventListener('click', function () {
        // Si venía del gate de Pagos y cierra sin copiar, recupera Verificar acceso
        if (state.awaitingPaymentsGate) {
          state.awaitingPaymentsGate = false;
          openPaymentsGateWithCode('');
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !state.awaitingPaymentsGate) return;
      var popup = $('teamChatPopup');
      if (!popup || popup.classList.contains('portal-hidden')) return;
      state.awaitingPaymentsGate = false;
      openPaymentsGateWithCode('');
    });

    var teamTab = $('chatTeamTab');
    if (teamTab && !teamTab.dataset.liveBound) {
      teamTab.dataset.liveBound = '1';
      teamTab.addEventListener('click', function () {
        openTeamView();
      }, true);
    }

    var directTab = $('chatDirectTab');
    if (directTab && !directTab.dataset.liveBound) {
      directTab.dataset.liveBound = '1';
      directTab.addEventListener('click', function () {
        setTimeout(injectClaveInMemberList, 30);
      });
    }

    var clearBtn = $('teamChatClearBtn');
    if (clearBtn && !clearBtn.dataset.liveBound) {
      clearBtn.dataset.liveBound = '1';
      clearBtn.addEventListener('click', async function () {
        try {
          clearBtn.disabled = true;
          await clearCurrentChat();
        } catch (err) {
          alert(err.message || 'No se pudo borrar el chat');
        } finally {
          clearBtn.disabled = false;
        }
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
    openClaveView: openClaveView,
    openTeamView: openTeamView,
    openDmMode: openDmMode,
    clearCurrentChat: clearCurrentChat,
    finishPaymentsKeyCopy: finishPaymentsKeyCopy,
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
