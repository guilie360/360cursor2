/* BOXIES V5.9.91 — Arquitecto IA (creación asistida del showroom)
 *
 * Habla con el usuario, construye una propuesta y — solo tras aprobación —
 * escribe en projectInfo + estructura + Media + Experiencia vía motores
 * existentes. Nunca un modelo paralelo.
 */
var AiAssistantEngine = (function () {
  var PREFS_KEY = 'architectOnboarding';

  /* ── Legacy extractors (Info avanzada / contenido comercial) ── */

  function extractInfoFromText(text) {
    var info = {};
    if (!text) return info;
    var lines = text.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    lines.forEach(function (line) {
      if (/nombre|proyecto/i.test(line) && !info.nombre) {
        info.nombre = line.split(/[:–-]/).pop().trim();
      }
      if (/constructora|desarrollador/i.test(line) && !info.constructora) {
        info.constructora = line.split(/[:–-]/).pop().trim();
      }
      if (/ubicaci[oó]n|ciudad|direcci[oó]n/i.test(line)) {
        if (/ciudad/i.test(line)) info.ciudad = line.split(/[:–-]/).pop().trim();
        if (/direcci/i.test(line)) info.direccion = line.split(/[:–-]/).pop().trim();
        if (/ubicaci/i.test(line) && !info.ciudad) info.ciudad = line.split(/[:–-]/).pop().trim();
      }
      if (/entrega|fecha/i.test(line) && !info.fechaEntrega) {
        info.fechaEntrega = line.split(/[:–-]/).pop().trim();
      }
      if (/torre/i.test(line) && !info.torres) {
        var tm = line.match(/(\d+)/);
        if (tm) info.torres = parseInt(tm[1], 10);
      }
      if (/vivienda|unidad|apartamento/i.test(line) && !info.viviendas) {
        var vm = line.match(/(\d+)/);
        if (vm) info.viviendas = parseInt(vm[1], 10);
      }
      if (/estado|fase/i.test(line) && !info.estado) {
        var val = line.split(/[:–-]/).pop().trim().toLowerCase();
        if (val.indexOf('construc') !== -1) info.estado = 'en_construccion';
        else if (val.indexOf('entreg') !== -1) info.estado = 'entregado';
        else info.estado = 'preventa';
      }
      if (/precio|desde/i.test(line) && !info.precioDesde) {
        var pm = line.match(/[\d.,]+/);
        if (pm) info.precioDesde = pm[0];
      }
      if (/area|[áa]rea|m2|m²/i.test(line) && !info.areaDesde) {
        var am = line.match(/(\d{2,4})/);
        if (am) info.areaDesde = am[1];
      }
    });
    if (!info.descripcion && text.length > 80) {
      info.descripcion = text.slice(0, 500).trim();
    }
    return info;
  }

  async function extractFromPdf(file) {
    return new Promise(function (resolve) {
      var nameParts = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
      resolve(extractInfoFromText('Proyecto: ' + nameParts));
    });
  }

  function generateContent(state) {
    var info = state.projectInfo || {};
    var typeLabel = (typeof ProjectTypesEngine !== 'undefined' && ProjectTypesEngine.getTypeLabel)
      ? ProjectTypesEngine.getTypeLabel(state.projectType)
      : (state.projectType || 'Proyecto');
    var nombre = info.nombre || 'Nuevo ' + typeLabel;
    var ciudad = info.ciudad || 'tu ciudad';
    var constructora = info.constructora || 'la constructora';
    var amenidades = (info.amenidades || []).length ? info.amenidades : inferAmenidades(state);
    return {
      heroText: nombre + ' — ' + (info.descripcion
        ? info.descripcion.slice(0, 120)
        : 'Vive la experiencia de ' + String(typeLabel).toLowerCase() + ' en ' + ciudad),
      descripcionComercial: info.descripcion ||
        (nombre + ' es un proyecto de ' + String(typeLabel).toLowerCase() +
          ' desarrollado por ' + constructora + ' en ' + ciudad + '.'),
      beneficios: [
        'Ubicación estratégica en ' + ciudad,
        'Diseño arquitectónico contemporáneo',
        amenidades.length ? amenidades.slice(0, 3).join(', ') : 'Amenidades de primer nivel'
      ],
      ctas: ['Agenda una visita', 'Descarga el brochure', 'Habla con un asesor'],
      faqs: [
        { q: '¿Dónde está ubicado ' + nombre + '?', a: nombre + ' se encuentra en ' + (info.direccion || ciudad) + '.' }
      ],
      tags: [typeLabel, ciudad, constructora].filter(Boolean),
      keywords: [nombre, typeLabel, ciudad].filter(Boolean),
      chatbotInfo: {
        projectName: nombre,
        location: ciudad,
        type: typeLabel,
        amenities: amenidades,
        status: info.estado || 'preventa',
        priceFrom: info.precioDesde || null
      },
      generatedAt: Date.now()
    };
  }

  function inferAmenidades(state) {
    var found = [];
    if (state.estructura && Array.isArray(state.estructura.zoneNames)) {
      state.estructura.zoneNames.forEach(function (n) {
        if (n && found.indexOf(n) === -1) found.push(n);
      });
    }
    return found;
  }

  /* ── Architect state ── */

  function ensureArchitect(state) {
    if (!state.aiArchitect || typeof state.aiArchitect !== 'object') {
      state.aiArchitect = {
        version: 2,
        mode: 'idle', /* idle | onboarding | conversing | proposal | live */
        knowledge: {},
        messages: [],
        proposal: null,
        structureCreated: false,
        asked: {},
        onboardingChoice: null
      };
    }
    var a = state.aiArchitect;
    if (!a.knowledge || typeof a.knowledge !== 'object') a.knowledge = {};
    if (!Array.isArray(a.messages)) a.messages = [];
    if (!a.asked || typeof a.asked !== 'object') a.asked = {};
    /* Mirror legacy aiAssistant for rail badges */
    state.aiAssistant = state.aiAssistant || {};
    state.aiAssistant.phase = a.mode;
    state.aiAssistant.messages = a.messages;
    return a;
  }

  function projectKey(state) {
    return (state && (state.draftProjectId ||
      (state.projectInfo && state.projectInfo.slug) ||
      (state.publishResult && state.publishResult.proyectoId))) || '_local';
  }

  function getOnboardingChoice(state) {
    var a = ensureArchitect(state);
    if (a.onboardingChoice) return a.onboardingChoice;
    try {
      if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.load) {
        var map = (BoxiesPrefs.load()[PREFS_KEY]) || {};
        var c = map[projectKey(state)];
        if (c) {
          a.onboardingChoice = c;
          return c;
        }
      }
    } catch (e) {}
    return null;
  }

  function setOnboardingChoice(state, choice) {
    var a = ensureArchitect(state);
    a.onboardingChoice = choice;
    try {
      if (typeof BoxiesPrefs !== 'undefined' && BoxiesPrefs.load && BoxiesPrefs.save) {
        var data = BoxiesPrefs.load();
        var map = Object.assign({}, data[PREFS_KEY] || {});
        map[projectKey(state)] = choice;
        var patch = {};
        patch[PREFS_KEY] = map;
        BoxiesPrefs.save(patch);
      }
    } catch (e) {}
    return a;
  }

  /** Default emptyTypology uses modelo "Modelo A" — treat as blank. */
  function isDefaultBlankTypology(t) {
    if (!t) return true;
    if (t.id) return false;
    if (t.nombre && String(t.nombre).trim()) return false;
    var modelo = String(t.modelo || '').trim();
    if (modelo && !/^Modelo\s+[A-Z]$/i.test(modelo)) return false;
    if ((t.plantas_internas || 0) > 1) return false;
    if ((t.plantas || []).length > 1) return false;
    if ((t.ambientes || []).length) return false;
    return true;
  }

  /** Showroom still blank — no applied structure, no meaningful draft, no prior choice. */
  function needsOnboarding(state) {
    if (getOnboardingChoice(state)) return false;
    var a = ensureArchitect(state);
    if (a.structureCreated) return false;
    var e = state && state.estructura;
    if (!e) return true;
    if (e.appliedAt) return false;
    if ((e.zoneNames || []).length) return false;
    var tips = e.tipologias || [];
    if (tips.length > 1) return false;
    for (var i = 0; i < tips.length; i++) {
      if (!isDefaultBlankTypology(tips[i])) return false;
    }
    var buildings = e.buildings || [];
    for (var b = 0; b < buildings.length; b++) {
      if ((buildings[b].pisos || 0) > 1) return false;
    }
    if (a.messages.length > 0 && a.mode !== 'idle') return false;
    return true;
  }

  function hasMeaningfulStructure(state) {
    return !needsOnboarding(state) || !!(state.estructura && state.estructura.appliedAt) ||
      !!(state.aiArchitect && state.aiArchitect.structureCreated);
  }

  /* ── Natural-language interpretation ── */

  function emptyKnowledge() {
    return {
      developmentType: null,
      floors: null,
      area_m2: null,
      tipologyCount: null,
      tipologyName: null,
      towers: null,
      amenities: [],
      showAllFloors: null,
      exteriorTour: null,
      hasGarden: null,
      hasPool: null,
      hasRenders: null,
      projectName: null,
      unidadHousingType: null,
      rawNotes: []
    };
  }

  function mergeKnowledge(base, patch) {
    var out = Object.assign({}, base || emptyKnowledge());
    Object.keys(patch || {}).forEach(function (k) {
      if (patch[k] == null || patch[k] === '') return;
      if (k === 'amenities' && Array.isArray(patch[k])) {
        out.amenities = out.amenities || [];
        patch[k].forEach(function (n) {
          if (!n) return;
          if (!out.amenities.some(function (x) { return String(x).toLowerCase() === String(n).toLowerCase(); })) {
            out.amenities.push(n);
          }
        });
        return;
      }
      if (k === 'rawNotes' && Array.isArray(patch[k])) {
        out.rawNotes = (out.rawNotes || []).concat(patch[k]);
        return;
      }
      out[k] = patch[k];
    });
    return out;
  }

  function interpretText(text, prev) {
    var raw = String(text || '').trim();
    var k = emptyKnowledge();
    if (!raw) return k;
    k.rawNotes = [raw];
    var lower = raw.toLowerCase();

    if (/casa|unifamiliar|vivienda\s+individual/i.test(raw)) {
      k.developmentType = 'casas';
      k.unidadHousingType = 'casa';
    } else if (/lote|solar|terreno/i.test(raw)) {
      k.developmentType = 'lotes';
    } else if (/edificio|torre|apartament|apto\b|conjunto/i.test(raw)) {
      k.developmentType = /conjunto|urbanizaci/i.test(raw) ? 'conjunto' : 'edificio';
    } else if (/mixt/i.test(raw)) {
      k.developmentType = 'mixto';
    }

    var floorsM = raw.match(/(\d+)\s*(pisos?|plantas?|niveles?)/i) ||
      raw.match(/(?:de|con)\s+(\d+)\s*(?:pisos?|plantas?)/i) ||
      raw.match(/tres\s+pisos/i) ||
      raw.match(/cuatro\s+pisos/i) ||
      raw.match(/dos\s+pisos/i);
    if (floorsM) {
      if (/tres/i.test(floorsM[0])) k.floors = 3;
      else if (/cuatro/i.test(floorsM[0])) k.floors = 4;
      else if (/dos/i.test(floorsM[0])) k.floors = 2;
      else k.floors = parseInt(floorsM[1], 10);
    }

    var areaM = raw.match(/(\d{2,4})\s*(m²|m2|metros?(?:\s*cuadrados)?)/i);
    if (areaM) k.area_m2 = parseInt(areaM[1], 10);

    var tipM = raw.match(/(\d+)\s*tipolog/i);
    if (tipM) k.tipologyCount = parseInt(tipM[1], 10);

    var towerM = raw.match(/(\d+)\s*torres?/i);
    if (towerM) k.towers = parseInt(towerM[1], 10);

    var amenityCatalog = [
      ['Piscina', /piscin/i],
      ['Jardín', /jard[ií]n/i],
      ['Gimnasio', /gimnasio|gym/i],
      ['Lobby', /lobby/i],
      ['Portería', /porter[ií]a|vigilancia/i],
      ['BBQ', /bbq|asador|parrilla/i],
      ['Salón social', /sal[oó]n\s+social/i],
      ['Terraza', /terraza|rooftop/i],
      ['Parqueadero', /parqueadero|estacionamiento/i]
    ];
    amenityCatalog.forEach(function (pair) {
      if (pair[1].test(raw)) k.amenities.push(pair[0]);
    });
    if (/jard[ií]n/i.test(raw)) k.hasGarden = true;
    if (/piscin/i.test(raw)) k.hasPool = true;

    if (/recorrido\s+exterior|tour\s+exterior|zona\s+exterior/i.test(raw)) {
      k.exteriorTour = true;
    }
    if (/mostrar\s+(las\s+)?(tres|3|todas)/i.test(raw) || /recorrido\s+por\s+plantas/i.test(raw)) {
      k.showAllFloors = true;
    }
    if (/no\s+mostrar|solo\s+una\s+planta/i.test(raw)) k.showAllFloors = false;

    if (/render|plano|archivo|imagen/i.test(raw)) {
      if (/s[ií]|tengo|dispongo|ya\s+tengo/i.test(raw)) k.hasRenders = true;
      else if (/no\s+tengo|sin\s+render|todav[ií]a\s+no/i.test(raw)) k.hasRenders = false;
      else if (/\?/.test(raw)) { /* question — ignore */ }
      else k.hasRenders = true;
    }

    var nameM = raw.match(/(?:se\s+llama|nombre(?:\s+es)?|proyecto)\s+["“]?([A-Za-zÁÉÍÓÚáéíóúñÑ0-9][\wÁÉÍÓÚáéíóúñÑ\s\-·]{1,40})["”]?/i);
    if (nameM) k.projectName = nameM[1].trim();

    /* Yes/no answers to previous asked slots */
    if (prev && prev._awaiting) {
      var yn = null;
      if (/^(s[ií]|yes|claro|exacto|por supuesto|dale|ok)\b/i.test(lower)) yn = true;
      if (/^(no|nop|negativo)\b/i.test(lower)) yn = false;
      if (yn != null) {
        if (prev._awaiting === 'showAllFloors') k.showAllFloors = yn;
        if (prev._awaiting === 'exteriorTour') k.exteriorTour = yn;
        if (prev._awaiting === 'hasRenders') k.hasRenders = yn;
        if (prev._awaiting === 'hasGarden') {
          k.hasGarden = yn;
          if (yn) k.amenities.push('Jardín');
        }
        if (prev._awaiting === 'hasPool') {
          k.hasPool = yn;
          if (yn) k.amenities.push('Piscina');
        }
      }
    }

    return k;
  }

  function missingQuestions(knowledge, asked) {
    asked = asked || {};
    var q = [];
    if (!knowledge.developmentType && !asked.developmentType) {
      q.push({
        id: 'developmentType',
        text: '¿Qué tipo de proyecto es: una casa, un edificio, un conjunto o lotes?'
      });
    }
    if (knowledge.developmentType === 'casas' || knowledge.developmentType === 'unidad') {
      if (knowledge.floors == null && !asked.floors) {
        q.push({ id: 'floors', text: '¿Cuántas plantas tiene la vivienda?' });
      }
      if (knowledge.showAllFloors == null && knowledge.floors && knowledge.floors > 1 && !asked.showAllFloors) {
        q.push({
          id: 'showAllFloors',
          text: '¿Quieres mostrar las ' + knowledge.floors + ' plantas en el recorrido?'
        });
      }
      if (knowledge.hasGarden == null && !(knowledge.amenities || []).some(function (a) {
        return /jard/i.test(a);
      }) && !asked.hasGarden) {
        q.push({ id: 'hasGarden', text: '¿Tiene jardín o zona verde exterior?' });
      }
      if (knowledge.hasPool == null && !(knowledge.amenities || []).some(function (a) {
        return /piscin/i.test(a);
      }) && !asked.hasPool) {
        q.push({ id: 'hasPool', text: '¿Incluye piscina?' });
      }
      if (knowledge.exteriorTour == null && !asked.exteriorTour) {
        q.push({ id: 'exteriorTour', text: '¿Habrá un recorrido exterior además del interior?' });
      }
    } else if (knowledge.developmentType === 'edificio' || knowledge.developmentType === 'conjunto') {
      if (knowledge.towers == null && !asked.towers) {
        q.push({ id: 'towers', text: '¿Cuántas torres o edificios tiene el proyecto?' });
      }
      if (knowledge.floors == null && !asked.floors) {
        q.push({ id: 'floors', text: '¿Cuántos pisos tiene cada torre?' });
      }
      if (knowledge.tipologyCount == null && !asked.tipologyCount) {
        q.push({ id: 'tipologyCount', text: '¿Cuántas tipologías (modelos) quieres mostrar?' });
      }
    }
    if (knowledge.hasRenders == null && !asked.hasRenders) {
      q.push({ id: 'hasRenders', text: '¿Ya dispones de renders o planos para cargar en Media?' });
    }
    if (!knowledge.projectName && !asked.projectName && q.length === 0) {
      q.push({ id: 'projectName', text: '¿Cómo se llama el proyecto o showroom?' });
    }
    return q;
  }

  function enoughForProposal(knowledge) {
    if (!knowledge.developmentType) return false;
    if (knowledge.developmentType === 'casas' || knowledge.developmentType === 'unidad') {
      return knowledge.floors != null || knowledge.area_m2 != null;
    }
    if (knowledge.developmentType === 'edificio' || knowledge.developmentType === 'conjunto') {
      return knowledge.floors != null || knowledge.tipologyCount != null || knowledge.towers != null;
    }
    return true;
  }

  function buildProposal(knowledge, state) {
    var k = knowledge || {};
    var type = k.developmentType || 'casas';
    var floors = k.floors || (type === 'casas' ? 1 : 5);
    var tipCount = k.tipologyCount || 1;
    var tipName = k.tipologyName ||
      (type === 'casas'
        ? ('Casa' + (k.area_m2 ? (' · ' + k.area_m2 + ' m²') : ''))
        : 'Tipología A');
    var amenities = (k.amenities || []).slice();
    if (k.hasGarden && amenities.indexOf('Jardín') === -1) amenities.push('Jardín');
    if (k.hasPool && amenities.indexOf('Piscina') === -1) amenities.push('Piscina');
    if (k.exteriorTour && amenities.indexOf('Exterior') === -1) amenities.push('Exterior');

    var plantas = [];
    for (var i = 1; i <= floors; i++) {
      plantas.push({ nombre: 'Planta ' + i, orden: i });
    }

    var showFloors = k.showAllFloors !== false;
    var mediaNodes = [{ kind: 'tipologia', label: tipName }];
    amenities.forEach(function (name) {
      mediaNodes.push({ kind: 'amenidad', label: name });
    });

    var experiencia = {
      hub: showFloors && floors > 1,
      tipologyLabel: tipName,
      floors: showFloors ? floors : 1,
      exterior: !!k.exteriorTour
    };

    return {
      projectName: k.projectName ||
        (state.projectInfo && state.projectInfo.nombre) ||
        tipName,
      developmentType: type,
      unidadHousingType: k.unidadHousingType || 'casa',
      towers: k.towers || 1,
      floors: floors,
      area_m2: k.area_m2 || null,
      tipologias: [{
        nombre: tipName,
        modelo: tipName,
        plantas_internas: floors,
        area_m2: k.area_m2 || null,
        plantas: plantas
      }],
      tipologyCount: tipCount,
      amenities: amenities,
      mediaNodes: mediaNodes,
      experiencia: experiencia,
      hasRenders: k.hasRenders,
      knowledge: Object.assign({}, k)
    };
  }

  function proposalSummaryHtml(proposal) {
    if (!proposal) return '';
    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    var tips = (proposal.tipologias || []).map(function (t) {
      return esc(t.nombre) + ' · ' + (t.plantas_internas || 1) + ' planta(s)' +
        (t.area_m2 ? (' · ' + t.area_m2 + ' m²') : '');
    }).join('<br>');
    var am = (proposal.amenities || []).length
      ? (proposal.amenities || []).map(esc).join(', ')
      : 'Ninguna todavía';
    var media = (proposal.mediaNodes || []).map(function (n) {
      return esc(n.label) + ' (' + esc(n.kind) + ')';
    }).join(', ');
    var exp = proposal.experiencia || {};
    return '<div class="builder-ai-proposal" data-ai-proposal="1">' +
      '<div class="builder-ai-proposal__title">Propuesta de estructura</div>' +
      '<ul class="builder-ai-proposal__list">' +
        '<li><strong>Proyecto</strong> · ' + esc(proposal.projectName) + ' · ' + esc(proposal.developmentType) + '</li>' +
        '<li><strong>Tipologías</strong> · ' + tips + '</li>' +
        '<li><strong>Amenidades</strong> · ' + am + '</li>' +
        '<li><strong>Media</strong> · ' + media + '</li>' +
        '<li><strong>Experiencia</strong> · ' +
          (exp.hub ? ('HUB con ' + (exp.floors || 1) + ' planta(s)') : 'Recorrido simple') +
          (exp.exterior ? ' + exterior' : '') +
        '</li>' +
      '</ul>' +
      '<div class="builder-ai-proposal__actions">' +
        '<button type="button" class="btn-primary" data-ai-proposal-create>Crear estructura</button>' +
        '<button type="button" class="btn-ghost" data-ai-proposal-edit>Editar propuesta</button>' +
      '</div>' +
      '<p class="builder-menu-hint">Nada se crea hasta que confirmes.</p>' +
    '</div>';
  }

  /* ── Conversation lifecycle ── */

  function startArchitectConversation(state) {
    var a = ensureArchitect(state);
    setOnboardingChoice(state, 'ai');
    a.mode = 'conversing';
    a.knowledge = emptyKnowledge();
    a.asked = {};
    a.proposal = null;
    a.messages = [{
      role: 'assistant',
      text: 'Hola 👋\n\nVoy a ayudarte a crear la estructura inicial de tu showroom.\n\nCuéntame brevemente qué proyecto quieres crear.',
      hint: 'Ej. “Quiero crear un showroom para una casa de 3 pisos de aproximadamente 300 m².”',
      at: Date.now()
    }];
    state.aiAssistant = state.aiAssistant || {};
    state.aiAssistant.messages = a.messages;
    state.aiAssistant.phase = a.mode;
    return a;
  }

  /** Compat: seedAssistant used by renderInfo — only seed if AI mode already chosen. */
  function seedAssistant(state) {
    var a = ensureArchitect(state);
    if (a.messages.length) return a;
    if (a.onboardingChoice === 'ai' || a.mode === 'conversing' || a.mode === 'proposal' || a.mode === 'live') {
      return startArchitectConversation(state);
    }
    /* Manual / idle: light welcome when opening Info */
    a.mode = a.structureCreated || hasMeaningfulStructure(state) ? 'live' : 'idle';
    a.messages.push({
      role: 'assistant',
      text: a.mode === 'live'
        ? 'Puedo ayudarte a ajustar el showroom. Escribe, por ejemplo: “Agrega una piscina” o “Añade una segunda tipología”.'
        : 'Cuando quieras, describe el proyecto y te ayudo a armar una propuesta. O crea la estructura a mano en Estructura.',
      at: Date.now()
    });
    return a;
  }

  function ensureAssistant(state) {
    ensureArchitect(state);
    return state.aiAssistant;
  }

  function pushAssistant(a, text, extra) {
    var msg = Object.assign({ role: 'assistant', text: text, at: Date.now() }, extra || {});
    a.messages.push(msg);
    return msg;
  }

  function submitArchitectMessage(state, text) {
    var a = ensureArchitect(state);
    var raw = String(text || '').trim();
    if (!raw) return { ok: false, error: 'Escribe un mensaje' };

    if (a.mode === 'live' || a.structureCreated) {
      return submitLiveInstruction(state, raw);
    }

    if (a.mode === 'idle') {
      startArchitectConversation(state);
      a = ensureArchitect(state);
    }

    a.messages.push({ role: 'user', text: raw, at: Date.now() });

    var extracted = interpretText(raw, a.knowledge);
    a.knowledge = mergeKnowledge(a.knowledge, extracted);
    delete a.knowledge._awaiting;

    if (enoughForProposal(a.knowledge)) {
      var pending = missingQuestions(a.knowledge, a.asked);
      /* Ask at most 1–2 clarifying questions before proposing */
      var clarifying = pending.filter(function (q) {
        return q.id === 'showAllFloors' || q.id === 'hasGarden' || q.id === 'hasPool' ||
          q.id === 'exteriorTour' || q.id === 'hasRenders';
      });
      var askedCount = Object.keys(a.asked).length;
      if (clarifying.length && askedCount < 3) {
        var next = clarifying[0];
        a.asked[next.id] = true;
        a.knowledge._awaiting = next.id;
        pushAssistant(a, next.text);
        return { ok: true, awaiting: next.id };
      }
      return presentProposal(state);
    }

    var questions = missingQuestions(a.knowledge, a.asked);
    if (!questions.length) {
      return presentProposal(state);
    }
    var q = questions[0];
    a.asked[q.id] = true;
    a.knowledge._awaiting = q.id;
    /* Acknowledge what we understood */
    var ack = buildAck(a.knowledge);
    pushAssistant(a, (ack ? ack + '\n\n' : '') + q.text);
    return { ok: true, awaiting: q.id };
  }

  function buildAck(k) {
    var bits = [];
    if (k.developmentType === 'casas') bits.push('una casa');
    else if (k.developmentType === 'edificio') bits.push('un edificio');
    else if (k.developmentType === 'conjunto') bits.push('un conjunto');
    else if (k.developmentType === 'lotes') bits.push('lotes');
    if (k.floors) bits.push(k.floors + ' planta' + (k.floors === 1 ? '' : 's'));
    if (k.area_m2) bits.push('aprox. ' + k.area_m2 + ' m²');
    if (!bits.length) return '';
    return 'Perfecto — entiendo ' + bits.join(', ') + '.';
  }

  function presentProposal(state) {
    var a = ensureArchitect(state);
    a.mode = 'proposal';
    a.proposal = buildProposal(a.knowledge, state);
    pushAssistant(a, 'Con lo que me contaste, preparé esta propuesta. Revísala antes de crear nada:', {
      proposal: true,
      html: proposalSummaryHtml(a.proposal)
    });
    return { ok: true, proposal: a.proposal };
  }

  function editProposal(state) {
    var a = ensureArchitect(state);
    a.mode = 'conversing';
    a.proposal = null;
    pushAssistant(a, 'Claro. ¿Qué quieres cambiar de la propuesta? (por ejemplo: “agrega piscina”, “4 pisos”, “también un jardín”).');
    return { ok: true };
  }

  /**
   * Apply approved proposal into BOXIES engines (no parallel schema).
   */
  function applyProposal(state, proposal) {
    proposal = proposal || (state.aiArchitect && state.aiArchitect.proposal);
    if (!proposal) return { ok: false, error: 'No hay propuesta para aplicar' };

    if (typeof EstructuraEngine !== 'undefined') EstructuraEngine.ensureState(state);
    var e = state.estructura;
    var type = proposal.developmentType || 'casas';
    if (EstructuraEngine.normalizeTypeId) type = EstructuraEngine.normalizeTypeId(type);
    if (EstructuraEngine.setDevelopmentType) {
      EstructuraEngine.setDevelopmentType(state, type);
    } else {
      e.developmentType = type;
      state.projectType = type;
    }
    e = state.estructura;
    if (proposal.unidadHousingType) e.unidadHousingType = proposal.unidadHousingType;

    /* Buildings / towers */
    var towers = proposal.towers || 1;
    var floors = proposal.floors || 1;
    if (type === 'edificio' || type === 'conjunto') {
      e.buildings = e.buildings || [];
      while (e.buildings.length < towers) {
        var bi = e.buildings.length;
        e.buildings.push({
          localId: 'bld-ai-' + Date.now().toString(36) + '-' + bi,
          kind: towers > 1 ? 'torre' : 'edificio',
          nombre: towers > 1 ? ('Torre ' + (bi + 1)) : 'Edificio',
          pisos: floors,
          sotanos: 0,
          rooftop: false,
          unidadesPorPiso: 1,
          orden: bi,
          open: bi === 0
        });
      }
      e.buildings.forEach(function (b) { b.pisos = floors; });
      e.edificioMode = towers > 1 ? 'multiples' : 'unico';
    } else {
      e.buildings = [];
    }

    /* Tipologías + plantas — resize via motor, never invent parallel schema */
    var tipDefs = proposal.tipologias || [];
    if (!tipDefs.length) {
      tipDefs = [{ nombre: 'Tipología A', plantas_internas: floors, plantas: [] }];
    }
    if (EstructuraEngine.setTypologyCount) {
      EstructuraEngine.setTypologyCount(state, tipDefs.length);
    } else {
      while (e.tipologias.length < tipDefs.length) {
        if (EstructuraEngine.addTypology) EstructuraEngine.addTypology(state);
        else e.tipologias.push(EstructuraEngine.emptyTypology
          ? EstructuraEngine.emptyTypology(type, e.tipologias.length, {})
          : { localId: 'tip-ai-' + e.tipologias.length, plantas: [], ambientes: [] });
      }
      if (e.tipologias.length > tipDefs.length) {
        e.tipologias = e.tipologias.slice(0, tipDefs.length);
      }
    }
    tipDefs.forEach(function (td, i) {
      var tip = e.tipologias[i];
      if (!tip) return;
      tip.nombre = td.nombre || ('Tipología ' + (i + 1));
      tip.modelo = td.modelo || tip.nombre;
      tip.plantas_internas = td.plantas_internas || floors;
      tip.area_m2 = td.area_m2 != null ? td.area_m2 : tip.area_m2;
      tip.producto = tip.producto || (type === 'casas' ? 'Casa' : 'Apartamento');
    });
    e.tipologiasCount = e.tipologias.length;
    if (EstructuraEngine.syncTypologyPlantas) EstructuraEngine.syncTypologyPlantas(e);
    /* Rename plantas if proposal has names */
    tipDefs.forEach(function (td, i) {
      var tip = e.tipologias[i];
      if (!tip || !td.plantas) return;
      (tip.plantas || []).forEach(function (pl, pi) {
        if (td.plantas[pi] && td.plantas[pi].nombre) pl.nombre = td.plantas[pi].nombre;
      });
    });

    /* Amenidades → zoneNames (Structure SSOT). Media amenities stay opt-in. */
    e.zoneNames = (proposal.amenities || []).slice();
    if (typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.ensureNodeIds) {
      MediaNodesEngine.ensureNodeIds(state);
    }

    /* projectInfo */
    state.projectInfo = state.projectInfo || {};
    if (proposal.projectName) state.projectInfo.nombre = proposal.projectName;
    if (proposal.area_m2) state.projectInfo.areaDesde = String(proposal.area_m2);
    state.projectInfo.descripcion = state.projectInfo.descripcion ||
      ('Showroom generado con Arquitecto IA · ' + proposal.projectName);

    e.dirty = true;

    if (typeof MediaNodesEngine !== 'undefined') {
      MediaNodesEngine.ensureNodeIds(state);
      if (MediaNodesEngine.ensureBunnySlugs) MediaNodesEngine.ensureBunnySlugs(state);
    }

    /* Experiencia baseline from estructura */
    if (typeof ExperienciaEngine !== 'undefined' && ExperienciaEngine.syncFromEstructura) {
      try {
        ExperienciaEngine.syncFromEstructura(state, { reason: 'architect-proposal' });
      } catch (eSync) {}
    }

    /* Optional HUB scaffold for multi-floor tipología */
    var exp = proposal.experiencia || {};
    if (exp.hub && typeof ExperienciaEngine !== 'undefined' &&
        ExperienciaEngine.generateHubStructure && ExperienciaEngine.listHubScopeOptions) {
      try {
        var scopes = ExperienciaEngine.listHubScopeOptions(state) || [];
        var tipScope = null;
        for (var s = 0; s < scopes.length; s++) {
          if (scopes[s].kind === 'tipologia') { tipScope = scopes[s]; break; }
        }
        if (tipScope) {
          ExperienciaEngine.generateHubStructure(state, { scope: tipScope, at: { x: 280, y: 140 } });
        }
      } catch (eHub) {}
    }

    var a = ensureArchitect(state);
    a.structureCreated = true;
    a.mode = 'live';
    a.proposal = null;
    pushAssistant(a,
      'Listo. Creé la estructura en BOXIES (Estructura, tipologías, amenidades y base de Experiencia). ' +
      'Puedes seguir pidiéndome cambios aquí, o editarla a mano en Estructura / Media / Experiencia.');

    return { ok: true, proposal: proposal };
  }

  /* ── Live instructions after structure exists ── */

  function submitLiveInstruction(state, text) {
    var a = ensureArchitect(state);
    a.mode = 'live';
    a.messages.push({ role: 'user', text: text, at: Date.now() });
    if (typeof EstructuraEngine !== 'undefined') EstructuraEngine.ensureState(state);
    var e = state.estructura;
    var lower = text.toLowerCase();
    var done = [];

    if (/piscin/i.test(text)) {
      if ((e.zoneNames || []).indexOf('Piscina') === -1) {
        e.zoneNames = e.zoneNames || [];
        e.zoneNames.push('Piscina');
        done.push('amenidad Piscina');
      }
    }
    if (/jard[ií]n/i.test(text)) {
      if ((e.zoneNames || []).indexOf('Jardín') === -1) {
        e.zoneNames = e.zoneNames || [];
        e.zoneNames.push('Jardín');
        done.push('amenidad Jardín');
      }
    }
    if (/gimnasi|gym/i.test(text)) {
      if ((e.zoneNames || []).indexOf('Gimnasio') === -1) {
        e.zoneNames = e.zoneNames || [];
        e.zoneNames.push('Gimnasio');
        done.push('amenidad Gimnasio');
      }
    }
    if (/segunda tipolog|otra tipolog|agrega(r)?\s+(una\s+)?tipolog|nueva tipolog/i.test(text)) {
      if (EstructuraEngine.addTypology) {
        EstructuraEngine.addTypology(state);
        var tip = e.tipologias[e.tipologias.length - 1];
        tip.nombre = tip.nombre || ('Tipología ' + e.tipologias.length);
        done.push('tipología «' + tip.nombre + '»');
      }
    }
    var floorsLive = text.match(/(\d+|cuatro|tres|dos|cinco)\s*pisos?/i) ||
      text.match(/vivienda\s+de\s+(\d+|cuatro|tres|dos)\s*pisos?/i);
    if (floorsLive) {
      var nF = null;
      if (/cuatro/i.test(floorsLive[0])) nF = 4;
      else if (/tres/i.test(floorsLive[0])) nF = 3;
      else if (/dos/i.test(floorsLive[0])) nF = 2;
      else if (/cinco/i.test(floorsLive[0])) nF = 5;
      else nF = parseInt(floorsLive[1], 10);
      if (nF && e.tipologias && e.tipologias[0]) {
        e.tipologias[0].plantas_internas = nF;
        if (EstructuraEngine.syncTypologyPlantas) EstructuraEngine.syncTypologyPlantas(e);
        done.push(nF + ' plantas en la tipología principal');
      }
    }
    if (/recorrido.*jard[ií]n|jard[ií]n.*recorrido|exterior/i.test(text)) {
      if ((e.zoneNames || []).indexOf('Exterior') === -1) {
        e.zoneNames = e.zoneNames || [];
        e.zoneNames.push('Exterior');
      }
      done.push('nodo Exterior para recorrido');
    }

    if (typeof MediaNodesEngine !== 'undefined' && MediaNodesEngine.ensureNodeIds) {
      MediaNodesEngine.ensureNodeIds(state);
    }
    e.dirty = true;

    if (!done.length) {
      pushAssistant(a,
        'Entendí tu mensaje, pero necesito ser más específico para aplicar un cambio. ' +
        'Prueba con: “Agrega una piscina”, “Añade una segunda tipología” o “Convierte la casa en 4 pisos”.');
      return { ok: true, applied: [] };
    }

    pushAssistant(a, 'Hecho: ' + done.join('; ') + '. Revisa Estructura / Media para ver los cambios.');
    return { ok: true, applied: done };
  }

  /** Unified entry used by the chat UI. */
  function submitUserMessage(state, text) {
    var a = ensureArchitect(state);
    if (a.mode === 'proposal') {
      /* Free text while proposal visible = edit path */
      a.mode = 'conversing';
    }
    if (a.structureCreated || a.mode === 'live') {
      return submitLiveInstruction(state, text);
    }
    return submitArchitectMessage(state, text);
  }

  /* Legacy stubs kept for older call sites */
  function currentPrompt() { return null; }
  function applyAnswerToProject() { return { ok: true }; }

  return {
    extractInfoFromText: extractInfoFromText,
    extractFromPdf: extractFromPdf,
    generateContent: generateContent,
    ensureAssistant: ensureAssistant,
    ensureArchitect: ensureArchitect,
    seedAssistant: seedAssistant,
    needsOnboarding: needsOnboarding,
    hasMeaningfulStructure: hasMeaningfulStructure,
    getOnboardingChoice: getOnboardingChoice,
    setOnboardingChoice: setOnboardingChoice,
    startArchitectConversation: startArchitectConversation,
    submitUserMessage: submitUserMessage,
    submitArchitectMessage: submitArchitectMessage,
    presentProposal: presentProposal,
    editProposal: editProposal,
    applyProposal: applyProposal,
    buildProposal: buildProposal,
    proposalSummaryHtml: proposalSummaryHtml,
    interpretText: interpretText,
    currentPrompt: currentPrompt,
    applyAnswerToProject: applyAnswerToProject
  };
})();
