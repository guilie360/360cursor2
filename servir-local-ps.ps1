# Servidor HTTP local rapido (fallback sin Python/Node)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
try {
  $listener.Start()
} catch {
  Write-Host "No se pudo abrir el puerto $port. Cierra el servidor anterior e intenta de nuevo."
  Write-Host $_.Exception.Message
  exit 1
}
Write-Host "OK http://127.0.0.1:$port/index.html?proyecto=proyecto-demo"
Write-Host "Ctrl+C para detener."

function Get-ContentType([string]$ext) {
  switch ($ext.ToLower()) {
    '.html' { return 'text/html; charset=utf-8' }
    '.css'  { return 'text/css; charset=utf-8' }
    '.js'   { return 'application/javascript; charset=utf-8' }
    '.json' { return 'application/json' }
    '.png'  { return 'image/png' }
    '.jpg'  { return 'image/jpeg' }
    '.jpeg' { return 'image/jpeg' }
    '.svg'  { return 'image/svg+xml' }
    '.webp' { return 'image/webp' }
    '.woff2'{ return 'font/woff2' }
    '.mp4'  { return 'video/mp4' }
    default { return 'application/octet-stream' }
  }
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath)
  if ($path -eq '/') { $path = '/index.html' }
  $rel = $path.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
  $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
  if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
    $ctx.Response.StatusCode = 403
    $ctx.Response.Close()
    continue
  }
  $res = $ctx.Response
  try {
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
      $res.StatusCode = 404
      $buf = [Text.Encoding]::UTF8.GetBytes('404')
      $res.OutputStream.Write($buf, 0, $buf.Length)
    } else {
      $bytes = [IO.File]::ReadAllBytes($full)
      $res.StatusCode = 200
      $res.ContentType = Get-ContentType ([IO.Path]::GetExtension($full))
      $res.ContentLength64 = $bytes.Length
      $res.Headers['Cache-Control'] = 'no-cache'
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch {
    try { $res.StatusCode = 500 } catch {}
  } finally {
    try { $res.OutputStream.Close() } catch {}
    try { $res.Close() } catch {}
  }
}
