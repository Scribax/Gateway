@echo off
setlocal
title Orbiqen | Configuracion automatica

set "SCRIPT_DIR=%~dp0"
set "PS1=%SCRIPT_DIR%activar-orbiqen.ps1"
set "LOG=%USERPROFILE%\Desktop\Orbiqen-activador-ejecucion.log"

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

echo.
echo Iniciando configuracion automatica de Orbiqen...
echo.

"%POWERSHELL%" -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -NoPause
set "CODE=%ERRORLEVEL%"

echo.
if not "%CODE%"=="0" (
  echo El activador termino con codigo %CODE%.
  echo Revisa el diagnostico del escritorio o contacta soporte de Orbiqen.
  pause
  exit /b %CODE%
)

echo Configuracion finalizada. Presiona una tecla para cerrar.
pause >nul
exit /b 0
