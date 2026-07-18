/* CPU profile gate — sin logs. Activa con ?cpuprofile=1
   Flujo: DevTools abierto → Sources pausará en debugger → Performance → Record → Resume. */
var BootCpuProfile = (function () {
  function enabled() {
    try {
      if (/(?:^|[?&])cpuprofile=1(?:&|$)/.test(String(location.search || ''))) return true;
      if (localStorage.getItem('BOXIES_CPU_PROFILE') === '1') return true;
    } catch (e) {}
    return false;
  }

  function pause(label) {
    if (!enabled()) return;
    var name = 'startup-' + String(label || 'pause');
    try {
      if (typeof console !== 'undefined' && typeof console.profile === 'function') {
        console.profile(name);
      }
    } catch (e) {}
    /* Pausa aquí: inicia Performance Record en Chrome y luego Resume (F8). */
    debugger;
    try {
      window.setTimeout(function () {
        try {
          if (typeof console !== 'undefined' && typeof console.profileEnd === 'function') {
            console.profileEnd(name);
          }
        } catch (e2) {}
      }, 8000);
    } catch (e3) {}
  }

  return {
    enabled: enabled,
    pause: pause
  };
})();
