param(
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"

$BrandName = "Orbiqen"
$OpenAiBaseUrl = "https://orbiqen.com/v1"
$ClaudeBaseUrl = "https://orbiqen.com"
$DefaultCodexModel = "gpt-5.5"
$DefaultClaudeModel = "claude-sonnet-5"
$DefaultClaudeOpusModel = "claude-opus-4-8"
$DefaultClaudeFastModel = "claude-sonnet-4-6"

$ClaudeModels = @(
  "claude-sonnet-5",
  "claude-sonnet-4-6",
  "claude-opus-4-8",
  "claude-opus-5",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-haiku-4-5-20251001",
  "claude-fable-5"
)

$Desktop = [Environment]::GetFolderPath("Desktop")
$DiagPath = Join-Path $Desktop "Orbiqen-activador-diagnostico.txt"

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $DiagPath -Value $line -Encoding UTF8
}

function Write-Title {
  Write-Host ""
  Write-Host "  ===============================================" -ForegroundColor DarkCyan
  Write-Host "   ORBIQEN - Activador para Codex y Claude" -ForegroundColor Cyan
  Write-Host "  ===============================================" -ForegroundColor DarkCyan
  Write-Host ""
  Write-Host "  Este asistente configura tus apps para usar Orbiqen." -ForegroundColor White
  Write-Host "  Solo vas a pegar tu API key. No se muestra ni se envia a nadie mas." -ForegroundColor Gray
  Write-Host ""
}

function Write-Step {
  param([string]$Text)
  Write-Host ""
  Write-Host "  $Text" -ForegroundColor Cyan
}

function Pause-End {
  if (-not $NoPause) {
    Write-Host ""
    Write-Host "  Presiona ENTER para cerrar..." -ForegroundColor DarkGray
    [void][Console]::ReadLine()
  }
}

function Read-PlainKey {
  param(
    [string]$Prompt,
    [string]$GroupHint
  )

  while ($true) {
    Write-Host ""
    Write-Host "  $Prompt" -ForegroundColor White
    Write-Host "  $GroupHint" -ForegroundColor DarkGray
    $value = Read-Host "  API key"
    if ($null -eq $value) {
      $value = ""
    }
    $value = $value.Trim()

    if ($value -match "^sk-[A-Za-z0-9_-]{20,}$") {
      return $value
    }

    Write-Host "  La key no parece valida. Debe empezar con sk-." -ForegroundColor Yellow
  }
}

function Backup-File {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $backupRoot = Join-Path $env:USERPROFILE ".orbiqen\backups"
  New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
  $name = Split-Path -Leaf $Path
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = Join-Path $backupRoot "$name.$stamp.bak"
  Copy-Item -LiteralPath $Path -Destination $backup -Force
  Write-Log "Backup: $Path -> $backup"
}

function Write-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )

  $dir = Split-Path -Parent $Path
  if ($dir) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Write-JsonNoBom {
  param(
    [string]$Path,
    [object]$Data,
    [int]$Depth = 12
  )

  $json = $Data | ConvertTo-Json -Depth $Depth
  Write-Utf8NoBom -Path $Path -Content ($json + [Environment]::NewLine)
}

function Test-OrbiqenModels {
  param(
    [string]$Key,
    [string]$Label
  )

  Write-Host "  Verificando conexion con Orbiqen ($Label)..." -ForegroundColor Gray

  try {
    $headers = @{
      Authorization = "Bearer $Key"
      "x-api-key" = $Key
    }
    $response = Invoke-WebRequest -Uri "$OpenAiBaseUrl/models" -Headers $headers -Method GET -TimeoutSec 25 -UseBasicParsing
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
      Write-Host "  Conexion correcta." -ForegroundColor Green
      Write-Log "Validacion $Label OK HTTP $($response.StatusCode)"
      return $true
    }
  } catch {
    Write-Host "  No se pudo validar automaticamente: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  Si la key es nueva o tiene modelos limitados, igual podemos configurar." -ForegroundColor DarkGray
    Write-Log "Validacion $Label fallo: $($_.Exception.Message)"
  }

  $answer = Read-Host "  Queres continuar de todos modos? (S/N)"
  return ($answer.Trim().ToUpperInvariant() -eq "S")
}

function Configure-Codex {
  param([string]$ApiKey)

  Write-Step "Configurando Codex CLI"

  if (-not (Test-OrbiqenModels -Key $ApiKey -Label "Codex / ChatGPT")) {
    throw "Configuracion de Codex cancelada."
  }

  $codexDir = Join-Path $env:USERPROFILE ".codex"
  $configPath = Join-Path $codexDir "config.toml"
  $authPath = Join-Path $codexDir "auth.json"

  Backup-File -Path $configPath
  Backup-File -Path $authPath
  New-Item -ItemType Directory -Force -Path $codexDir | Out-Null

  $toml = @"
model_provider = "orbiqen"
model = "$DefaultCodexModel"
review_model = "$DefaultCodexModel"
model_reasoning_effort = "high"
disable_response_storage = true
network_access = "enabled"
windows_wsl_setup_acknowledged = true

[model_providers.orbiqen]
name = "Orbiqen"
base_url = "$OpenAiBaseUrl"
wire_api = "responses"
requires_openai_auth = true

[features]
goals = true
"@

  Write-Utf8NoBom -Path $configPath -Content ($toml + [Environment]::NewLine)
  Write-JsonNoBom -Path $authPath -Data @{ OPENAI_API_KEY = $ApiKey }

  Write-Host "  Codex quedo configurado con Orbiqen." -ForegroundColor Green
  Write-Host "  Modelo inicial: $DefaultCodexModel" -ForegroundColor DarkGray
  Write-Log "Codex configurado en $codexDir"
}

function Configure-ClaudeEnvironment {
  param([string]$ApiKey)

  Write-Step "Configurando Claude"

  if (-not (Test-OrbiqenModels -Key $ApiKey -Label "Claude")) {
    throw "Configuracion de Claude cancelada."
  }

  [Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", $ClaudeBaseUrl, "User")
  [Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", $ApiKey, "User")
  [Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", $null, "User")
  [Environment]::SetEnvironmentVariable("ANTHROPIC_DEFAULT_SONNET_MODEL", $DefaultClaudeModel, "User")
  [Environment]::SetEnvironmentVariable("ANTHROPIC_DEFAULT_OPUS_MODEL", $DefaultClaudeOpusModel, "User")
  [Environment]::SetEnvironmentVariable("ANTHROPIC_SMALL_FAST_MODEL", $DefaultClaudeFastModel, "User")
  [Environment]::SetEnvironmentVariable("CLAUDE_CODE_SKIP_AUTH_LOGIN", "1", "User")
  [Environment]::SetEnvironmentVariable("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1", "User")
  [Environment]::SetEnvironmentVariable("CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY", "1", "User")

  $claudeDir = Join-Path $env:USERPROFILE ".claude"
  $settingsPath = Join-Path $claudeDir "settings.json"
  Backup-File -Path $settingsPath

  $settings = [ordered]@{
    env = [ordered]@{
      ANTHROPIC_BASE_URL = $ClaudeBaseUrl
      ANTHROPIC_AUTH_TOKEN = $ApiKey
      ANTHROPIC_DEFAULT_SONNET_MODEL = $DefaultClaudeModel
      ANTHROPIC_DEFAULT_OPUS_MODEL = $DefaultClaudeOpusModel
      ANTHROPIC_SMALL_FAST_MODEL = $DefaultClaudeFastModel
      CLAUDE_CODE_SKIP_AUTH_LOGIN = "1"
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
      CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY = "1"
    }
    model = $DefaultClaudeModel
    review_model = $DefaultClaudeModel
    availableModels = $ClaudeModels
  }

  Write-JsonNoBom -Path $settingsPath -Data $settings
  Configure-ClaudeDesktop3p -ApiKey $ApiKey

  Write-Host "  Claude quedo configurado con Orbiqen." -ForegroundColor Green
  Write-Host "  Modelo inicial: $DefaultClaudeModel" -ForegroundColor DarkGray
  Write-Log "Claude configurado en $claudeDir"
}

function Configure-ClaudeDesktop3p {
  param([string]$ApiKey)

  $roots = @()
  if ($env:LOCALAPPDATA) { $roots += (Join-Path $env:LOCALAPPDATA "Claude-3p") }
  if ($env:APPDATA) { $roots += (Join-Path $env:APPDATA "Claude-3p") }

  foreach ($root in ($roots | Select-Object -Unique)) {
    $configPath = Join-Path $root "claude_desktop_config.json"
    $libraryDir = Join-Path $root "configLibrary"
    $metaPath = Join-Path $libraryDir "_meta.json"
    $providerId = [guid]::NewGuid().ToString()
    $providerPath = Join-Path $libraryDir "$providerId.json"

    Backup-File -Path $configPath
    Backup-File -Path $metaPath
    New-Item -ItemType Directory -Force -Path $libraryDir | Out-Null

    Write-JsonNoBom -Path $configPath -Data @{ deploymentMode = "3p" }
    Write-JsonNoBom -Path $metaPath -Data @{ appliedId = $providerId }

    $provider = [ordered]@{
      id = $providerId
      name = "Orbiqen"
      inferenceProvider = "gateway"
      inferenceCredentialKind = "static"
      inferenceGatewayBaseUrl = $ClaudeBaseUrl
      inferenceGatewayApiKey = $ApiKey
      inferenceGatewayAuthScheme = "x-api-key"
      modelDiscoveryEnabled = $false
      inferenceModels = $ClaudeModels
      defaultModel = $DefaultClaudeModel
      disableNonessentialTelemetry = $true
      disableNonessentialServices = $true
    }

    Write-JsonNoBom -Path $providerPath -Data $provider
    Write-Log "Claude Desktop 3p configurado en $root"
  }
}

function Main {
  "" | Set-Content -LiteralPath $DiagPath -Encoding UTF8
  Write-Log "Inicio del activador Orbiqen"
  Write-Title

  Write-Host "  Que queres configurar?" -ForegroundColor White
  Write-Host "    1. Codex con ChatGPT de Orbiqen"
  Write-Host "    2. Claude con modelos Claude de Orbiqen"
  Write-Host "    3. Ambos"
  Write-Host ""
  $choice = Read-Host "  Elegi una opcion (1/2/3)"

  $configureCodex = $choice.Trim() -eq "1" -or $choice.Trim() -eq "3"
  $configureClaude = $choice.Trim() -eq "2" -or $choice.Trim() -eq "3"

  if (-not $configureCodex -and -not $configureClaude) {
    throw "Opcion invalida."
  }

  if ($configureCodex) {
    $codexKey = Read-PlainKey -Prompt "Pega tu key para Codex / ChatGPT." -GroupHint "Debe ser una key creada en el grupo ChatGPT economico o ChatGPT estable."
    Configure-Codex -ApiKey $codexKey
  }

  if ($configureClaude) {
    $claudeKey = Read-PlainKey -Prompt "Pega tu key para Claude." -GroupHint "Debe ser una key creada en el grupo Claude."
    Configure-ClaudeEnvironment -ApiKey $claudeKey
  }

  Write-Host ""
  Write-Host "  Todo listo." -ForegroundColor Green
  Write-Host "  Cierra y vuelve a abrir Codex, Claude o tu editor para que tomen la nueva configuracion." -ForegroundColor White
  Write-Host "  Diagnostico: $DiagPath" -ForegroundColor DarkGray
  Write-Log "Activador finalizado correctamente"
}

try {
  Main
} catch {
  Write-Host ""
  Write-Host "  No se pudo completar la configuracion." -ForegroundColor Red
  Write-Host "  $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "  Diagnostico: $DiagPath" -ForegroundColor DarkGray
  Write-Log "ERROR: $($_.Exception.Message)"
} finally {
  Pause-End
}
