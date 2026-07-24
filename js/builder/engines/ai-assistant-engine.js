/* AI Assistant Engine — generates commercial content from collected data */
var AiAssistantEngine = (function () {
  function extractInfoFromText(text) {
    var info = {};
    if (!text) return info;

    var lines = text.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);

    lines.forEach(function (line) {
      var lower = line.toLowerCase();
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
      var info = { source: file.name };
      var nameParts = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
      info.nombre = nameParts;
      resolve(extractInfoFromText('Proyecto: ' + nameParts));
    });
  }

  function generateContent(state) {
    var info = state.projectInfo || {};
    var typeLabel = ProjectTypesEngine.getTypeLabel(state.projectType);
    var nombre = info.nombre || 'Nuevo ' + typeLabel;
    var ciudad = info.ciudad || 'tu ciudad';
    var constructora = info.constructora || 'la constructora';

    var amenidades = (info.amenidades || []).length
      ? info.amenidades
      : inferAmenidades(state);

    var heroText = nombre + ' — ' + (info.descripcion
      ? info.descripcion.slice(0, 120)
      : 'Vive la experiencia de ' + typeLabel.toLowerCase() + ' en ' + ciudad);

    var beneficios = [
      'Ubicación estratégica en ' + ciudad,
      'Diseño arquitectónico contemporáneo',
      amenidades.length ? amenidades.slice(0, 3).join(', ') : 'Amenidades de primer nivel',
      info.fechaEntrega ? 'Entrega estimada: ' + info.fechaEntrega : 'Proyecto en ' + (info.estado === 'en_construccion' ? 'construcción' : 'preventa')
    ];

    var faqs = [
      { q: '¿Dónde está ubicado ' + nombre + '?', a: nombre + ' se encuentra en ' + (info.direccion || ciudad) + '.' },
      { q: '¿Cuándo es la entrega?', a: info.fechaEntrega ? 'La entrega está proyectada para ' + info.fechaEntrega + '.' : 'Consulta con un asesor para conocer las fechas de entrega.' },
      { q: '¿Qué amenidades incluye?', a: amenidades.length ? 'El proyecto incluye: ' + amenidades.join(', ') + '.' : 'El proyecto cuenta con amenidades diseñadas para tu bienestar.' },
      { q: '¿Cuál es el precio?', a: info.precioDesde ? 'Desde $' + info.precioDesde : 'Contáctanos para recibir información de precios actualizada.' }
    ];

    return {
      heroText: heroText,
      descripcionComercial: info.descripcion || (nombre + ' es un proyecto de ' + typeLabel.toLowerCase() + ' desarrollado por ' + constructora + ' en ' + ciudad + '. Descubre espacios diseñados para elevar tu estilo de vida.'),
      beneficios: beneficios,
      ctas: ['Agenda una visita', 'Descarga el brochure', 'Habla con un asesor'],
      faqs: faqs,
      tags: [typeLabel, ciudad, constructora, info.estado || 'preventa'].filter(Boolean),
      keywords: [nombre, typeLabel, ciudad, 'preventa', 'inmobiliario', constructora].filter(Boolean),
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
    var gallery = state.gallery || [];
    gallery.forEach(function (item) {
      if (item.category === 'amenidades') found.push(item.categoryLabel);
    });
    if (state.projectStructure && state.projectStructure.defaultPanoramas) {
      state.projectStructure.defaultPanoramas.forEach(function (p) {
        if (/piscina|gym|parque|bbq|spa/i.test(p)) found.push(p);
      });
    }
    return found.length ? found : ['Piscina', 'Gimnasio', 'Zonas verdes', 'Parqueadero'];
  }

  return {
    extractInfoFromText: extractInfoFromText,
    extractFromPdf: extractFromPdf,
    generateContent: generateContent
  };
})();
