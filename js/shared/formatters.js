/* Shared formatters — no DOM, no Supabase clients */
function formatHeroSubtitle(ciudad, estado, textoHero) {
  if (textoHero) return textoHero;
  var parts = [];
  if (ciudad) parts.push(ciudad);
  if (estado && ESTADO_LABELS[estado]) parts.push(ESTADO_LABELS[estado]);
  return parts.join(' · ');
}

function buildMapsUrl(lat, lng, address) {
  if (lat != null && lng != null) {
    return 'https://www.google.com/maps?q=' + lat + ',' + lng;
  }
  if (address) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
  }
  return 'https://maps.google.com';
}

function formatDisplayUrl(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function ensureHttpUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return 'https://' + url;
}

function formatMonthYear(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  } catch (e) {
    return '';
  }
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  } catch (e) {
    return '';
  }
}

function formatCOP(value) {
  return '$' + Math.round(Number(value) || 0).toLocaleString('es-CO');
}

function generateSlug(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
