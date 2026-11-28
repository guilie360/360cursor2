/**
 * Ojito mostrar/ocultar contraseña.
 * Uso: <button type="button" data-password-toggle="inputId" aria-label="Mostrar contraseña">
 */
(function () {
  'use strict';

  var EYE =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
    'd="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/>' +
    '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/>' +
    '</svg>';
  var EYE_OFF =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
    'd="M3 3l18 18M10.5 10.6a2.9 2.9 0 004 4M9.4 5.6C10.2 5.4 11.1 5.3 12 5.3c6 0 9.5 6.7 9.5 6.7a16.6 16.6 0 01-3.2 3.6M6.4 6.5A16 16 0 002.5 12S6 18.5 12 18.5c1.2 0 2.3-.2 3.3-.6"/>' +
    '</svg>';

  function paint(btn, showing) {
    btn.innerHTML = showing ? EYE_OFF : EYE;
    btn.setAttribute('aria-label', showing ? 'Ocultar contraseña' : 'Mostrar contraseña');
    btn.title = showing ? 'Ocultar' : 'Mostrar';
    btn.setAttribute('aria-pressed', showing ? 'true' : 'false');
  }

  function bind(btn) {
    if (!btn || btn.dataset.bound === '1') return;
    var id = btn.getAttribute('data-password-toggle');
    var input = id
      ? document.getElementById(id)
      : (btn.closest('.login-password-wrap, .auth-field, .field, label') || btn.parentElement).querySelector('input[type="password"], input[type="text"]');
    if (!input) return;
    btn.dataset.bound = '1';
    paint(btn, input.type !== 'password');
    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      paint(btn, show);
    });
  }

  function scan(root) {
    (root || document).querySelectorAll('[data-password-toggle]').forEach(bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(document); });
  } else {
    scan(document);
  }

  window.BoxiesPasswordToggle = { bind: bind, scan: scan };
})();
