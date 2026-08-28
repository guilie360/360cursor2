$ErrorActionPreference = 'Continue'
$root = 'C:\Users\LENOVO\Desktop\360Cursor2'
$port = 8765
$busy = netstat -ano | Select-String ':8765\s+.*LISTENING'
if ($busy) {
  Write-Host "PORT_8765_BUSY: $busy"
  $port = 8766
}
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
try {
  $listener.Start()
} catch {
  Write-Host "BIND_FAIL_$port : $($_.Exception.Message)"
  if ($port -eq 8765) {
    $port = 8766
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
    $listener.Start()
  } else { throw }
}
Write-Host "SERVER_STARTED port=$port pid=$PID bind=0.0.0.0"
"$port" | Set-Content -Path (Join-Path $root '_server_port.txt') -Encoding ascii

$mime = @{
  '.html'='text/html; charset=utf-8'; '.htm'='text/html; charset=utf-8'
  '.css'='text/css; charset=utf-8'; '.js'='application/javascript; charset=utf-8'
  '.json'='application/json'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'
  '.gif'='image/gif'; '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.webp'='image/webp'
  '.woff'='font/woff'; '.woff2'='font/woff2'; '.ttf'='font/ttf'; '.map'='application/json'
  '.txt'='text/plain; charset=utf-8'; '.xml'='application/xml'; '.mp4'='video/mp4'
  '.webm'='video/webm'; '.pdf'='application/pdf'
}

function Send-Response($stream, $status, $reason, $contentType, $bodyBytes) {
  $header = "HTTP/1.1 $status $reason`r`nContent-Type: $contentType`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n"
  $hb = [Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($hb, 0, $hb.Length)
  if ($bodyBytes.Length -gt 0) { $stream.Write($bodyBytes, 0, $bodyBytes.Length) }
}

while ($true) {
  try {
    $client = $listener.AcceptTcpClient()
  } catch {
    Write-Host "ACCEPT_ERR: $($_.Exception.Message)"
    Start-Sleep -Milliseconds 200
    continue
  }
  try {
    $stream = $client.GetStream()
    $stream.ReadTimeout = 15000
    $buffer = New-Object byte[] 8192
    $ms = New-Object System.IO.MemoryStream
    do {
      $n = $stream.Read($buffer, 0, $buffer.Length)
      if ($n -le 0) { break }
      $ms.Write($buffer, 0, $n)
      $soFar = [Text.Encoding]::ASCII.GetString($ms.ToArray())
    } while ($soFar -notmatch "`r`n`r`n" -and $ms.Length -lt 65536)
    $reqText = [Text.Encoding]::ASCII.GetString($ms.ToArray())
    $first = ($reqText -split "`r`n")[0]
    if ($first -notmatch '^(GET|HEAD)\s+(\S+)') {
      $msg = [Text.Encoding]::UTF8.GetBytes('400 Bad Request')
      Send-Response $stream 400 'Bad Request' 'text/plain' $msg
      continue
    }
    $method = $Matches[1]
    $urlPath = ($Matches[2] -split '\?')[0]
    $reqPath = [Uri]::UnescapeDataString($urlPath)
    if ($reqPath -eq '/') { $reqPath = '/index.html' }
    $rel = $reqPath.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
    $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
    $rootFull = [IO.Path]::GetFullPath($root)
    if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
      $msg = [Text.Encoding]::UTF8.GetBytes('403 Forbidden')
      Send-Response $stream 403 'Forbidden' 'text/plain' $msg
      continue
    }
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
      $msg = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
      Send-Response $stream 404 'Not Found' 'text/plain' $msg
      continue
    }
    $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
    $ct = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
    if ($method -eq 'HEAD') {
      $len = (Get-Item -LiteralPath $full).Length
      $header = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $len`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n"
      $hb = [Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($hb, 0, $hb.Length)
    } else {
      $bytes = [IO.File]::ReadAllBytes($full)
      Send-Response $stream 200 'OK' $ct $bytes
    }
  } catch {
    # Ignore client disconnect / read timeouts
  } finally {
    try { $client.Close() } catch {}
  }
}
