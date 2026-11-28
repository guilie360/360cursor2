/**
 * Interactivo page — workspace de escenas (árbol | canvas | inspector).
 * Preparado para cualquier recurso visual (plantas, renders, 360, video, etc.).
 */
var InteractivoPage = (function () {
  var selectedId = 'scene-masterplan';

  var MOCK_SCENES = [
    {
      id: 'scene-masterplan',
      name: 'Masterplan',
      type: 'masterplan',
      children: [
        { id: 'scene-aerial', name: 'Vista aérea', type: 'aerial', children: [] },
        {
          id: 'scene-tower-a',
          name: 'Torre A',
          type: 'tower',
          children: [
            { id: 'scene-ta-p1', name: 'Piso 1', type: 'floor', children: [] },
            { id: 'scene-ta-p2', name: 'Piso 2', type: 'floor', children: [] }
          ]
        }
      ]
    },
    { id: 'scene-lobby', name: 'Lobby', type: 'space', children: [] },
    { id: 'scene-pool', name: 'Piscina', type: 'amenity', children: [] },
    { id: 'scene-render-ext', name: 'Render Exterior', type: 'render', children: [] },
    { id: 'scene-render-night', name: 'Render Nocturno', type: 'render', children: [] },
    { id: 'scene-360-lobby', name: '360 Lobby', type: 'pano360', children: [] },
    { id: 'scene-360-pool', name: '360 Piscina', type: 'pano360', children: [] },
    { id: 'scene-video', name: 'Video Recorrido', type: 'video', children: [] },
    { id: 'scene-map', name: 'Mapa Comercial', type: 'map', children: [] }
  ];

  var TYPE_LABELS = {
    masterplan: 'Masterplan',
    aerial: 'Fotografía aérea',
    tower: 'Torre',
    floor: 'Planta',
    space: 'Espacio',
    amenity: 'Amenidad',
    render: 'Render',
    pano360: 'Panorama 360°',
    video: 'Video',
    map: 'Mapa',
    image: 'Imagen'
  };

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function planHtml() {
    if (typeof InteractiveAreasMockPlan !== 'undefined' && InteractiveAreasMockPlan.html) {
      return InteractiveAreasMockPlan.html();
    }
    return '<div class="ia-page-plan-fallback">Escena mock no disponible</div>';
  }

  function findScene(nodes, id) {
    var found = null;
    (nodes || []).forEach(function (n) {
      if (found) return;
      if (n.id === id) found = n;
      else if (n.children) found = findScene(n.children, id);
    });
    return found;
  }

  function treeHtml(nodes, depth) {
    depth = depth || 0;
    var html = '<ul class="ia-tree-list ia-page-tree">';
    (nodes || []).forEach(function (n) {
      var active = n.id === selectedId ? ' is-active' : '';
      html += '<li class="ia-tree-item' + active + '" style="--ia-depth:' + depth + '">';
      html += '<button type="button" class="ia-tree-btn" data-ia-scene="' + escapeHtml(n.id) + '">' +
        '<span class="ia-tree-type" data-type="' + escapeHtml(n.type || 'image') + '"></span>' +
        escapeHtml(n.name) +
      '</button>';
      if (n.children && n.children.length) {
        html += treeHtml(n.children, depth + 1);
      }
      html += '</li>';
    });
    html += '</ul>';
    return html;
  }

  function inspectorHtml(scene) {
    if (!scene) {
      return '<div class="ia-inspector-empty">Selecciona una escena para editar sus propiedades y hotspots.</div>';
    }
    var typeLabel = TYPE_LABELS[scene.type] || 'Escena';
    return '' +
      '<div class="ia-inspector-head">' +
        '<p class="ia-inspector-kicker">Inspector</p>' +
        '<h3 class="ia-inspector-title">' + escapeHtml(scene.name) + '</h3>' +
      '</div>' +
      '<dl class="ia-inspector-meta">' +
        '<div><dt>Tipo</dt><dd>' + escapeHtml(typeLabel) + '</dd></div>' +
        '<div><dt>Recurso</dt><dd>Mock · laboratorio</dd></div>' +
        '<div><dt>Hotspots</dt><dd>0</dd></div>' +
      '</dl>' +
      '<div class="ia-inspector-actions">' +
        '<button type="button" class="ia-btn" disabled title="Próximamente">+ Hotspot</button>' +
        '<button type="button" class="ia-btn ia-btn--ghost" disabled title="Próximamente">Reemplazar medio</button>' +
      '</div>' +
      '<p class="ia-inspector-note">Editor universal: imágenes, renders, plantas, video, 360° y más usarán el mismo sistema de interacción.</p>';
  }

  function html() {
    var scene = findScene(MOCK_SCENES, selectedId);
    return '' +
      '<div class="builder-step-content ia-page ia-workspace" id="interactivoPage">' +
        '<div class="ia-page-header ia-workspace-header">' +
          '<div>' +
            '<h2 class="builder-step-title">Interactivo</h2>' +
            '<p class="builder-step-desc ia-intro">' +
              'Workspace de escenas interactivas. Cualquier recurso visual del proyecto puede convertirse en una escena con hotspots.' +
            '</p>' +
          '</div>' +
        '</div>' +
        '<div class="ia-workspace-body has-inspector">' +
          '<aside class="ia-scenes" aria-label="Árbol de escenas">' +
            '<div class="ia-scenes-top">' +
              '<button type="button" class="ia-btn ia-btn--primary" disabled title="Próximamente">+ Nueva escena</button>' +
            '</div>' +
            '<div class="ia-tree-label">Escenas</div>' +
            '<div class="ia-scenes-tree" data-ia-scenes-tree>' + treeHtml(MOCK_SCENES) + '</div>' +
          '</aside>' +
          '<section class="ia-canvas" aria-label="Canvas de escena">' +
            '<div class="ia-page-editor-bar">' +
              '<span class="ia-page-editor-title" data-ia-canvas-title>' + escapeHtml(scene ? scene.name : 'Escena') + '</span>' +
              '<span class="ia-page-badge">Canvas · mock</span>' +
            '</div>' +
            '<div class="ia-page-stage" data-ia-canvas-stage>' + planHtml() + '</div>' +
          '</section>' +
          '<aside class="ia-inspector' + (scene ? ' is-open' : '') + '" data-ia-inspector aria-label="Inspector">' +
            inspectorHtml(scene) +
          '</aside>' +
        '</div>' +
      '</div>';
  }

  function mount(container) {
    if (!container) return;
    var root = container.id === 'interactivoPage' ? container : container.querySelector('#interactivoPage');
    if (!root || root.__iaBound) return;
    root.__iaBound = true;

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ia-scene]');
      if (!btn) return;
      selectedId = btn.getAttribute('data-ia-scene');
      var scene = findScene(MOCK_SCENES, selectedId);

      root.querySelectorAll('.ia-tree-item').forEach(function (li) {
        li.classList.remove('is-active');
      });
      var li = btn.closest('.ia-tree-item');
      if (li) li.classList.add('is-active');

      var title = root.querySelector('[data-ia-canvas-title]');
      if (title) title.textContent = scene ? scene.name : 'Escena';

      var inspector = root.querySelector('[data-ia-inspector]');
      if (inspector) {
        inspector.classList.toggle('is-open', !!scene);
        inspector.innerHTML = inspectorHtml(scene);
      }
      var body = root.querySelector('.ia-workspace-body');
      if (body) body.classList.toggle('has-inspector', !!scene);
    });
  }

  return {
    STEP_ID: 'interactivo',
    html: html,
    mount: mount
  };
})();
