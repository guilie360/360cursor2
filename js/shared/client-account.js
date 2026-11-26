/**
 * Cuenta cliente (Mi perfil): email = usuario, celular (sin +57) = contraseña.
 * Se provisiona al pagar o descargar cotización.
 */
(function (global) {
  function phonePassword(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (digits.indexOf('57') === 0 && digits.length >= 12) digits = digits.slice(2);
    else if (digits.indexOf('34') === 0 && digits.length >= 11) digits = digits.slice(2);
    else if (digits.charAt(0) === '0' && digits.length > 1) digits = digits.replace(/^0+/, '');
    return digits;
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

  /** Provision + login. Usar antes de pagar o tras guardar cotización. */
  async function ensureClientAccess(opts) {
    opts = opts || {};
    var f = opts.fields || readOrderFields();
    var err = validateFields(f);
    if (err) throw new Error(err);

    var provisioned = await provision(f);
    var session = null;
    try {
      session = await signInWithPhonePassword(f);
    } catch (signErr) {
      // Cuenta creada pero login falló: el portal sigue siendo usable con login manual
      console.warn('[ClientAccount] sign-in', signErr);
    }
    return {
      provisioned: provisioned,
      session: session,
      portalUrl: (provisioned && provisioned.portal) || '/miperfil/',
      fields: f
    };
  }

  global.ClientAccount = {
    phonePassword: phonePassword,
    readOrderFields: readOrderFields,
    validateFields: validateFields,
    provision: provision,
    signInWithPhonePassword: signInWithPhonePassword,
    ensureClientAccess: ensureClientAccess
  };
})(typeof window !== 'undefined' ? window : this);
