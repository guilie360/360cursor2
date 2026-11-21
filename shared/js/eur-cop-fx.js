/**
 * Conversor EUR → COP — tasa primaria desde Google Finance
 * (edge function eur-cop-rate). Dos páginas: Comisión → Showroom.
 */
(function () {
  var GOOGLE_FINANCE_URL = 'https://www.google.com/finance/quote/EUR-COP';
  var REFRESH_MS = 2 * 60 * 1000;
  var STORAGE_KEY = 'preventa_eur_cop_fx_v4';

  var PAGES = [
    {
      id: 'comision',
      title: 'Comisión',
      eyebrow: 'HUNTER',
      fieldLabel: 'Comisión (EUR)',
      note: 'Comisión Hunter estimada convertida a pesos (Google Finance).'
    },
    {
      id: 'showroom',
      title: 'Showroom',
      eyebrow: 'COTIZACIÓN',
      fieldLabel: 'Showroom (EUR)',
      note: 'Precio del showroom convertido a pesos (Google Finance).'
    }
  ];

  function supabaseBase() {
    return (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) ||
      'https://emefdwzdfnqgjohbtvvn.supabase.co';
  }
  function supabaseAnon() {
    return (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) ||
      'sb_publishable_GmJNU3DZQqPgNBi6QVa5bA_2h--bgKz';
  }

  var SOURCES = [
    {
      name: 'google-finance',
      fetch: async function (force) {
        var url = supabaseBase().replace(/\/$/, '') +
          '/functions/v1/eur-cop-rate' +
          (force ? ('?t=' + Date.now()) : '');
        var res = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            apikey: supabaseAnon(),
            Authorization: 'Bearer ' + supabaseAnon()
          }
        });
        if (!res.ok) throw new Error('google-finance HTTP ' + res.status);
        var data = await res.json();
        if (!data || !data.ok) throw new Error((data && data.error) || 'google-finance fail');
        var rate = Number(data.rate);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error('google-finance sin COP');
        return {
          rate: rate,
          updatedAt: data.fetched_at || new Date().toISOString(),
          source: 'google-finance'
        };
      }
    },
    {
      name: 'currency-api',
      fetch: async function (force) {
        var res = await fetch(
          'https://latest.currency-api.pages.dev/v1/currencies/eur.json',
          { cache: force ? 'no-store' : 'no-cache', mode: 'cors' }
        );
        if (!res.ok) throw new Error('currency-api HTTP ' + res.status);
        var data = await res.json();
        var rate = data && data.eur ? Number(data.eur.cop) : NaN;
        if (!Number.isFinite(rate) || rate <= 0) throw new Error('currency-api sin COP');
        return {
          rate: rate,
          updatedAt: data.date
            ? new Date(data.date + 'T12:00:00Z').toISOString()
            : new Date().toISOString(),
          source: 'currency-api'
        };
      }
    },
    {
      name: 'open-er-api',
      fetch: async function (force) {
        var res = await fetch('https://open.er-api.com/v6/latest/EUR', {
          cache: force ? 'no-store' : 'no-cache',
          mode: 'cors'
        });
        if (!res.ok) throw new Error('open-er-api HTTP ' + res.status);
        var data = await res.json();
        var rate = data && data.rates ? Number(data.rates.COP) : NaN;
        if (!Number.isFinite(rate) || rate <= 0) throw new Error('open-er-api sin COP');
        return {
          rate: rate,
          updatedAt: data.time_last_update_utc || new Date().toISOString(),
          source: 'open-er-api'
        };
      }
    }
  ];

  var state = {
    rate: null,
    updatedAt: null,
    source: '',
    loading: false,
    error: '',
    fetchGen: 0,
    pageIndex: 0
  };

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
    if (cached.savedAt && (Date.now() - Number(cached.savedAt)) > 30 * 60 * 1000) return;
    state.rate = Number(cached.rate);
    state.updatedAt = cached.updatedAt || null;
    state.source = cached.source || '';
  }

  async function fetchRate(force) {
    var gen = ++state.fetchGen;
    state.loading = true;
    state.error = '';
    paint();
    var lastErr = null;
    try {
      for (var i = 0; i < SOURCES.length; i++) {
        if (gen !== state.fetchGen) return state.rate;
        try {
          var got = await SOURCES[i].fetch(!!force);
          if (gen !== state.fetchGen) return state.rate;
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
      if (gen === state.fetchGen) {
        state.loading = false;
        paint();
      }
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

  function commissionEurAmount() {
    var el = document.getElementById('internoCommission') ||
      document.getElementById('hunterLiveCommission');
    if (!el) return 0;
    return parseMoney(el.textContent);
  }

  function pageEurAmount(index) {
    return index === 0 ? commissionEurAmount() : stickyEurAmount();
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
            '<div class="eyebrow" data-fx-eyebrow>HUNTER</div>' +
            '<strong class="eur-cop-fx-title" data-fx-title>Comisión</strong>' +
          '</div>' +
          '<button type="button" class="eur-cop-fx-close" data-fx-close aria-label="Cerrar">×</button>' +
        '</div>' +
        '<nav class="eur-cop-fx-pages" aria-label="Páginas del conversor">' +
          '<button type="button" class="eur-cop-fx-page-btn is-active" data-fx-page="0">Comisión</button>' +
          '<button type="button" class="eur-cop-fx-page-btn" data-fx-page="1">Showroom</button>' +
        '</nav>' +
        '<div class="eur-cop-fx-stage" data-fx-stage>' +
          '<div class="eur-cop-fx-sheet" data-fx-sheet>' +
            '<p class="eur-cop-fx-rate" data-fx-rate>Cargando tasa…</p>' +
            '<p class="eur-cop-fx-updated" data-fx-updated></p>' +
            '<label class="eur-cop-fx-field"><span data-fx-eur-label>Comisión (EUR)</span>' +
              '<input type="text" inputmode="decimal" data-fx-eur placeholder="0,00" autocomplete="off">' +
            '</label>' +
            '<label class="eur-cop-fx-field">Pesos (COP)' +
              '<input type="text" inputmode="decimal" data-fx-cop placeholder="0" autocomplete="off">' +
            '</label>' +
          '</div>' +
        '</div>' +
        '<div class="eur-cop-fx-actions">' +
          '<button type="button" class="btn" data-fx-refresh>Actualizar</button>' +
          '<a class="btn" data-fx-google href="' + GOOGLE_FINANCE_URL + '" target="_blank" rel="noopener">Ver en Google</a>' +
        '</div>' +
        '<p class="eur-cop-fx-note" data-fx-note>Comisión Hunter estimada convertida a pesos (Google Finance).</p>' +
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
      var btn = panel.querySelector('[data-fx-refresh]');
      if (btn) btn.disabled = true;
      fetchRate(true).then(function () {
        if (eurInput.value) fromEur();
      }).finally(function () {
        if (btn) btn.disabled = false;
      });
    });
    panel.querySelectorAll('[data-fx-page]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        setPage(Number(tab.getAttribute('data-fx-page')));
      });
    });
    panel.addEventListener('click', function (e) {
      if (e.target === panel) close();
    });
    document.addEventListener('keydown', function (e) {
      if (panel.classList.contains('hidden')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setPage(state.pageIndex + 1);
      if (e.key === 'ArrowLeft') setPage(state.pageIndex - 1);
    });

    panel._setEur = function (amount) {
      eurInput.value = Number(amount || 0).toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      fromEur();
    };
    panel._fromEur = fromEur;
    panel._applyPageChrome = applyPageChrome;
  }

  function applyPageChrome() {
    var page = PAGES[state.pageIndex] || PAGES[0];
    var panel = document.getElementById('eurCopFxPanel');
    if (!panel) return;
    var eyebrow = panel.querySelector('[data-fx-eyebrow]');
    var title = panel.querySelector('[data-fx-title]');
    var eurLabel = panel.querySelector('[data-fx-eur-label]');
    var note = panel.querySelector('[data-fx-note]');
    var sheet = panel.querySelector('[data-fx-sheet]');
    if (eyebrow) eyebrow.textContent = page.eyebrow;
    if (title) title.textContent = page.title;
    if (eurLabel) eurLabel.textContent = page.fieldLabel;
    if (note) note.textContent = page.note;
    panel.querySelectorAll('[data-fx-page]').forEach(function (tab) {
      tab.classList.toggle('is-active', Number(tab.getAttribute('data-fx-page')) === state.pageIndex);
    });
    if (sheet) {
      sheet.classList.remove('is-flip');
      void sheet.offsetWidth;
      sheet.classList.add('is-flip');
    }
  }

  function setPage(index) {
    var next = Math.max(0, Math.min(PAGES.length - 1, Number(index) || 0));
    if (next === state.pageIndex && document.getElementById('eurCopFxPanel')) {
      applyPageChrome();
      var panel = document.getElementById('eurCopFxPanel');
      if (panel && panel._setEur) panel._setEur(pageEurAmount(next));
      return;
    }
    state.pageIndex = next;
    ensureUi();
    applyPageChrome();
    var panel = document.getElementById('eurCopFxPanel');
    if (panel && panel._setEur) panel._setEur(pageEurAmount(next));
  }

  function paint() {
    ensureUi();
    var btn = document.getElementById('eurCopFxBtn');
    var hint = document.getElementById('eurCopFxRateHint');
    var rateEl = document.querySelector('[data-fx-rate]');
    var updatedEl = document.querySelector('[data-fx-updated]');
    var refreshBtn = document.querySelector('[data-fx-refresh]');
    if (hint) {
      hint.textContent = state.rate
        ? ('1€ ≈ ' + rateFmt.format(state.rate))
        : (state.loading ? '…' : '€/COP');
    }
    if (btn) btn.classList.toggle('is-loading', !!state.loading);
    if (refreshBtn) refreshBtn.classList.toggle('is-loading', !!state.loading);
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
        var srcLabel = state.source === 'google-finance' ? 'Google Finance' : state.source;
        updatedEl.textContent = 'Actualizado: ' + new Date(state.updatedAt).toLocaleString('es-ES') +
          (srcLabel ? (' · ' + srcLabel) : '');
      } else {
        updatedEl.textContent = '';
      }
    }
  }

  function open() {
    ensureUi();
    var panel = document.getElementById('eurCopFxPanel');
    var btn = document.getElementById('eurCopFxBtn');
    state.pageIndex = 0;
    panel.classList.remove('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    applyPageChrome();
    if (panel._setEur) panel._setEur(pageEurAmount(0));
    fetchRate(true).then(function () {
      if (panel._setEur) panel._setEur(pageEurAmount(state.pageIndex));
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
    // Solo cotizador interno (equipo). Público no muestra ni consulta la tasa.
    if (!document.body || !document.body.classList.contains('modo-interno')) return;
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
    close: close,
    setPage: setPage
  };
})();
