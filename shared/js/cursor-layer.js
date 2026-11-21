/* Cursor custom 360Preventa — landing / panel / cotizador (solo escritorio fino). */
(function () {
  if (window.__boxiesCursorLayer) return;
  window.__boxiesCursorLayer = true;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches && !reduce;
  if (!fine) return;

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  document.documentElement.classList.add('has-cur');

  function bindMag(root) {
    (root ? root.querySelectorAll('.mag') : $$('.mag')).forEach(function (b) {
      if (b.dataset.magBound === '1') return;
      b.dataset.magBound = '1';
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' +
          clamp((e.clientX - r.left - r.width / 2) * 0.28, -10, 10) + 'px,' +
          clamp((e.clientY - r.top - r.height / 2) * 0.35, -8, 8) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  bindMag();

  var c = document.createElement('div');
  c.className = 'cur';
  var lb = document.createElement('span');
  c.appendChild(lb);
  var d = document.createElement('div');
  d.className = 'cur-dot';
  document.body.append(c, d);

  var x = innerWidth / 2;
  var y = innerHeight / 2;
  var cx = x;
  var cy = y;

  addEventListener('pointermove', function (e) {
    x = e.clientX;
    y = e.clientY;
    c.style.opacity = 1;
    d.style.opacity = 1;
    d.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%)';
  });

  document.addEventListener('pointerover', function (e) {
    var t = e.target.closest('[data-cursor]');
    var i = e.target.closest('a,button,[role="button"],summary,.portal-card,.choice,.clickable,.flip-front,.flip-cta');
    if (t) lb.textContent = t.dataset.cursor;
    c.classList.toggle('label', !!t);
    c.classList.toggle('big', !!i && !t);
    d.classList.toggle('hide', !!t);
  });

  addEventListener('pointerdown', function () { c.classList.add('down'); });
  addEventListener('pointerup', function () { c.classList.remove('down'); });
  document.addEventListener('mouseleave', function () {
    c.style.opacity = 0;
    d.style.opacity = 0;
  });

  (function loop() {
    cx += (x - cx) * 0.16;
    cy += (y - cy) * 0.16;
    c.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
    requestAnimationFrame(loop);
  })();

  var mo = new MutationObserver(function () { bindMag(); });
  mo.observe(document.body, { childList: true, subtree: true });
})();
