@echo off
cd /d "%~dp0"
echo.
echo Servidor BOXIES (rapido)
echo   PC:      http://127.0.0.1:8765/index.html?proyecto=proyecto-demo
echo   Deja esta ventana ABIERTA. Ctrl+C para detener.
echo.

REM Preferir Python (mucho mas rapido que el listener PowerShell)
where py >nul 2>&1
if %ERRORLEVEL%==0 (
  py -3 -m http.server 8765 --bind 127.0.0.1
  goto :eof
)

where python >nul 2>&1
if %ERRORLEVEL%==0 (
  python -m http.server 8765 --bind 127.0.0.1
  goto :eof
)

where node >nul 2>&1
if %ERRORLEVEL%==0 (
  npx --yes serve -l 8765 -n .
  goto :eof
)

echo [!] No hay Python ni Node. Usando servidor PowerShell (mas lento)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servir-local-ps.ps1"
pause
