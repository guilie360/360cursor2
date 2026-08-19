/**
 * SSOT cache-bust stamp for Quotation Runtime (public /quotation/ iframe).
 * Keep in sync with quotation/index.html ?v= params and supabase-client build=.
 */
var QUOTATION_RUNTIME_BUILD = 'ws7982';
if (typeof window !== 'undefined') {
  window.QUOTATION_RUNTIME_BUILD = QUOTATION_RUNTIME_BUILD;
}
