/**
 * BoxiesProjectTemplateContract — V7.2.00 conceptual split.
 *
 * Project (content): data, media, config, optional template_id reference.
 * Template (structure): layout, components, behavior — reusable by many projects.
 *
 * No full Template Builder yet; helpers prepare assignment / validation.
 */
var BoxiesProjectTemplateContract = (function () {
  var TEMPLATE_TYPE = 'template';

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

  /**
   * Validate that a template_id points at a template-kind project.
   * @param {object|null} templateRow — fetched proyectos row for template_id
   */
  function assertTemplateRef(templateRow) {
    if (!templateRow) {
      throw new Error('La plantilla referenciada no existe.');
    }
    if (!isTemplateRow(templateRow)) {
      throw new Error('template_id debe apuntar a un proyecto con experience_type=template.');
    }
    return true;
  }

  /**
   * Placeholder for future ProyectosApi / Admin API update.
   * Returns a patch object; does not persist by itself.
   */
  function setTemplateIdPatch(templateId) {
    var id = templateId == null || templateId === ''
      ? null
      : String(templateId).trim();
    return { template_id: id };
  }

  return {
    TEMPLATE_TYPE: TEMPLATE_TYPE,
    isTemplateRow: isTemplateRow,
    getTemplateId: getTemplateId,
    assertTemplateRef: assertTemplateRef,
    setTemplateIdPatch: setTemplateIdPatch
  };
})();
