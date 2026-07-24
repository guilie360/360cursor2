/**
 * SystemMonitorService — single source for BOXIES infrastructure metrics.
 *
 * V5.1: mock data only (no Supabase).
 * Later: swap method bodies for real Storage / DB / Realtime queries.
 * UI must not change when that swap happens.
 */
var SystemMonitorService = (function () {
  var MODE = 'mock'; /* 'mock' | 'live' */

  var MOCK_SHOWROOMS = [
    {
      id: 'sr-valhalla',
      nombre: 'Valhalla',
      bytes: 717225984, /* 684 MB */
      files: 128,
      breakdown: {
        renders: 335544320, /* 320 MB */
        panoramas: 293601280, /* 280 MB */
        videos: 60817408, /* 58 MB */
        pdf: 18874368, /* 18 MB */
        thumbnails: 5242880, /* 5 MB */
        other: 3145728 /* 3 MB */
      }
    },
    {
      id: 'sr-bosque',
      nombre: 'Bosque Alto',
      bytes: 252706816, /* 241 MB */
      files: 76,
      breakdown: {
        renders: 110100480,
        panoramas: 94371840,
        videos: 25165824,
        pdf: 10485760,
        thumbnails: 4194304,
        other: 8388608
      }
    },
    {
      id: 'sr-demo',
      nombre: 'Demo Constructora',
      bytes: 87031808, /* 83 MB */
      files: 25,
      breakdown: {
        renders: 41943040,
        panoramas: 25165824,
        videos: 8388608,
        pdf: 5242880,
        thumbnails: 2097152,
        other: 4194304
      }
    }
  ];

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms == null ? 120 : ms);
    });
  }

  function formatBytes(bytes) {
    var n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    var kb = n / 1024;
    if (kb < 1024) return (kb < 10 ? kb.toFixed(1) : Math.round(kb)) + ' KB';
    var mb = kb / 1024;
    if (mb < 1024) return (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + ' MB';
    var gb = mb / 1024;
    return (gb < 10 ? gb.toFixed(2) : Math.round(gb)) + ' GB';
  }

  /** @returns {'ok'|'warning'|'critical'} */
  function storageLevel(percent) {
    var p = Number(percent) || 0;
    if (p > 90) return 'critical';
    if (p >= 70) return 'warning';
    return 'ok';
  }

  function storageLevelLabel(level) {
    if (level === 'critical') return 'Crítico';
    if (level === 'warning') return 'Advertencia';
    return 'Correcto';
  }

  async function getStorageOverview() {
    await delay(80);
    /* Exact labels from V5.1 spec (mock) */
    var usedBytes = 440401920; /* 420 MB */
    var totalBytes = 1073741824; /* 1 GB */
    var availableBytes = 633339904; /* 604 MB */
    var percent = 42;
    var level = storageLevel(percent);
    return {
      usedBytes: usedBytes,
      availableBytes: availableBytes,
      totalBytes: totalBytes,
      usedLabel: '420 MB',
      availableLabel: '604 MB',
      totalLabel: '1 GB',
      percent: percent,
      level: level,
      levelLabel: storageLevelLabel(level),
      source: MODE
    };
  }

  async function getShowroomUsage() {
    await delay(100);
    var list = clone(MOCK_SHOWROOMS)
      .map(function (s) {
        var labels = {
          'sr-valhalla': '684 MB',
          'sr-bosque': '241 MB',
          'sr-demo': '83 MB'
        };
        return {
          id: s.id,
          nombre: s.nombre,
          bytes: s.bytes,
          files: s.files,
          weightLabel: labels[s.id] || formatBytes(s.bytes)
        };
      })
      .sort(function (a, b) {
        return b.bytes - a.bytes;
      });
    return { items: list, source: MODE };
  }

  async function getShowroomDetail(showroomId) {
    await delay(90);
    var found = null;
    for (var i = 0; i < MOCK_SHOWROOMS.length; i++) {
      if (MOCK_SHOWROOMS[i].id === showroomId) {
        found = MOCK_SHOWROOMS[i];
        break;
      }
    }
    if (!found) {
      throw new Error('Showroom no encontrado en el monitor.');
    }
    var b = found.breakdown;
    var labelMap = {
      renders: '320 MB',
      panoramas: '280 MB',
      videos: '58 MB',
      pdf: '18 MB',
      thumbnails: '5 MB',
      other: '3 MB'
    };
    var segments = [
      { key: 'renders', label: 'Renders', bytes: b.renders },
      { key: 'panoramas', label: 'Panoramas 360', bytes: b.panoramas },
      { key: 'videos', label: 'Videos', bytes: b.videos },
      { key: 'pdf', label: 'PDF', bytes: b.pdf },
      { key: 'thumbnails', label: 'Miniaturas', bytes: b.thumbnails },
      { key: 'other', label: 'Otros', bytes: b.other }
    ].map(function (seg) {
      return {
        key: seg.key,
        label: seg.label,
        bytes: seg.bytes,
        labelBytes:
          found.id === 'sr-valhalla' && labelMap[seg.key]
            ? labelMap[seg.key]
            : formatBytes(seg.bytes),
        percent: found.bytes
          ? Math.round((seg.bytes / found.bytes) * 1000) / 10
          : 0
      };
    });

    return {
      id: found.id,
      nombre: found.nombre,
      bytes: found.bytes,
      weightLabel: found.id === 'sr-valhalla' ? '684 MB' : formatBytes(found.bytes),
      files: found.files,
      segments: segments,
      source: MODE
    };
  }

  async function getContentCounts() {
    await delay(70);
    return {
      renders: 186,
      panoramas: 94,
      videos: 31,
      pdfs: 48,
      images: 412,
      files: 771,
      source: MODE
    };
  }

  /** Analysis only — never deletes. */
  async function analyzeCleanup() {
    await delay(520);
    return {
      orphanFiles: 23,
      staleThumbnails: 12,
      duplicateImages: 7,
      tempFiles: 5,
      reclaimableBytes: 327155712, /* ~312 MB */
      reclaimableLabel: '312 MB',
      analyzedAt: new Date().toISOString(),
      source: MODE
    };
  }

  async function getDatabaseStats() {
    await delay(75);
    return {
      sizeBytes: 18874368,
      sizeLabel: '18 MB',
      records: 1248,
      users: 4,
      showrooms: 12,
      published: 9,
      source: MODE
    };
  }

  async function getPerformance() {
    await delay(60);
    return {
      responseMs: 73,
      lastSyncSecondsAgo: 14,
      lastSyncLabel: 'Hace 14 segundos',
      status: 'Operativo',
      statusKey: 'ok',
      source: MODE
    };
  }

  async function getServiceStatus() {
    await delay(50);
    return {
      items: [
        { id: 'supabase', label: 'Supabase', status: 'online' },
        { id: 'storage', label: 'Storage', status: 'online' },
        { id: 'database', label: 'Base de datos', status: 'online' },
        { id: 'realtime', label: 'Realtime', status: 'online' }
      ],
      source: MODE
    };
  }

  return {
    MODE: MODE,
    formatBytes: formatBytes,
    storageLevel: storageLevel,
    storageLevelLabel: storageLevelLabel,
    getStorageOverview: getStorageOverview,
    getShowroomUsage: getShowroomUsage,
    getShowroomDetail: getShowroomDetail,
    getContentCounts: getContentCounts,
    analyzeCleanup: analyzeCleanup,
    getDatabaseStats: getDatabaseStats,
    getPerformance: getPerformance,
    getServiceStatus: getServiceStatus
  };
})();
