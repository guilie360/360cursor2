/**
 * Interactivo page — pantalla real del Builder (paso `interactivo`).
 * Integrada al rail / goToStep. El editor poligonal se construirá después;
 * esta página ya es navegable y visible.
 */
var InteractivoPage = (function () {
  function planHtml() {
    if (typeof InteractiveAreasMockPlan !== 'undefined' && InteractiveAreasMockPlan.html) {
      return InteractiveAreasMockPlan.html();
    }
    return '<div class="ia-page-plan-fallback">Planta mock no disponible</div>';
  }

  function html() {
    return '' +
      '<div class="builder-step-content ia-page" id="interactivoPage">' +
        '<div class="ia-page-header">' +
          '<h2 class="builder-step-title">Interactivo</h2>' +
          '<p class="builder-step-desc ia-intro">' +
            'Editor experimental para construir áreas interactivas de proyectos. ' +
            'El objetivo es crear plantas navegables mediante regiones poligonales.' +
          '</p>' +
        '</div>' +
        '<div class="ia-page-body">' +
          '<aside class="ia-page-sidebar" aria-label="Árbol del proyecto">' +
            '<button type="button" class="ia-btn ia-btn--primary" disabled title="Próximamente">+ Nueva Área</button>' +
            '<div class="ia-tree-label">Áreas</div>' +
            '<ul class="ia-tree-list ia-page-tree">' +
              '<li class="ia-tree-item is-active"><span class="ia-tree-static">Masterplan</span>' +
                '<ul class="ia-tree-list">' +
                  '<li class="ia-tree-item"><span class="ia-tree-static">Torre A</span>' +
                    '<ul class="ia-tree-list">' +
                      '<li class="ia-tree-item"><span class="ia-tree-static">Piso 1</span></li>' +
                      '<li class="ia-tree-item"><span class="ia-tree-static">Piso 2</span></li>' +
                      '<li class="ia-tree-item"><span class="ia-tree-static">Piso 3</span></li>' +
                    '</ul>' +
                  '</li>' +
                  '<li class="ia-tree-item"><span class="ia-tree-static">Torre B</span>' +
                    '<ul class="ia-tree-list">' +
                      '<li class="ia-tree-item"><span class="ia-tree-static">Piso 1</span></li>' +
                    '</ul>' +
                  '</li>' +
                '</ul>' +
              '</li>' +
            '</ul>' +
          '</aside>' +
          '<section class="ia-page-editor" aria-label="Editor Interactivo">' +
            '<div class="ia-page-editor-bar">' +
              '<span class="ia-page-editor-title">Masterplan</span>' +
              '<span class="ia-page-badge">Mock · laboratorio</span>' +
            '</div>' +
            '<div class="ia-page-stage">' + planHtml() + '</div>' +
          '</section>' +
        '</div>' +
      '</div>';
  }

  function mount(container) {
    if (!container) return;
  }

  return {
    STEP_ID: 'interactivo',
    html: html,
    mount: mount
  };
})();
