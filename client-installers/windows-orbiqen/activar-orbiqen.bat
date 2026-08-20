@echo off
setlocal
title Orbiqen - Configuracion automatica

set "SCRIPT_DIR=%~dp0"
set "PS1=%SCRIPT_DIR%activar-orbiqen.ps1"

if not exist "%PS1%" (
  echo.
  echo No se encontro activar-orbiqen.ps1.
  echo Extrae todos los archivos antes de ejecutar este instalador.
  echo.
  pause
  exit /b 1
)

where pwsh >nul 2>nul
if %errorlevel%==0 (
  set "POWERSHELL=pwsh"
) else (
  set "POWERSHELL=powershell"
)

"%POWERSHELL%" -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "CODE=%ERRORLEVEL%"

if not "%CODE%"=="0" (
  echo.
  echo El activador termino con codigo %CODE%.
  pause
  exit /b %CODE%
)

exit /b 0
