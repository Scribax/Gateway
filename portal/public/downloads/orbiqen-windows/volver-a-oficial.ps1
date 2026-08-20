param(
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"

function Pause-End {
  if (-not $NoPause) {
    Write-Host ""
    Write-Host "  Presiona ENTER para cerrar esta ventana..." -ForegroundColor DarkCyan
    $null = Read-Host
  }
}

try {
  Write-Host ""
  Write-Host "  =====================================================" -ForegroundColor DarkCyan
  Write-Host "   ORBIQEN - Volver a configuracion oficial" -ForegroundColor Cyan
  Write-Host "  =====================================================" -ForegroundColor DarkCyan
  Write-Host ""

  Write-Host "  [1/3] Restaurando archivos de configuracion de Codex y Claude..." -ForegroundColor Gray
  $codexConfig = Join-Path $env:USERPROFILE ".codex\config.toml"
  $codexAuth = Join-Path $env:USERPROFILE ".codex\auth.json"
  $claudeSettings = Join-Path $env:USERPROFILE ".claude\settings.json"

  foreach ($path in @($codexConfig, $codexAuth, $claudeSettings)) {
    if (Test-Path -LiteralPath $path) {
      $backupRoot = Join-Path $env:USERPROFILE ".orbiqen\backups"
      New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
      $backup = Join-Path $backupRoot ("removed-" + (Split-Path -Leaf $path) + "." + (Get-Date -Format "yyyyMMdd-HHmmss") + ".bak")
      Copy-Item -LiteralPath $path -Destination $backup -Force
      Remove-Item -LiteralPath $path -Force
      Write-Host "        Removido: $path" -ForegroundColor DarkGray
    }
  }

  Write-Host "  [2/3] Restaurando perfiles de Claude Desktop..." -ForegroundColor Gray
  $roots = @()
  if ($env:LOCALAPPDATA) { $roots += (Join-Path $env:LOCALAPPDATA "Claude-3p") }
  if ($env:APPDATA) { $roots += (Join-Path $env:APPDATA "Claude-3p") }

  foreach ($root in ($roots | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $root) {
      $backupRoot = Join-Path $env:USERPROFILE ".orbiqen\backups"
      New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
      $backup = Join-Path $backupRoot ("removed-Claude3p." + (Get-Date -Format "yyyyMMdd-HHmmss") + ".bak")
      Copy-Item -LiteralPath $root -Destination $backup -Recurse -Force
      Remove-Item -LiteralPath $root -Recurse -Force
      Write-Host "        Removido: $root" -ForegroundColor DarkGray
    }
  }

  Write-Host "  [3/3] Limpiando variables de entorno de Orbiqen..." -ForegroundColor Gray
  $varsToRemove = @(
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "ANTHROPIC_SMALL_FAST_MODEL",
    "CLAUDE_CODE_SKIP_AUTH_LOGIN",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
    "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY",
    "ORBIQEN_ACTIVE"
  )

  foreach ($name in $varsToRemove) {
    Remove-ItemProperty -Path "HKCU:\Environment" -Name $name -ErrorAction SilentlyContinue
  }
  [Environment]::SetEnvironmentVariable("ORBIQEN_ACTIVE", $null, "User")

  Write-Host ""
  Write-Host "  =====================================================" -ForegroundColor DarkGreen
  Write-Host "   [OK] CONFIGURACION OFICIAL RESTAURADA" -ForegroundColor Green
  Write-Host "  =====================================================" -ForegroundColor DarkGreen
  Write-Host ""
  Write-Host "  Todo volvio al estado original." -ForegroundColor White
  Write-Host "  1. Ya podes cerrar esta ventana." -ForegroundColor Gray
  Write-Host "  2. Reinicia Codex, Claude o tu editor para que tomen el cambio." -ForegroundColor Gray
} catch {
  Write-Host ""
  Write-Host "  =====================================================" -ForegroundColor DarkRed
  Write-Host "   NO SE PUDO COMPLETAR LA RESTAURACION" -ForegroundColor Red
  Write-Host "  =====================================================" -ForegroundColor DarkRed
  Write-Host "  Detalle: $($_.Exception.Message)" -ForegroundColor Yellow
} finally {
  Pause-End
}
