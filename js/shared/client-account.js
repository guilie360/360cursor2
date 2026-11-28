/**
 * Cuenta cliente (Mi perfil): email = usuario, celular (sin +57) = contraseña.
 * Se provisiona SOLO al pagar (no al descargar PDF).
 */
(function (global) {
  var WELCOME_KEY = 'boxiesClientWelcome';

  function phonePassword(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (digits.indexOf('57') === 0 && digits.length >= 12) digits = digits.slice(2);
    else if (digits.indexOf('34') === 0 && digits.length >= 11) digits = digits.slice(2);
    else if (digits.charAt(0) === '0' && digits.length > 1) digits = digits.replace(/^0+/, '');
    return digits;
  }

  /** Primeros 3 + ***** + últimos 2 del celular-contraseña (ej. 322*****84). */
  function maskPassword(rawOrDigits) {
    var digits = phonePassword(rawOrDigits);
    if (!digits) return '';
    if (digits.length <= 5) {
      return digits.charAt(0) + '*****' + digits.charAt(digits.length - 1);
    }
    return digits.slice(0, 3) + '*****' + digits.slice(-2);
  }

  function readOrderFields() {
    function val(id) {
      var el = document.getElementById(id);
      return el ? String(el.value || '').trim() : '';
    }
    return {
      name: val('customerName'),
      email: val('customerEmail').toLowerCase(),
      phone: val('customerPhone')
    };
  }

  function validateFields(f) {
    if (!f.name) return 'Indica tu nombre.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return 'Indica un correo válido.';
    if (phonePassword(f.phone).length < 6) {
      return 'Indica tu WhatsApp / celular (será tu acceso a Mi perfil).';
    }
    return '';
  }

  function functionsBase() {
    var url = (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) || '';
    return url ? url.replace(/\/$/, '') + '/functions/v1' : '';
  }

  function anonKey() {
    return (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) || '';
  }

  function stashWelcome(payload) {
    try {
      sessionStorage.setItem(WELCOME_KEY, JSON.stringify(payload || {}));
    } catch (e) {}
  }

  function readWelcome() {
    try {
      var raw = sessionStorage.getItem(WELCOME_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearWelcome() {
    try { sessionStorage.removeItem(WELCOME_KEY); } catch (e) {}
  }

  function welcomeFromFields(f) {
    var password = phonePassword(f.phone);
    return {
      name: f.name || '',
      email: f.email || '',
      phone: f.phone || '',
      password: password,
      password_masked: maskPassword(password),
      portal: '/miperfil/',
      created_at: new Date().toISOString()
    };
  }

  async function provision(fields) {
    var f = fields || readOrderFields();
    var err = validateFields(f);
    if (err) throw new Error(err);

    var base = functionsBase();
    if (!base) throw new Error('Configuración de cuenta no disponible.');

    var res = await fetch(base + '/client-provision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey(),
        Authorization: 'Bearer ' + anonKey()
      },
      body: JSON.stringify({
        email: f.email,
        name: f.name,
        phone: f.phone
      })
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data && data.error) || 'No se pudo crear tu acceso.');
    return data;
  }

  function getAuthClient() {
    try {
      if (global.PlatformAuth && typeof global.PlatformAuth.getClient === 'function') {
        var existing = global.PlatformAuth.getClient();
        if (existing) return existing;
      }
      if (global.PlatformAuth && typeof global.PlatformAuth.createClient === 'function') {
        return global.PlatformAuth.createClient({ remember: true });
      }
    } catch (e) {}
    try {
      if (global.supabase && typeof global.supabase.createClient === 'function' &&
          typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        return global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
    } catch (e2) {}
    return null;
  }

  async function signInWithPhonePassword(fields) {
    var f = fields || readOrderFields();
    var password = phonePassword(f.phone);
    var client = getAuthClient();
    if (!client || !client.auth) throw new Error('Auth no disponible.');

    var result = await client.auth.signInWithPassword({
      email: f.email,
      password: password
    });
    if (result.error) throw new Error(result.error.message || 'No se pudo iniciar sesión.');
    return result.data;
  }

  /** Provision + login. Solo al pagar. */
  async function ensureClientAccess(opts) {
    opts = opts || {};
    var f = opts.fields || readOrderFields();
    var err = validateFields(f);
    if (err) throw new Error(err);

    var provisioned = await provision(f);
    var welcome = welcomeFromFields(f);
    welcome.user_id = (provisioned && provisioned.user_id) || null;
    welcome.created = !!(provisioned && provisioned.created);
    stashWelcome(welcome);

    var session = null;
    try {
      session = await signInWithPhonePassword(f);
    } catch (signErr) {
      console.warn('[ClientAccount] sign-in', signErr);
    }
    return {
      provisioned: provisioned,
      session: session,
      portalUrl: (provisioned && provisioned.portal) || '/miperfil/',
      fields: f,
      welcome: welcome
    };
  }

  /** Imagen PNG con correo + contraseña enmascarada. */
  function downloadCredentialCard(welcome) {
    var w = welcome || readWelcome();
    if (!w || !w.email) throw new Error('No hay datos de cuenta para descargar.');
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

    ctx.fillStyle = '#888';
    ctx.font = '500 28px Manrope, Arial, sans-serif';
    ctx.fillText('360PREVENTA · MI PERFIL', 96, 160);

    ctx.fillStyle = '#fff';
    ctx.font = '400 64px Italiana, Georgia, serif';
    ctx.fillText('Tu cuenta', 96, 260);

    ctx.fillStyle = '#aaa';
    ctx.font = '400 28px Manrope, Arial, sans-serif';
    wrapText(ctx, 'Guarda estos datos. Entras en 360preventa.com/miperfil', 96, 320, 880, 36);

    drawField(ctx, 'Nombre', w.name || 'Cliente', 96, 460);
    drawField(ctx, 'Correo', w.email, 96, 620);
    drawField(ctx, 'Contraseña', w.password_masked || maskPassword(w.password || w.phone), 96, 780);

    ctx.fillStyle = '#666';
    ctx.font = '400 22px Manrope, Arial, sans-serif';
    ctx.fillText('La contraseña es tu celular sin +57.', 96, 980);
    ctx.fillText('https://360preventa.com/miperfil', 96, 1020);

    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = '360Preventa_MiPerfil_cuenta.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function drawField(ctx, label, value, x, y) {
    ctx.fillStyle = '#777';
    ctx.font = '600 22px Manrope, Arial, sans-serif';
    ctx.fillText(String(label).toUpperCase(), x, y);
    ctx.fillStyle = '#fff';
    ctx.font = '500 40px Manrope, Arial, sans-serif';
    ctx.fillText(String(value || '—'), x, y + 56);
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = String(text).split(' ');
    var line = '';
    var yy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line ? (line + ' ' + words[i]) : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = words[i];
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }

  global.ClientAccount = {
    phonePassword: phonePassword,
    maskPassword: maskPassword,
    readOrderFields: readOrderFields,
    validateFields: validateFields,
    provision: provision,
    signInWithPhonePassword: signInWithPhonePassword,
    ensureClientAccess: ensureClientAccess,
    stashWelcome: stashWelcome,
    readWelcome: readWelcome,
    clearWelcome: clearWelcome,
    welcomeFromFields: welcomeFromFields,
    downloadCredentialCard: downloadCredentialCard
  };
})(typeof window !== 'undefined' ? window : this);
