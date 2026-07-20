console.log("BOOT ENTER js/style-engine/visual-audit/visual-audit-storage.js");
try{if(typeof BootDebug!=='undefined')BootDebug.log('ENTER file-eval js/style-engine/visual-audit/visual-audit-storage.js');}catch(_e){}
/* Visual Audit — Guardar PNG en carpeta plana (o ZIP) */
var VisualAuditStorage = (function () {
  var mode = null;
  var rootHandle = null;
  var zipFiles = [];

  function supportsDirectoryPicker() {
    return typeof window.showDirectoryPicker === 'function';
  }

  function pad(n, size) {
    var s = String(n);
    while (s.length < size) s = '0' + s;
    return s;
  }

  function sanitizeSlug(slug) {
    return String(slug || 'captura')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'captura';
  }

  function ensurePermission(handle) {
    if (!handle || !handle.queryPermission) return Promise.resolve(true);
    return handle.queryPermission({ mode: 'readwrite' }).then(function (status) {
      if (status === 'granted') return true;
      if (!handle.requestPermission) return false;
      return handle.requestPermission({ mode: 'readwrite' }).then(function (s) {
        return s === 'granted';
      });
    }).catch(function () { return true; });
  }

  function initFs(handle) {
    mode = 'fs';
    rootHandle = handle;
    zipFiles = [];
    return ensurePermission(handle).then(function (ok) {
      if (!ok) throw new Error('Sin permiso de escritura en la carpeta');
      return { mode: mode, label: handle.name || 'Carpeta seleccionada' };
    });
  }

  function initZip() {
    mode = 'zip';
    rootHandle = null;
    zipFiles = [];
    return Promise.resolve({ mode: mode, label: 'Descarga ZIP con imágenes' });
  }

  function pickDestination() {
    if (supportsDirectoryPicker()) {
      return window.showDirectoryPicker({ mode: 'readwrite' }).then(function (handle) {
        /* Guardar PNG directo en la carpeta elegida (sin subcarpetas técnicas) */
        return handle.getDirectoryHandle('Capturas BOXIES', { create: true }).then(function (dir) {
          return initFs(dir);
        });
      });
    }
    return initZip();
  }

  function writeBlob(fileName, blob) {
    if (mode === 'fs') {
      return rootHandle.getFileHandle(fileName, { create: true }).then(function (fh) {
        return fh.createWritable().then(function (writable) {
          return writable.write(blob).then(function () { return writable.close(); });
        });
      });
    }
    zipFiles.push({ path: fileName, data: blob, mime: 'image/png' });
    return Promise.resolve();
  }

  function saveCapture(index, scene, blob) {
    if (!blob || !blob.size) return Promise.reject(new Error('Blob de imagen vacío'));
    var fileName = pad(index, 3) + '-' + sanitizeSlug(scene.slug) + '.png';
    return writeBlob(fileName, blob).then(function () {
      return {
        index: index,
        fileName: fileName,
        folder: '',
        relativePath: fileName,
        sceneId: scene.id,
        sceneName: scene.name
      };
    });
  }

  function crc32(buf) {
    var table = crc32._t;
    if (!table) {
      table = crc32._t = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
      }
    }
    var crc = 0 ^ (-1);
    for (var i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    return (crc ^ (-1)) >>> 0;
  }

  function u16(n) { return new Uint8Array([n & 255, (n >>> 8) & 255]); }
  function u32(n) {
    return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
  }
  function concat(parts) {
    var len = 0;
    parts.forEach(function (p) { len += p.length; });
    var out = new Uint8Array(len);
    var o = 0;
    parts.forEach(function (p) { out.set(p, o); o += p.length; });
    return out;
  }
  function encodeUtf8(str) { return new TextEncoder().encode(str); }
  function blobToUint8(blob) {
    return blob.arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }

  function buildZip() {
    var localParts = [];
    var centralParts = [];
    var offset = 0;

    function processEntry(entry, data) {
      var nameBytes = encodeUtf8(entry.path);
      var crc = crc32(data);
      var size = data.length;
      var localHeader = concat([
        u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0),
        nameBytes, data
      ]);
      var central = concat([
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(offset), nameBytes
      ]);
      localParts.push(localHeader);
      centralParts.push(central);
      offset += localHeader.length;
    }

    var chain = Promise.resolve();
    zipFiles.forEach(function (entry) {
      chain = chain.then(function () {
        return blobToUint8(entry.data).then(function (bytes) {
          processEntry(entry, bytes);
        });
      });
    });

    return chain.then(function () {
      var centralDir = concat(centralParts);
      var end = concat([
        u32(0x06054b50), u16(0), u16(0),
        u16(zipFiles.length), u16(zipFiles.length),
        u32(centralDir.length), u32(offset), u16(0)
      ]);
      return new Blob([concat(localParts.concat([centralDir, end]))], { type: 'application/zip' });
    });
  }

  function finalize() {
    if (mode === 'fs') {
      return Promise.resolve({ mode: 'fs', label: rootHandle ? rootHandle.name : 'Capturas BOXIES' });
    }
    if (!zipFiles.length) {
      return Promise.resolve({ mode: 'zip', label: 'Sin imágenes' });
    }
    return buildZip().then(function (blob) {
      var a = document.createElement('a');
      var url = URL.createObjectURL(blob);
      a.href = url;
      a.download = 'Capturas-BOXIES-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      return { mode: 'zip', label: a.download };
    });
  }

  return {
    supportsDirectoryPicker: supportsDirectoryPicker,
    pickDestination: pickDestination,
    saveCapture: saveCapture,
    finalize: finalize,
    getMode: function () { return mode; },
    getLabel: function () { return rootHandle ? rootHandle.name : (mode === 'zip' ? 'ZIP' : ''); },
    pad: pad,
    sanitizeSlug: sanitizeSlug
  };
})();

try{if(typeof BootDebug!=='undefined')BootDebug.log('EXIT file-eval js/style-engine/visual-audit/visual-audit-storage.js');}catch(_e){}

console.log("BOOT EXIT js/style-engine/visual-audit/visual-audit-storage.js");
