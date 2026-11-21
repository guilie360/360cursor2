/**
 * Conversor EUR → COP en vivo (referencia de mercado ≈ Google Finance).
 * Fuentes: currency-api (CDN) → fallback open.er-api. Enlace a Google EUR TO COP.
 */
(function () {
  var SOURCES = [
    {
      name: 'currency-api',
      url: 'https://latest.currency-api.pages.dev/v1/currencies/eur.json',
      parse: function (data) {
        var rate = data && data.eur ? Number(data.eur.cop) : NaN;
        var updatedAt = data && data.date
          ? new Date(data.date + 'T12:00:00Z').toISOString()
          : new Date().toISOString();
        return { rate: rate, updatedAt: updatedAt };
      }
    },
    {
      name: 'currency-api-jsdelivr',
      url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json',
      parse: function (data) {
        var rate = data && data.eur ? Number(data.eur.cop) : NaN;
        var updatedAt = data && data.date
          ? new Date(data.date + 'T12:00:00Z').toISOString()
          : new Date().toISOString();
        return { rate: rate, updatedAt: updatedAt };
      }
    },
    {
      name: 'open-er-api',
      url: 'https://open.er-api.com/v6/latest/EUR',
      parse: function (data) {
        var rate = data && data.rates ? Number(data.rates.COP) : NaN;
        return {
          rate: rate,
          updatedAt: data.time_last_update_utc || new Date().toISOString()
        };
      }
    }
  ];
  var GOOGLE_URL = 'https://www.google.com/search?q=EUR+TO+COP';
  var REFRESH_MS = 2 * 60 * 1000;
  var STORAGE_KEY = 'preventa_eur_cop_fx_v2';

  var state = {
    rate: null,
    updatedAt: null,
    source: '',
    loading: false,
    error: ''
  };

  var copFmt = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });
  var eurFmt = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2
  });
  var rateFmt = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function readCache() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Number.isFinite(Number(parsed.rate))) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeCache() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        rate: state.rate,
        updatedAt: state.updatedAt,
        source: state.source,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }

  function applyCache() {
    var cached = readCache();
    if (!cached) return;
    // Cache vieja (>30 min) no se usa como visible; solo arranque en red lenta
    if (cached.savedAt && (Date.now() - Number(cached.savedAt)) > 30 * 60 * 1000) return;
    state.rate = Number(cached.rate);
    state.updatedAt = cached.updatedAt || null;
    state.source = cached.source || '';
  }

  async function fetchFromSource(source, force) {
    var res = await fetch(source.url, {
      cache: force ? 'no-store' : 'no-cache',
      mode: 'cors'
    });
    if (!res.ok) throw new Error(source.name + ' HTTP ' + res.status);
    var data = await res.json();
    var parsed = source.parse(data) || {};
    var rate = Number(parsed.rate);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error(source.name + ' sin COP');
    return {
      rate: rate,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      source: source.name
    };
  }

  async function fetchRate(force) {
    if (state.loading) return state.rate;
    state.loading = true;
    state.error = '';
    paint();
    var lastErr = null;
    try {
      for (var i = 0; i < SOURCES.length; i++) {
        try {
          var got = await fetchFromSource(SOURCES[i], !!force);
          state.rate = got.rate;
          state.updatedAt = got.updatedAt;
          state.source = got.source;
          state.error = '';
          writeCache();
          return state.rate;
        } catch (err) {
          lastErr = err;
        }
      }
      if (!state.rate) state.error = 'No se pudo actualizar la tasa';
      else if (lastErr) state.error = 'Usando última tasa conocida';
      return state.rate;
    } finally {
      state.loading = false;
      paint();
    }
  }

  function parseMoney(raw) {
    var s = String(raw || '').trim().replace(/\s/g, '');
    if (!s) return 0;
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.indexOf(',') >= 0) {
      s = s.replace(',', '.');
    }
    var n = Number(s.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function stickyEurAmount() {
    var el = document.getElementById('stickyPrice');
    if (!el) return 0;
    return parseMoney(el.textContent);
  }

  function ensureUi() {
    if (document.getElementById('eurCopFxPanel')) return;
    var panel = document.createElement('div');
    panel.id = 'eurCopFxPanel';
    panel.className = 'eur-cop-fx-panel hidden';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Conversor EUR a COP');
    panel.innerHTML =
      '<div class="eur-cop-fx-card">' +
        '<div class="eur-cop-fx-head">' +
          '<div>' +
            '<div class="eyebrow">REFERENCIA</div>' +
            '<strong class="eur-cop-fx-title">EUR → COP</strong>' +
          '</div>' +
          '<button type="button" class="eur-cop-fx-close" data-fx-close aria-label="Cerrar">×</button>' +
        '</div>' +
        '<p class="eur-cop-fx-rate" data-fx-rate>Cargando tasa…</p>' +
        '<p class="eur-cop-fx-updated" data-fx-updated></p>' +
        '<label class="eur-cop-fx-field">Euros (EUR)' +
          '<input type="text" inputmode="decimal" data-fx-eur placeholder="0,00" autocomplete="off">' +
        '</label>' +
        '<label class="eur-cop-fx-field">Pesos (COP)' +
          '<input type="text" inputmode="decimal" data-fx-cop placeholder="0" autocomplete="off">' +
        '</label>' +
        '<div class="eur-cop-fx-actions">' +
          '<button type="button" class="btn" data-fx-refresh>Actualizar</button>' +
          '<a class="btn" data-fx-google href="' + GOOGLE_URL + '" target="_blank" rel="noopener">Ver en Google</a>' +
        '</div>' +
        '<p class="eur-cop-fx-note">Tasa mid-market en vivo (se actualiza sola). “Ver en Google” compara con Google Finance.</p>' +
      '</div>';
    document.body.appendChild(panel);

    var eurInput = panel.querySelector('[data-fx-eur]');
    var copInput = panel.querySelector('[data-fx-cop]');
    var syncing = false;

    function fromEur() {
      if (syncing || !state.rate) return;
      syncing = true;
      var eur = parseMoney(eurInput.value);
      copInput.value = eur ? Math.round(eur * state.rate).toLocaleString('es-CO') : '';
      syncing = false;
    }
    function fromCop() {
      if (syncing || !state.rate) return;
      syncing = true;
      var cop = parseMoney(copInput.value.replace(/\./g, ''));
      eurInput.value = cop ? (cop / state.rate).toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : '';
      syncing = false;
    }

    eurInput.addEventListener('input', fromEur);
    copInput.addEventListener('input', fromCop);
    panel.querySelector('[data-fx-close]').addEventListener('click', close);
    panel.querySelector('[data-fx-refresh]').addEventListener('click', function () {
      fetchRate(true).then(function () {
        if (eurInput.value) fromEur();
      });
    });
    panel.addEventListener('click', function (e) {
      if (e.target === panel) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.classList.contains('hidden')) close();
    });

    panel._setEur = function (amount) {
      eurInput.value = Number(amount || 0).toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      fromEur();
    };
  }

  function paint() {
    ensureUi();
    var btn = document.getElementById('eurCopFxBtn');
    var hint = document.getElementById('eurCopFxRateHint');
    var rateEl = document.querySelector('[data-fx-rate]');
    var updatedEl = document.querySelector('[data-fx-updated]');
    if (hint) {
      hint.textContent = state.rate
        ? ('1€ ≈ ' + rateFmt.format(state.rate))
        : (state.loading ? '…' : '€/COP');
    }
    if (btn) btn.classList.toggle('is-loading', !!state.loading);
    if (rateEl) {
      if (state.rate) {
        rateEl.textContent = '1 EUR = ' + rateFmt.format(state.rate) + ' COP';
      } else if (state.error) {
        rateEl.textContent = state.error;
      } else {
        rateEl.textContent = 'Cargando tasa…';
      }
    }
    if (updatedEl) {
      if (state.updatedAt) {
        updatedEl.textContent = 'Actualizado: ' + new Date(state.updatedAt).toLocaleString('es-ES') +
          (state.source ? (' · ' + state.source) : '');
      } else {
        updatedEl.textContent = '';
      }
    }
  }

  function open() {
    ensureUi();
    var panel = document.getElementById('eurCopFxPanel');
    var btn = document.getElementById('eurCopFxBtn');
    panel.classList.remove('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    if (panel._setEur) panel._setEur(stickyEurAmount());
    fetchRate(true).then(function () {
      if (panel._setEur) panel._setEur(stickyEurAmount());
    });
  }

  function close() {
    var panel = document.getElementById('eurCopFxPanel');
    var btn = document.getElementById('eurCopFxBtn');
    if (panel) panel.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggle() {
    var panel = document.getElementById('eurCopFxPanel');
    if (!panel || panel.classList.contains('hidden')) open();
    else close();
  }

  function mount() {
    var btn = document.getElementById('eurCopFxBtn');
    if (!btn || btn.dataset.fxBound === '1') return;
    btn.dataset.fxBound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      toggle();
    });
    applyCache();
    paint();
    fetchRate(false);
    setInterval(function () { fetchRate(false); }, REFRESH_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.PreventaEurCopFx = {
    refresh: function () { return fetchRate(true); },
    getRate: function () { return state.rate; },
    open: open,
    close: close
  };
})();
