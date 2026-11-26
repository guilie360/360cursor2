/**
 * PDF de cotización — mismo render que Cotizar (panel / cotizador).
 * API: QuotePdf.buildSummaryCanvas(data) → canvas
 *      QuotePdf.createSinglePagePdf(jpegDataUrl, canvas) → Blob
 *      QuotePdf.downloadBlob(blob, filename)
 *      QuotePdf.downloadFromQuote(quoteRow) → regenera desde quote_snapshot.pdf
 */
(function (global) {
  var euro = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  function moneyFromCents(cents) {
    return euro.format((Number(cents) || 0) / 100);
  }

  function moneyFromEuros(n) {
    return euro.format(Number(n) || 0);
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function loadLogo() {
    var logo = new Image();
    var candidates = [
      '/panel_gestion/assets/logo-pdf.png',
      '/panel_gestion/assets/logo.png',
      'assets/logo-pdf.png',
      'assets/logo.png'
    ];
    return new Promise(function (resolve) {
      var i = 0;
      function tryNext() {
        if (i >= candidates.length) {
          logo.removeAttribute('src');
          return resolve(logo);
        }
        logo.onload = function () { resolve(logo); };
        logo.onerror = function () { i += 1; tryNext(); };
        logo.src = candidates[i++];
      }
      tryNext();
    });
  }

  /**
   * data: { name, email, totalText, rows:[{label,value}], date? }
   */
  async function buildSummaryCanvas(data) {
    data = data || {};
    await Promise.all([
      document.fonts.load('400 52px Italiana'),
      document.fonts.load('400 22px Manrope'),
      document.fonts.load('700 22px Manrope')
    ]).catch(function () {});

    var name = String(data.name || '').trim();
    var email = String(data.email || '').trim();
    var totalText = String(data.totalText || '').trim() || '—';
    var rows = Array.isArray(data.rows) ? data.rows.filter(function (r) {
      return r && (r.label || r.value);
    }) : [];
    var dateObj = data.date ? new Date(data.date) : new Date();
    if (isNaN(dateObj.getTime())) dateObj = new Date();

    var logo = await loadLogo();

    var css = getComputedStyle(document.documentElement);
    function tk(n, d) { return css.getPropertyValue(n).trim() || d; }
    var T = {
      bg: '#0d0d0d',
      ink: tk('--ink', '#f1eee8'),
      muted: tk('--muted', '#b2a797'),
      acc: tk('--accent', '#c5a675'),
      gold: tk('--gold-soft', '#d0b88f')
    };
    var SERIF = 'Italiana,Georgia,serif';
    var SANS = 'Manrope,Arial,sans-serif';

    var W = 1200;
    var H = 1697;
    var pad = 92;
    var right = W - pad;
    var probe = document.createElement('canvas').getContext('2d');
    function wrap(text, font, max) {
      probe.font = font;
      var lines = [];
      var line = '';
      String(text || '').split(/\s+/).forEach(function (word) {
        var next = line ? line + ' ' + word : word;
        if (line && probe.measureText(next).width > max) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line);
      return lines.length ? lines : [''];
    }

    var fontSize = Math.max(15, 22 - Math.max(0, rows.length - 12) * 0.42);
    var lineH = Math.round(fontSize * 1.38);
    var rowPad = Math.max(8, 22 - Math.max(0, rows.length - 12) * 0.7);
    var prep;
    var contentHeight;
    function buildRows() {
      prep = rows.map(function (r) {
        return {
          L: wrap(r.label, '400 ' + fontSize + 'px ' + SANS, 620),
          V: wrap(r.value, '700 ' + fontSize + 'px ' + SANS, 330)
        };
      });
      contentHeight = prep.reduce(function (sum, r) {
        return sum + Math.max(r.L.length, r.V.length) * lineH + rowPad;
      }, 0);
    }
    buildRows();
    var headerBottom = 405;
    var footerHeight = 245;
    var available = H - headerBottom - footerHeight - 100;
    while (contentHeight > available && fontSize > 14) {
      fontSize -= 0.5;
      lineH = Math.round(fontSize * 1.34);
      rowPad = Math.max(6, rowPad - 1);
      buildRows();
    }
    var rowsStart = headerBottom;
    var totalH = 112;
    var ctaH = 62;
    var totalY = Math.max(rowsStart + contentHeight + 28, H - footerHeight - 140);
    var ctaY = totalY + totalH + 34;

    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var c = canvas.getContext('2d');
    function rr(x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    c.fillStyle = T.bg;
    c.fillRect(0, 0, W, H);
    var ambient = c.createRadialGradient(W * 0.78, 90, 20, W * 0.78, 90, 720);
    ambient.addColorStop(0, 'rgba(205,178,138,.045)');
    ambient.addColorStop(0.42, 'rgba(205,178,138,.012)');
    ambient.addColorStop(1, 'rgba(205,178,138,0)');
    c.fillStyle = ambient;
    c.fillRect(0, 0, W, H);
    var lowerLight = c.createRadialGradient(W * 0.18, H * 0.82, 10, W * 0.18, H * 0.82, 560);
    lowerLight.addColorStop(0, 'rgba(255,255,255,.018)');
    lowerLight.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = lowerLight;
    c.fillRect(0, 0, W, H);

    var cx = 30;
    var cy = 30;
    var cw = W - 60;
    var ch = H - 60;
    c.save();
    c.shadowColor = 'rgba(0,0,0,.88)';
    c.shadowBlur = 58;
    c.shadowOffsetY = 22;
    var card = c.createLinearGradient(cx, cy, cx, cy + ch);
    card.addColorStop(0, '#1b1b1b');
    card.addColorStop(0.48, '#151515');
    card.addColorStop(1, '#101010');
    rr(cx, cy, cw, ch, 22);
    c.fillStyle = card;
    c.fill();
    c.restore();
    rr(cx, cy, cw, ch, 22);
    c.strokeStyle = 'rgba(205,178,138,.20)';
    c.lineWidth = 1.5;
    c.stroke();

    var logoW = 0;
    if (logo.naturalWidth) {
      var logoH = 82;
      logoW = logoH * logo.naturalWidth / logo.naturalHeight;
      c.save();
      c.shadowColor = 'rgba(0,0,0,.35)';
      c.shadowBlur = 14;
      c.shadowOffsetY = 4;
      c.drawImage(logo, pad, 70, logoW, logoH);
      c.restore();
      logoW += 24;
    }
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.fillStyle = T.acc;
    c.font = '700 15px ' + SANS;
    try { c.letterSpacing = '3px'; } catch (e0) {}
    c.fillText('360 SHOWROOM  ·  PROPUESTA COMERCIAL', pad + logoW, 111);
    try { c.letterSpacing = '0px'; } catch (e1) {}
    c.fillStyle = T.ink;
    c.font = '400 58px ' + SERIF;
    c.fillText('Resumen de tu showroom', pad, 222);
    c.fillStyle = T.muted;
    c.font = '400 22px ' + SANS;
    c.fillText('Configuración y presupuesto personalizado', pad, 266);

    c.save();
    c.shadowColor = 'rgba(0,0,0,.52)';
    c.shadowBlur = 26;
    c.shadowOffsetY = 10;
    rr(pad, 296, W - 2 * pad, 82, 13);
    c.fillStyle = '#111111';
    c.fill();
    c.restore();
    rr(pad, 296, W - 2 * pad, 82, 13);
    c.strokeStyle = 'rgba(205,178,138,.17)';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = T.gold;
    c.font = '400 25px ' + SERIF;
    c.textAlign = 'left';
    c.fillText(name || 'Cliente', pad + 22, 330);
    c.fillStyle = T.muted;
    c.font = '400 16px ' + SANS;
    c.fillText(email || '', pad + 22, 355);
    c.textAlign = 'right';
    c.fillStyle = '#918777';
    c.font = '500 14px ' + SANS;
    c.fillText(
      new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(dateObj),
      right - 22,
      345
    );

    c.strokeStyle = 'rgba(205,178,138,.45)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(pad, 397);
    c.lineTo(right, 397);
    c.stroke();

    var y = rowsStart;
    prep.forEach(function (r, i) {
      var n = Math.max(r.L.length, r.V.length);
      var rh = n * lineH + rowPad;
      if (i % 2 === 0) {
        c.save();
        c.shadowColor = 'rgba(0,0,0,.48)';
        c.shadowBlur = 16;
        c.shadowOffsetY = 5;
        rr(pad - 12, y, W - 2 * pad + 24, rh - 3, 9);
        c.fillStyle = 'rgba(255,255,255,.025)';
        c.fill();
        c.restore();
      }
      var baseline = y + Math.max(18, (rh - n * lineH) / 2) + fontSize;
      c.textAlign = 'left';
      c.fillStyle = T.muted;
      c.font = '400 ' + fontSize + 'px ' + SANS;
      r.L.forEach(function (t, k) { c.fillText(t, pad, baseline + k * lineH); });
      c.textAlign = 'right';
      c.fillStyle = T.ink;
      c.font = '700 ' + fontSize + 'px ' + SANS;
      r.V.forEach(function (t, k) { c.fillText(t, right, baseline + k * lineH); });
      c.strokeStyle = 'rgba(205,178,138,.13)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(pad, y + rh - 2);
      c.lineTo(right, y + rh - 2);
      c.stroke();
      y += rh;
    });

    var totalYFinal = Math.min(Math.max(y + 28, totalY), H - ctaH - 22 - totalH - 90);
    var mid = totalYFinal + totalH / 2;
    c.save();
    c.shadowColor = 'rgba(0,0,0,.76)';
    c.shadowBlur = 34;
    c.shadowOffsetY = 12;
    var totalGrad = c.createLinearGradient(pad, totalYFinal, right, totalYFinal + totalH);
    totalGrad.addColorStop(0, '#201e19');
    totalGrad.addColorStop(0.55, '#191816');
    totalGrad.addColorStop(1, '#121212');
    rr(pad - 12, totalYFinal, W - 2 * pad + 24, totalH, 15);
    c.fillStyle = totalGrad;
    c.fill();
    c.restore();
    rr(pad - 12, totalYFinal, W - 2 * pad + 24, totalH, 15);
    c.strokeStyle = 'rgba(205,178,138,.48)';
    c.lineWidth = 1.5;
    c.stroke();
    c.textAlign = 'left';
    c.fillStyle = T.ink;
    c.font = '400 42px ' + SERIF;
    c.fillText('Total estimado', pad + 10, mid + 14);
    c.textAlign = 'right';
    c.fillStyle = T.gold;
    c.font = '400 54px ' + SERIF;
    c.fillText(totalText, right - 10, mid + 17);

    var bw = 420;
    var gap = 28;
    var lx = (W - (bw * 2 + gap)) / 2;
    var waMsg = 'Hola, soy ' + (name || 'cliente') +
      '. Vi mi cotización de showroom en 360Preventa (total estimado ' + totalText +
      ') y quiero hablar con un asesor.';
    var links = [
      { x: lx, url: 'https://360preventa.com' },
      { x: lx + bw + gap, url: 'https://wa.me/573226834084?text=' + encodeURIComponent(waMsg) }
    ];
    function cta(x, label) {
      c.save();
      c.shadowColor = 'rgba(0,0,0,.72)';
      c.shadowBlur = 24;
      c.shadowOffsetY = 9;
      var g = c.createLinearGradient(x, ctaY, x, ctaY + ctaH);
      g.addColorStop(0, '#1b1b1b');
      g.addColorStop(1, '#0b0b0b');
      rr(x, ctaY, bw, ctaH, 13);
      c.fillStyle = g;
      c.fill();
      c.restore();
      rr(x, ctaY, bw, ctaH, 13);
      c.strokeStyle = 'rgba(205,178,138,.56)';
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = '#eee8dd';
      c.font = '700 17px ' + SANS;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(label, x + bw / 2, ctaY + ctaH / 2 + 1);
      c.textBaseline = 'alphabetic';
    }
    cta(links[0].x, 'VER DEMO');
    cta(links[1].x, 'CONTACTAR ASESOR');
    canvas._links = links.map(function (l) {
      return { x: l.x, y: ctaY, w: bw, h: ctaH, url: l.url };
    });

    c.fillStyle = '#8f887d';
    c.font = '400 13px ' + SANS;
    c.textAlign = 'center';
    c.fillText('360PREVENTA.COM  ·  SHOWROOM INMOBILIARIO', W / 2, H - 76);
    return canvas;
  }

  function createSinglePagePdf(jpegDataUrl, canvas) {
    var pageW = 595.28;
    var pageH = 841.89;
    var pxW = canvas.width;
    var pxH = Math.round(pxW * pageH / pageW);
    var sc = Math.min(1, pxH / canvas.height);
    var dw = canvas.width * sc;
    var dh = canvas.height * sc;
    var ox = (pxW - dw) / 2;
    var k = pageW / pxW;
    var slice = document.createElement('canvas');
    slice.width = pxW;
    slice.height = pxH;
    var ctx = slice.getContext('2d');
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, pxW, pxH);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, ox, 0, dw, dh);
    var data = slice.toDataURL('image/jpeg', 0.96).split(',')[1];
    var binary = atob(data);
    var bytes = new Uint8Array(binary.length);
    for (var j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
    function f(n) { return n.toFixed(2); }
    function esc(u) { return String(u || '').replace(/[()\\]/g, '\\$&'); }
    var links = (canvas._links || []).map(function (l) {
      return {
        r: [
          f((ox + l.x * sc) * k),
          f(pageH - (l.y + l.h) * sc * k),
          f((ox + (l.x + l.w) * sc) * k),
          f(pageH - l.y * sc * k)
        ],
        url: l.url
      };
    });
    var enc = new TextEncoder();
    var chunks = [];
    var offsets = [0];
    var length = 0;
    function addBytes(b) { chunks.push(b); length += b.length; }
    function addText(t) { addBytes(enc.encode(t)); }
    var content = 'q\n' + pageW + ' 0 0 ' + pageH + ' 0 0 cm\n/Im0 Do\nQ';
    var annots = links.length
      ? ' /Annots [' + links.map(function (_, i) { return (6 + i) + ' 0 R'; }).join(' ') + ']'
      : '';
    addText('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    offsets[1] = length; addText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    offsets[2] = length; addText('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    offsets[3] = length;
    addText('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageW + ' ' + pageH +
      '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R' + annots + ' >>\nendobj\n');
    offsets[4] = length;
    addText('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + pxW + ' /Height ' + pxH +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + bytes.length +
      ' >>\nstream\n');
    addBytes(bytes);
    addText('\nendstream\nendobj\n');
    offsets[5] = length;
    addText('5 0 obj\n<< /Length ' + enc.encode(content).length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
    links.forEach(function (l, i) {
      offsets[6 + i] = length;
      addText((6 + i) + ' 0 obj\n<< /Type /Annot /Subtype /Link /Rect [' + l.r.join(' ') +
        '] /Border [0 0 0] /A << /S /URI /URI (' + esc(l.url) + ') >> >>\nendobj\n');
    });
    var total = 6 + links.length;
    var xref = length;
    addText('xref\n0 ' + total + '\n0000000000 65535 f \n');
    for (var i = 1; i < total; i++) {
      addText(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    }
    addText('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  var PACKAGE_TITLES = {
    apartment: 'Showroom Completo Apartamento',
    studio: 'Showroom Completo Apartestudio',
    coliving: 'Showroom Completo Co-living'
  };

  /** Construye filas de respaldo si la cotización antigua no guardó pdf.rows */
  function fallbackRowsFromSnapshot(snap, quote) {
    snap = snap || {};
    var rows = [];
    if (snap.mode === 'package') {
      var title = PACKAGE_TITLES[snap.package] || String(snap.package || 'Showroom Completo');
      rows.push({ label: 'Paquete', value: title });
      if (snap.area != null && snap.area !== '') {
        rows.push({ label: 'Superficie total del inmueble', value: snap.area + ' m²' });
      }
      rows.push({ label: 'Base completa del showroom', value: 'Incluida' });
      rows.push({ label: 'Todos los espacios interiores existentes', value: 'Incluidos sin límite' });
      rows.push({ label: 'Reel Ads promocional', value: 'Incluido' });
      rows.push({ label: 'Pack de imágenes verticales', value: 'Incluido' });
    } else if (snap.mode === 'manual') {
      if (snap.type) rows.push({ label: 'Tipo de inmueble', value: String(snap.type) });
      if (snap.area != null && snap.area !== '') {
        rows.push({ label: 'Superficie', value: snap.area + ' m²' });
      }
      if (snap.floors != null && snap.floors !== '') {
        rows.push({ label: 'Plantas 3D', value: String(snap.floors) });
      }
    } else {
      var label = (quote && quote.proyecto_label) || 'Showroom 360Preventa';
      rows.push({ label: 'Proyecto', value: label });
    }
    return rows;
  }

  function pdfDataFromQuote(quote) {
    quote = quote || {};
    var snap = quote.quote_snapshot || {};
    var pdf = snap.pdf || null;
    var name = (pdf && pdf.customerName) || quote.customer_name || '';
    var email = (pdf && pdf.customerEmail) || quote.customer_email || '';
    var rows = (pdf && Array.isArray(pdf.rows) && pdf.rows.length)
      ? pdf.rows
      : fallbackRowsFromSnapshot(snap, quote);
    var totalText = (pdf && pdf.totalText) ||
      (snap.total != null ? moneyFromEuros(snap.total) : '') ||
      moneyFromCents(quote.total_cents);
    return {
      name: name,
      email: email,
      totalText: totalText,
      rows: rows,
      date: (pdf && pdf.createdAt) || quote.created_at || null,
      exact: !!(pdf && Array.isArray(pdf.rows) && pdf.rows.length)
    };
  }

  async function downloadFromQuote(quote, opts) {
    opts = opts || {};
    var data = pdfDataFromQuote(quote);
    var canvas = await buildSummaryCanvas(data);
    var jpeg = canvas.toDataURL('image/jpeg', 0.96);
    var pdf = createSinglePagePdf(jpeg, canvas);
    var safe = String(data.name || quote.proyecto_label || 'Cliente')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Cliente';
    var filename = opts.filename || ('Showroom_Cotizacion_' + safe + '.pdf');
    downloadBlob(pdf, filename);
    return { exact: data.exact, filename: filename };
  }

  global.QuotePdf = {
    buildSummaryCanvas: buildSummaryCanvas,
    createSinglePagePdf: createSinglePagePdf,
    downloadBlob: downloadBlob,
    pdfDataFromQuote: pdfDataFromQuote,
    downloadFromQuote: downloadFromQuote,
    moneyFromCents: moneyFromCents
  };
})(typeof window !== 'undefined' ? window : globalThis);
