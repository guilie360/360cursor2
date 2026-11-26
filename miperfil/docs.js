/**
 * Mi perfil — Mis documentos: cotización, contrato, invoice.
 */
(function () {
  var euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  var state = {
    quotes: [],
    pedido: null,
    cobros: []
  };

  function $(id) { return document.getElementById(id); }

  function escapeHtml(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function money(cents) {
    return euro.format((Number(cents) || 0) / 100);
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch (e) {
      return '—';
    }
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

  function functionsBase() {
    var url = (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) || '';
    return url ? url.replace(/\/$/, '') + '/functions/v1' : '';
  }

  function anonKey() {
    return (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) || '';
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 800);
  }

  function snapshotLines(snap) {
    var lines = [];
    if (!snap || typeof snap !== 'object') return lines;
    var pkg = snap.packageName || snap.paquete || snap.package;
    if (pkg && typeof pkg === 'object') pkg = pkg.name || pkg.label || '';
    if (pkg) lines.push('Paquete · ' + pkg);
    if (snap.area != null && snap.area !== '') lines.push(snap.area + ' m²');
    if (snap.floors != null && snap.floors !== '') lines.push(snap.floors + ' planta(s)');
    if (snap.type) lines.push(String(snap.type));
    if (snap.mode) lines.push('Modo · ' + snap.mode);
    return lines;
  }

  function buildQuoteCanvas(quote) {
    var W = 1240;
    var H = 1754;
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    ctx.fillStyle = '#888';
    ctx.font = '500 22px Manrope, Arial, sans-serif';
    ctx.fillText('360PREVENTA · COTIZACIÓN', 96, 140);

    ctx.fillStyle = '#fff';
    ctx.font = '400 64px Georgia, serif';
    ctx.fillText('Tu cotización', 96, 230);

    var label = String(quote.proyecto_label || 'Showroom 360Preventa');
    ctx.fillStyle = '#ccc';
    ctx.font = '500 28px Manrope, Arial, sans-serif';
    wrapText(ctx, label, 96, 310, W - 192, 38);

    ctx.fillStyle = '#fff';
    ctx.font = '400 72px Georgia, serif';
    ctx.fillText(money(quote.total_cents), 96, 480);

    ctx.fillStyle = '#999';
    ctx.font = '500 22px Manrope, Arial, sans-serif';
    ctx.fillText('Total · IVA incluido según checkout', 96, 530);

    var y = 620;
    var lines = snapshotLines(quote.quote_snapshot);
    lines.forEach(function (line) {
      ctx.fillStyle = '#ddd';
      ctx.font = '500 26px Manrope, Arial, sans-serif';
      ctx.fillText(line, 96, y);
      y += 44;
    });

    y = Math.max(y + 40, 780);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(96, y, W - 192, 180);
    ctx.fillStyle = '#aaa';
    ctx.font = '500 20px Manrope, Arial, sans-serif';
    ctx.fillText('Cliente', 120, y + 48);
    ctx.fillStyle = '#fff';
    ctx.font = '500 28px Manrope, Arial, sans-serif';
    ctx.fillText(String(quote.customer_name || '—'), 120, y + 92);
    ctx.fillStyle = '#bbb';
    ctx.font = '500 22px Manrope, Arial, sans-serif';
    ctx.fillText(String(quote.customer_email || ''), 120, y + 132);

    ctx.fillStyle = '#777';
    ctx.font = '500 20px Manrope, Arial, sans-serif';
    ctx.fillText('Fecha · ' + fmtDate(quote.created_at), 96, H - 120);
    ctx.fillText('360preventa.com', 96, H - 80);

    return canvas;
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    var words = String(text || '').split(/\s+/);
    var line = '';
    var yy = y;
    words.forEach(function (w) {
      var test = line ? (line + ' ' + w) : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = w;
        yy += lineH;
      } else {
        line = test;
      }
    });
    if (line) ctx.fillText(line, x, yy);
  }

  function downloadQuote(quote) {
    var canvas = buildQuoteCanvas(quote);
    var jpeg = canvas.toDataURL('image/jpeg', 0.94);
    // Rebuild PDF with actual canvas size
    var pageW = 595.28;
    var pageH = 841.89;
    var pxW = canvas.width;
    var pxH = canvas.height;
    var data = jpeg.split(',')[1];
    var binary = atob(data);
    var bytes = new Uint8Array(binary.length);
    for (var j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
    var enc = new TextEncoder();
    var chunks = [];
    var offsets = [0];
    var length = 0;
    function addBytes(b) { chunks.push(b); length += b.length; }
    function addText(t) { addBytes(enc.encode(t)); }
    var content = 'q\n' + pageW + ' 0 0 ' + pageH + ' 0 0 cm\n/Im0 Do\nQ';
    addText('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    offsets[1] = length; addText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    offsets[2] = length; addText('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    offsets[3] = length; addText('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageW + ' ' + pageH + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n');
    offsets[4] = length;
    addText('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + pxW + ' /Height ' + pxH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + bytes.length + ' >>\nstream\n');
    addBytes(bytes);
    addText('\nendstream\nendobj\n');
    offsets[5] = length;
    addText('5 0 obj\n<< /Length ' + enc.encode(content).length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
    var xref = length;
    addText('xref\n0 6\n0000000000 65535 f \n');
    for (var i = 1; i < 6; i++) addText(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    addText('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    var blob = new Blob(chunks, { type: 'application/pdf' });
    var safe = String(quote.proyecto_label || 'Showroom').replace(/[^\w\-]+/g, '_').slice(0, 40);
    downloadBlob(blob, 'Cotizacion_' + safe + '.pdf');
  }

  function renderDocs() {
    var list = $('docsList');
    if (!list) return;
    var cards = [];

    // Cotizaciones
    if (state.quotes.length) {
      state.quotes.forEach(function (q, idx) {
        cards.push(
          '<article class="doc-card" data-doc="quote" data-quote-idx="' + idx + '">' +
            '<div class="doc-card-top"><span class="doc-kind">Cotización</span><span class="doc-date">' + escapeHtml(fmtDate(q.created_at)) + '</span></div>' +
            '<h3>' + escapeHtml(q.proyecto_label || 'Showroom') + '</h3>' +
            '<p class="desc">' + escapeHtml(money(q.total_cents)) + ' · guardada al cotizar</p>' +
            '<button type="button" class="btn" data-dl-quote="' + idx + '">Descargar PDF</button>' +
          '</article>'
        );
      });
    } else {
      cards.push(
        '<article class="doc-card is-empty">' +
          '<div class="doc-card-top"><span class="doc-kind">Cotización</span></div>' +
          '<h3>Aún no hay cotización</h3>' +
          '<p class="desc">Se guarda automáticamente al descargar el PDF en el cotizador.</p>' +
        '</article>'
      );
    }

    // Contrato
    var contrato = state.pedido && state.pedido.contrato_url;
    if (contrato) {
      cards.push(
        '<article class="doc-card" data-doc="contrato">' +
          '<div class="doc-card-top"><span class="doc-kind">Contrato</span><span class="doc-status is-ready">Listo para firmar</span></div>' +
          '<h3>' + escapeHtml((state.pedido && state.pedido.proyecto_label) || 'Contrato de servicios') + '</h3>' +
          '<p class="desc">Ábrelo para revisar y firmar.</p>' +
          '<a class="btn primary" href="' + escapeHtml(contrato) + '" target="_blank" rel="noopener">Abrir contrato</a>' +
        '</article>'
      );
    } else {
      cards.push(
        '<article class="doc-card is-pending" data-doc="contrato">' +
          '<div class="doc-card-top"><span class="doc-kind">Contrato</span><span class="doc-status">Pendiente</span></div>' +
          '<h3>Contrato para firmar</h3>' +
          '<p class="desc">Cuando el equipo lo publique, aparecerá aquí el enlace.</p>' +
        '</article>'
      );
    }

    // Invoices / cobros
    var paid = (state.cobros || []).filter(function (c) {
      return String(c.status || '').toLowerCase() === 'cobrado' && c.paddle_transaction_id;
    });
    if (paid.length) {
      paid.forEach(function (c) {
        cards.push(
          '<article class="doc-card" data-doc="invoice" data-cobro-id="' + escapeHtml(c.id) + '">' +
            '<div class="doc-card-top"><span class="doc-kind">Invoice</span><span class="doc-date">' + escapeHtml(fmtDate(c.paid_at || c.created_at)) + '</span></div>' +
            '<h3>' + escapeHtml(c.concepto || 'Anticipo') + '</h3>' +
            '<p class="desc">' + escapeHtml(money(c.amount_cents)) + ' · factura Paddle</p>' +
            '<button type="button" class="btn" data-dl-invoice="' + escapeHtml(c.id) + '">Descargar invoice</button>' +
          '</article>'
        );
      });
    } else {
      cards.push(
        '<article class="doc-card is-pending" data-doc="invoice">' +
          '<div class="doc-card-top"><span class="doc-kind">Invoice</span><span class="doc-status">Pendiente</span></div>' +
          '<h3>Invoice del anticipo</h3>' +
          '<p class="desc">Disponible cuando el anticipo esté cobrado.</p>' +
        '</article>'
      );
    }

    list.innerHTML = cards.join('');
  }

  async function loadDocs() {
    var list = $('docsList');
    if (list) list.innerHTML = '<p class="desc">Cargando documentos…</p>';
    try {
      var sb = client();
      var session = await sb.auth.getSession();
      var user = session && session.data && session.data.session && session.data.session.user;
      if (!user) throw new Error('Sesión expirada.');

      var email = String(user.email || '').toLowerCase();
      var quotesRes = await sb
        .from('panel_cotizaciones')
        .select('id,customer_name,customer_email,proyecto_label,total_cents,quote_snapshot,created_at,pedido_id')
        .eq('customer_email', email)
        .order('created_at', { ascending: false })
        .limit(20);

      var pedRes = await sb
        .from('panel_pedidos')
        .select('id,customer_name,customer_email,proyecto_label,status,contrato_url,quote_total_cents,quote_snapshot,deposit_cents,created_at')
        .eq('customer_email', email)
        .order('created_at', { ascending: false })
        .limit(1);

      var pedido = (pedRes.data && pedRes.data[0]) || null;
      var cobros = [];
      if (pedido && pedido.id) {
        var cobRes = await sb
          .from('panel_cobros')
          .select('id,concepto,amount_cents,status,payment_stage,paddle_transaction_id,paid_at,created_at')
          .eq('pedido_id', pedido.id)
          .order('created_at', { ascending: false })
          .limit(10);
        cobros = cobRes.data || [];
      }

      // Fallback: if no quote rows but pedido has total, synthesize one card
      state.quotes = quotesRes.data || [];
      if (!state.quotes.length && pedido && pedido.quote_total_cents) {
        state.quotes = [{
          id: 'pedido:' + pedido.id,
          customer_name: pedido.customer_name,
          customer_email: pedido.customer_email || email,
          proyecto_label: pedido.proyecto_label,
          total_cents: pedido.quote_total_cents,
          quote_snapshot: pedido.quote_snapshot,
          created_at: pedido.created_at
        }];
      }

      state.pedido = pedido;
      state.cobros = cobros;
      renderDocs();
    } catch (err) {
      if (list) {
        list.innerHTML = '<p class="desc miperfil-error">' + escapeHtml(err.message || 'No se pudieron cargar') + '</p>';
      }
    }
  }

  async function downloadInvoice(cobroId) {
    var sb = client();
    var session = await sb.auth.getSession();
    var token = session && session.data && session.data.session && session.data.session.access_token;
    if (!token) throw new Error('Sesión expirada.');
    var res = await fetch(functionsBase() + '/client-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey(),
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ cobro_id: cobroId || undefined })
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error(data.error || 'No se pudo obtener el invoice');
    if (!data.url) throw new Error('Sin URL de invoice');
    window.open(data.url, '_blank', 'noopener');
  }

  function bind() {
    var list = $('docsList');
    if (!list || list.dataset.bound) return;
    list.dataset.bound = '1';
    list.addEventListener('click', async function (e) {
      var qBtn = e.target.closest('[data-dl-quote]');
      if (qBtn) {
        e.preventDefault();
        var idx = Number(qBtn.getAttribute('data-dl-quote'));
        var quote = state.quotes[idx];
        if (!quote) return;
        qBtn.disabled = true;
        try {
          downloadQuote(quote);
        } finally {
          qBtn.disabled = false;
        }
        return;
      }
      var iBtn = e.target.closest('[data-dl-invoice]');
      if (iBtn) {
        e.preventDefault();
        iBtn.disabled = true;
        var prev = iBtn.textContent;
        iBtn.textContent = 'Preparando…';
        try {
          await downloadInvoice(iBtn.getAttribute('data-dl-invoice'));
        } catch (err) {
          alert(err.message || 'No se pudo descargar el invoice');
        } finally {
          iBtn.disabled = false;
          iBtn.textContent = prev || 'Descargar invoice';
        }
      }
    });
  }

  window.BoxiesMiPerfilDocs = {
    load: loadDocs,
    bind: bind
  };
})();
