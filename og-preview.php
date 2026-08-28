<?php
/**
 * Social crawler Open Graph preview for /{slug}.
 * Browsers keep using index.html; WhatsApp/Facebook bots hit this via .htaccess.
 */
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: public, max-age=300');

$slug = isset($_GET['slug']) ? (string) $_GET['slug'] : '';
$slug = preg_replace('/[^A-Za-z0-9_-]/', '', $slug);

$defaults = array(
  'title' => '360Preventa',
  'description' => 'Showroom Digital 360° para preventa inmobiliaria.',
  'image' => 'https://360preventa.com/assets/taroa/og-share.png',
  'url' => 'https://360preventa.com/'
);

if ($slug === '') {
  renderOg($defaults);
  exit;
}

$supabaseUrl = 'https://emefdwzdfnqgjohbtvvn.supabase.co';
$anonKey = 'sb_publishable_GmJNU3DZQqPgNBi6QVa5bA_2h--bgKz';
$select = 'nombre,slug,proyecto_config(og_image,og_title,og_description)';
$path = $supabaseUrl . '/rest/v1/proyectos?select=' . rawurlencode($select) .
  '&publicado=eq.true&slug=eq.' . rawurlencode($slug) . '&limit=1';

$payload = fetchJson($path, $anonKey);
$row = (is_array($payload) && isset($payload[0]) && is_array($payload[0])) ? $payload[0] : null;
$config = array();
if ($row) {
  $cfg = isset($row['proyecto_config']) ? $row['proyecto_config'] : null;
  if (is_array($cfg) && isset($cfg[0]) && is_array($cfg[0])) {
    $config = $cfg[0];
  } elseif (is_array($cfg)) {
    $config = $cfg;
  }
}

$title = trim((string) (isset($config['og_title']) ? $config['og_title'] : ''));
if ($title === '') {
  $title = trim((string) (isset($row['nombre']) ? $row['nombre'] : ''));
}
if ($title === '') {
  $title = $defaults['title'];
}

$description = trim((string) (isset($config['og_description']) ? $config['og_description'] : ''));
if ($description === '') {
  $description = $defaults['description'];
}

$image = trim((string) (isset($config['og_image']) ? $config['og_image'] : ''));
if ($image === '') {
  $image = $defaults['image'];
}
if ($image !== '' && strpos($image, '//') === 0) {
  $image = 'https:' . $image;
} elseif ($image !== '' && strpos($image, 'http') !== 0) {
  $image = 'https://360preventa.com/' . ltrim($image, '/');
}

$url = 'https://360preventa.com/' . rawurlencode($slug);

renderOg(array(
  'title' => $title,
  'description' => $description,
  'image' => $image,
  'url' => $url
));

function fetchJson($url, $anonKey) {
  if (!function_exists('curl_init')) {
    return null;
  }
  $ch = curl_init($url);
  curl_setopt_array($ch, array(
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 8,
    CURLOPT_HTTPHEADER => array(
      'apikey: ' . $anonKey,
      'Authorization: Bearer ' . $anonKey,
      'Accept: application/json'
    )
  ));
  $body = curl_exec($ch);
  $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($code < 200 || $code >= 300 || !is_string($body) || $body === '') {
    return null;
  }
  $json = json_decode($body, true);
  return is_array($json) ? $json : null;
}

function renderOg($meta) {
  $title = htmlspecialchars($meta['title'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
  $description = htmlspecialchars($meta['description'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
  $image = htmlspecialchars($meta['image'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
  $url = htmlspecialchars($meta['url'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
  echo '<!DOCTYPE html><html lang="es"><head>';
  echo '<meta charset="UTF-8">';
  echo '<title>' . $title . '</title>';
  echo '<meta name="description" content="' . $description . '">';
  echo '<meta property="og:type" content="website">';
  echo '<meta property="og:site_name" content="360Preventa">';
  echo '<meta property="og:title" content="' . $title . '">';
  echo '<meta property="og:description" content="' . $description . '">';
  echo '<meta property="og:image" content="' . $image . '">';
  echo '<meta property="og:image:secure_url" content="' . $image . '">';
  echo '<meta property="og:url" content="' . $url . '">';
  echo '<meta name="twitter:card" content="summary_large_image">';
  echo '<meta name="twitter:title" content="' . $title . '">';
  echo '<meta name="twitter:description" content="' . $description . '">';
  echo '<meta name="twitter:image" content="' . $image . '">';
  echo '<link rel="canonical" href="' . $url . '">';
  echo '</head><body></body></html>';
}
