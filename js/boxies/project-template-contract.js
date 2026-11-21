/**
 * BoxiesProjectTemplateContract — V7.2.01
 *
 * Project (content): data, media, config, optional template_id.
 * Template (structure): Config/Hero/Editor/Preview — reusable by many projects.
 *
 * Seeds BOXIES Default from the system clone engine (demo structure).
 * Preferred-template helpers prepare future project→template assignment (no UI yet).
 */
var BoxiesProjectTemplateContract = (function () {
  var TEMPLATE_TYPE = 'template';
  var DEFAULT_SLUG = 'boxies-default';
  var DEFAULT_NAME = 'BOXIES Default';
  var PREFERRED_KEY = 'boxies.templates.preferredId';
  var ensurePromise = null;

  function isTemplateRow(row) {
    if (!row) return false;
    var type = row.experience_type || row.experienceType || '';
    if (typeof BoxiesExperienceTypes !== 'undefined' && BoxiesExperienceTypes.isTemplateType) {
      return BoxiesExperienceTypes.isTemplateType(type);
    }
    return String(type).toLowerCase() === TEMPLATE_TYPE;
  }

  function getTemplateId(row) {
    if (!row) return null;
    var id = row.template_id || row.templateId || null;
    return id ? String(id) : null;
  }

  function assertTemplateRef(templateRow) {
    if (!templateRow) {
      throw new Error('La plantilla referenciada no existe.');
    }
    if (!isTemplateRow(templateRow)) {
      throw new Error('template_id debe apuntar a un proyecto con experience_type=template.');
    }
    return true;
  }

  function setTemplateIdPatch(templateId) {
    var id = templateId == null || templateId === ''
      ? null
      : String(templateId).trim();
    return { template_id: id };
  }

  function isDefaultTemplate(row) {
    if (!row) return false;
    var slug = String(row.slug || '').toLowerCase();
    var name = String(row.nombre || row.name || '');
    return slug === DEFAULT_SLUG || name === DEFAULT_NAME;
  }

  function getPreferredTemplateId() {
    try {
      return window.sessionStorage.getItem(PREFERRED_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  function setPreferredTemplateId(templateId) {
    var id = templateId == null || templateId === ''
      ? null
      : String(templateId).trim();
    try {
      if (id) window.sessionStorage.setItem(PREFERRED_KEY, id);
      else window.sessionStorage.removeItem(PREFERRED_KEY);
    } catch (e) {}
    return id;
  }

  /**
   * Future create-flow helper — returns options for assigning a template
   * without implementing the selector UI yet.
   */
  function buildCreateOptions(experienceType, overrides) {
    overrides = overrides || {};
    var preferred = overrides.templateId || getPreferredTemplateId() || null;
    return {
      experienceType: experienceType || 'quotation',
      templateId: preferred,
      template_id: preferred,
      patch: setTemplateIdPatch(preferred)
    };
  }

  async function findDefaultInList(scope) {
    if (typeof BoxiesAdmin2ProjectsApi === 'undefined' || !BoxiesAdmin2ProjectsApi.list) {
      return null;
    }
    var rows = await BoxiesAdmin2ProjectsApi.list({
      experienceType: TEMPLATE_TYPE,
      scope: scope
    });
    var found = null;
    (rows || []).some(function (row) {
      if (isDefaultTemplate(row)) {
        found = row;
        return true;
      }
      return false;
    });
    return found;
  }

  /**
   * Ensure the first reusable plantilla exists (cloned from system demo structure).
   * Idempotent. Sets preferred template id for future project assignment.
   */
  async function ensureDefaultTemplate(options) {
    options = options || {};
    if (ensurePromise) return ensurePromise;

    ensurePromise = (async function () {
      var scope = options.scope || null;
      if (!scope && typeof BoxiesShowroomScope !== 'undefined' &&
          BoxiesShowroomScope.getViewerContext) {
        scope = BoxiesShowroomScope.getViewerContext();
      }

      var existing = await findDefaultInList(scope);
      if (existing) {
        setPreferredTemplateId(existing.id);
        return existing;
      }

      if (typeof BoxiesAdmin2ProjectsApi === 'undefined' ||
          !BoxiesAdmin2ProjectsApi.createFromTemplate) {
        throw new Error('API de plantillas no disponible.');
      }

      var created = await BoxiesAdmin2ProjectsApi.createFromTemplate({
        scope: scope,
        experienceType: TEMPLATE_TYPE
      });

      var row = created;
      if (typeof ProyectosApi !== 'undefined' && ProyectosApi.updateIdentity && created && created.id) {
        try {
          var result = await ProyectosApi.updateIdentity(created.id, {
            nombre: DEFAULT_NAME,
            slug: DEFAULT_SLUG
          });
          var updated = result && result.project ? result.project : result;
          if (updated && updated.id) {
            row = Object.assign({}, created, updated, {
              nombre: DEFAULT_NAME,
              slug: DEFAULT_SLUG,
              experience_type: TEMPLATE_TYPE
            });
          }
        } catch (eRename) {
          /* Keep created row even if rename fails (slug conflict). */
          console.warn('[BoxiesProjectTemplateContract] rename default', eRename);
        }
      }

      setPreferredTemplateId(row && row.id);
      return row;
    })();

    try {
      return await ensurePromise;
    } finally {
      ensurePromise = null;
    }
  }

  return {
    TEMPLATE_TYPE: TEMPLATE_TYPE,
    DEFAULT_SLUG: DEFAULT_SLUG,
    DEFAULT_NAME: DEFAULT_NAME,
    PREFERRED_KEY: PREFERRED_KEY,
    isTemplateRow: isTemplateRow,
    isDefaultTemplate: isDefaultTemplate,
    getTemplateId: getTemplateId,
    assertTemplateRef: assertTemplateRef,
    setTemplateIdPatch: setTemplateIdPatch,
    getPreferredTemplateId: getPreferredTemplateId,
    setPreferredTemplateId: setPreferredTemplateId,
    buildCreateOptions: buildCreateOptions,
    ensureDefaultTemplate: ensureDefaultTemplate
  };
})();
