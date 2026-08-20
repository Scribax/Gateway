@echo off
setlocal
title Orbiqen - Volver a oficial

set "SCRIPT_DIR=%~dp0"
set "PS1=%SCRIPT_DIR%volver-a-oficial.ps1"

if not exist "%PS1%" (
  echo No se encontro volver-a-oficial.ps1.
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
exit /b %ERRORLEVEL%
