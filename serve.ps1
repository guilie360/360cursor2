# Dev server with no-cache headers (Chrome aggressive cache fix)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port/ (no-cache)"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $response = $context.Response
  $path = $context.Request.Url.LocalPath
  if ($path -eq '/') { $path = '/index.html' }

  $response.Headers.Add('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  $response.Headers.Add('Pragma', 'no-cache')
  $response.Headers.Add('Expires', '0')

  $relative = $path.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
  $file = Join-Path $root $relative

  if (Test-Path $file -PathType Leaf) {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    $ctype = switch ($ext) {
      '.html' { 'text/html; charset=utf-8' }
      '.js'   { 'application/javascript; charset=utf-8' }
      '.css'  { 'text/css; charset=utf-8' }
      '.json' { 'application/json; charset=utf-8' }
      '.svg'  { 'image/svg+xml; charset=utf-8' }
      '.png'  { 'image/png' }
      '.jpg'  { 'image/jpeg' }
      '.jpeg' { 'image/jpeg' }
      '.webp' { 'image/webp' }
      default { 'application/octet-stream' }
    }
    $response.ContentType = $ctype
    $response.StatusCode = 200
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $response.StatusCode = 404
  }

  $response.Close()
}
