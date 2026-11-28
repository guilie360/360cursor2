/* BOXIES RuntimeStatistics — metrics derived from a compiled runtime. */
var RuntimeStatistics = (function () {
  function countBy(list, pred) {
    var n = 0;
    (list || []).forEach(function (item) {
      if (pred(item)) n++;
    });
    return n;
  }

  function estimateSeconds(stats) {
    /* Rough editorial estimate for showroom walkthrough */
    var base = 8;
    var perScene = 4;
    var perVideo = 6;
    var perAnim = 5;
    var perHub = 10;
    var scenes = Math.max(0, (stats.nodes || 0) - 1);
    return base +
      (scenes * perScene) +
      ((stats.videos || 0) * perVideo) +
      ((stats.animations || 0) * perAnim) +
      ((stats.hubs || 0) * perHub);
  }

  function formatDuration(totalSec) {
    var s = Math.max(0, Math.round(totalSec || 0));
    if (s < 60) return s + ' s';
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ' min' + (r ? (' ' + r + ' s') : '');
  }

  function compute(runtime) {
    runtime = runtime || {};
    var nodes = runtime.nodes || [];
    var connections = runtime.connections || [];
    var assets = runtime.assets || [];

    var videos = countBy(nodes, function (n) { return n && n.kind === 'video'; }) +
      countBy(assets, function (a) { return a && a.type === 'video'; });
    var images = countBy(nodes, function (n) {
      return n && (n.kind === 'image' || n.kind === 'gallery' || n.kind === 'vista');
    }) + countBy(assets, function (a) { return a && (a.type === 'image' || a.category === 'images'); });
    var animations = countBy(nodes, function (n) { return n && n.kind === 'animacion'; });
    var hubs = countBy(nodes, function (n) {
      return n && n.config && n.config.hub && n.config.hub.enabled;
    });
    var hotspots = 0;
    nodes.forEach(function (n) {
      var ixs = (n && n.config && n.config.interactions) || [];
      ixs.forEach(function (ix) {
        if (String(ix.type || '').toUpperCase() === 'HOTSPOT') hotspots++;
      });
      var hs = (n && n.config && n.config.hotspots) || [];
      if (hs.length && !ixs.length) hotspots += hs.length;
    });

    var stats = {
      nodes: nodes.length,
      connections: connections.length,
      videos: videos,
      images: images,
      hubs: hubs,
      hotspots: hotspots,
      animations: animations,
      assets: assets.length,
      estimatedSeconds: 0,
      estimatedLabel: ''
    };
    stats.estimatedSeconds = estimateSeconds(stats);
    stats.estimatedLabel = formatDuration(stats.estimatedSeconds);
    return stats;
  }

  return {
    compute: compute,
    formatDuration: formatDuration
  };
})();
