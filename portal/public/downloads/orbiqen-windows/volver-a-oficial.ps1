param(
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"

function Pause-End {
  if (-not $NoPause) {
    Write-Host ""
    Write-Host "Presiona ENTER para cerrar..." -ForegroundColor DarkGray
    [void][Console]::ReadLine()
  }
}

try {
  Write-Host ""
  Write-Host "Orbiqen - Volver a configuracion oficial" -ForegroundColor Cyan
  Write-Host ""

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
      Write-Host "Removido: $path" -ForegroundColor Green
      Write-Host "Backup: $backup" -ForegroundColor DarkGray
    }
  }

  foreach ($name in @(
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "ANTHROPIC_SMALL_FAST_MODEL",
    "CLAUDE_CODE_SKIP_AUTH_LOGIN",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
    "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY"
  )) {
    [Environment]::SetEnvironmentVariable($name, $null, "User")
  }

  Write-Host ""
  Write-Host "Listo. Cierra y vuelve a abrir tus apps." -ForegroundColor Green
} catch {
  Write-Host ""
  Write-Host "No se pudo completar: $($_.Exception.Message)" -ForegroundColor Red
} finally {
  Pause-End
}
