/**
 * BOXIES ShowroomScope — multi-company list filtering (architecture only).
 *
 * Roles (future enforcement):
 *   Super Admin  → all showrooms
 *   Constructor  → only showrooms for their constructora_id
 *
 * ENFORCE_COMPANY_SCOPE stays false until permissions ship.
 * Call sites should already pass through applyListFilter so flipping the flag is one change.
 */
var BoxiesShowroomScope = (function () {
  var ENFORCE_COMPANY_SCOPE = false;

  function resolveProfile(profile) {
    if (profile) return profile;
    if (typeof VisitorSession !== 'undefined' && VisitorSession.getProfile) {
      return VisitorSession.getProfile();
    }
    return null;
  }

  function getConstructoraId(profile) {
    if (!profile) return null;
    var platform = profile.platformProfile || profile;
    return (
      platform.constructora_id ||
      profile.constructora_id ||
      null
    );
  }

  /**
   * @returns {{
   *   role: string,
   *   constructoraId: string|null,
   *   canViewAllShowrooms: boolean,
   *   enforce: boolean
   * }}
   */
  function getViewerContext(profile) {
    profile = resolveProfile(profile);
    var role =
      typeof PlatformRoles !== 'undefined' && PlatformRoles.getRole
        ? PlatformRoles.getRole(profile)
        : (profile && (profile.rol || (profile.platformProfile && profile.platformProfile.rol))) || 'usuario';
    var constructoraId = getConstructoraId(profile);
    var isSuper = role === 'super_admin';
    /* Until ENFORCE is true, everyone with access sees the full list. */
    var canViewAllShowrooms = !ENFORCE_COMPANY_SCOPE || isSuper;
    return {
      role: role,
      constructoraId: constructoraId,
      canViewAllShowrooms: canViewAllShowrooms,
      enforce: ENFORCE_COMPANY_SCOPE
    };
  }

  /**
   * Apply company scope to a Supabase query builder (.from('proyectos')...).
   * No-op while ENFORCE_COMPANY_SCOPE is false.
   */
  function applyListFilter(query, ctx) {
    if (!query) return query;
    ctx = ctx || getViewerContext();
    if (ctx.canViewAllShowrooms) return query;
    if (ctx.constructoraId) {
      return query.eq('constructora_id', ctx.constructoraId);
    }
    /* Constructor without company binding — return no rows until assigned. */
    return query.eq('constructora_id', '00000000-0000-0000-0000-000000000000');
  }

  /** Client-side filter for already-fetched rows (tests / fallbacks). */
  function filterShowrooms(rows, ctx) {
    rows = rows || [];
    ctx = ctx || getViewerContext();
    if (ctx.canViewAllShowrooms) return rows;
    if (!ctx.constructoraId) return [];
    return rows.filter(function (row) {
      return row && row.constructora_id === ctx.constructoraId;
    });
  }

  return {
    ENFORCE_COMPANY_SCOPE: ENFORCE_COMPANY_SCOPE,
    getViewerContext: getViewerContext,
    applyListFilter: applyListFilter,
    filterShowrooms: filterShowrooms
  };
})();
