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
  Write-Host "  =====================================================" -ForegroundColor DarkCyan
  Write-Host "   ORBIQEN - Configuracion automatica" -ForegroundColor Cyan
  Write-Host "  =====================================================" -ForegroundColor DarkCyan
  Write-Host ""
  Write-Host "  Configura Codex y Claude para usar tu cuenta Orbiqen." -ForegroundColor White
  Write-Host "  Solo necesitas pegar la API key correspondiente." -ForegroundColor Gray
  Write-Host ""
}

function Write-Step {
  param([string]$Text)
  Write-Host ""
  Write-Host "  $Text" -ForegroundColor Cyan
}

function Write-SubStep {
  param([string]$Text)
  Write-Host "    -> $Text" -ForegroundColor DarkGray
}

function Pause-End {
  if (-not $NoPause) {
    Write-Host ""
    Write-Host "  Presiona ENTER para cerrar esta ventana..." -ForegroundColor DarkCyan
    $null = Read-Host
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
    $value = Read-Host "  Pega la key y presiona ENTER"
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

  Write-Host "  [1/4] Verificando conexion con Orbiqen ($Label)..." -ForegroundColor Gray

  try {
    $headers = @{
      Authorization = "Bearer $Key"
      "x-api-key" = $Key
    }
    $response = Invoke-WebRequest -Uri "$OpenAiBaseUrl/models" -Headers $headers -Method GET -TimeoutSec 25 -UseBasicParsing
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
      Write-Host "        Conexion correcta y API key valida." -ForegroundColor Green
      Write-Log "Validacion $Label OK HTTP $($response.StatusCode)"
      return $true
    }
  } catch {
    Write-Host "        No se pudo validar automaticamente: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "        Si la key es nueva o tiene modelos limitados, igual podemos configurar." -ForegroundColor DarkGray
    Write-Log "Validacion $Label fallo: $($_.Exception.Message)"
  }

  $answer = Read-Host "  Queres continuar de todos modos? (S/N)"
  if ($null -eq $answer) {
    $answer = ""
  }
  return ($answer.Trim().ToUpperInvariant() -eq "S")
}

function Set-UserEnvBulk {
  param([hashtable]$Vars)

  foreach ($k in $Vars.Keys) {
    $v = $Vars[$k]
    if ($null -eq $v) {
      Remove-ItemProperty -Path "HKCU:\Environment" -Name $k -ErrorAction SilentlyContinue
    } else {
      Set-ItemProperty -Path "HKCU:\Environment" -Name $k -Value $v -Type String
    }
  }

  # Broadcast WM_SETTINGCHANGE to notify Windows of changes
  [Environment]::SetEnvironmentVariable("ORBIQEN_ACTIVE", "1", "User")
}

function Configure-Codex {
  param([string]$ApiKey)

  Write-Step "Configurando Codex CLI..."

  if (-not (Test-OrbiqenModels -Key $ApiKey -Label "Codex / ChatGPT")) {
    throw "Configuracion de Codex cancelada."
  }

  Write-Host "  [2/4] Preparando directorios y respaldos..." -ForegroundColor Gray
  $codexDir = Join-Path $env:USERPROFILE ".codex"
  $configPath = Join-Path $codexDir "config.toml"
  $authPath = Join-Path $codexDir "auth.json"

  Backup-File -Path $configPath
  Backup-File -Path $authPath
  New-Item -ItemType Directory -Force -Path $codexDir | Out-Null

  Write-Host "  [3/4] Escribiendo configuracion de Orbiqen en config.toml..." -ForegroundColor Gray
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

  Write-Host "  [4/4] Guardando autenticacion en auth.json..." -ForegroundColor Gray
  Write-JsonNoBom -Path $authPath -Data @{ OPENAI_API_KEY = $ApiKey }

  Write-Host ""
  Write-Host "  Codex quedo configurado exitosamente con Orbiqen." -ForegroundColor Green
  Write-Host "  Modelo predeterminado: $DefaultCodexModel" -ForegroundColor DarkGray
  Write-Log "Codex configurado en $codexDir"
}

function Configure-ClaudeEnvironment {
  param([string]$ApiKey)

  Write-Step "Configurando Claude..."

  if (-not (Test-OrbiqenModels -Key $ApiKey -Label "Claude")) {
    throw "Configuracion de Claude cancelada."
  }

  Write-Host "  [2/4] Aplicando variables de entorno de Windows en segundo plano..." -ForegroundColor Gray
  $envMap = @{
    "ANTHROPIC_BASE_URL" = $ClaudeBaseUrl
    "ANTHROPIC_AUTH_TOKEN" = $ApiKey
    "ANTHROPIC_API_KEY" = $null
    "ANTHROPIC_DEFAULT_SONNET_MODEL" = $DefaultClaudeModel
    "ANTHROPIC_DEFAULT_OPUS_MODEL" = $DefaultClaudeOpusModel
    "ANTHROPIC_SMALL_FAST_MODEL" = $DefaultClaudeFastModel
    "CLAUDE_CODE_SKIP_AUTH_LOGIN" = "1"
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC" = "1"
    "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY" = "1"
  }
  Set-UserEnvBulk -Vars $envMap

  Write-Host "  [3/4] Generando archivo de configuracion .claude\settings.json..." -ForegroundColor Gray
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

  Write-Host "  [4/4] Verificando perfiles de Claude Desktop..." -ForegroundColor Gray
  Configure-ClaudeDesktop3p -ApiKey $ApiKey

  Write-Host ""
  Write-Host "  Claude quedo configurado exitosamente con Orbiqen." -ForegroundColor Green
  Write-Host "  Modelo predeterminado: $DefaultClaudeModel" -ForegroundColor DarkGray
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

  Write-Host "  Elegi que queres configurar:" -ForegroundColor White
  Write-Host ""
  Write-Host "    [1] Codex / GPT" -ForegroundColor Green
  Write-Host "        Para usar Codex con los modelos GPT de Orbiqen." -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "    [2] Claude" -ForegroundColor Magenta
  Write-Host "        Para usar Claude Code o Claude Desktop." -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "    [3] Codex / GPT + Claude" -ForegroundColor Cyan
  Write-Host "        Configura las dos aplicaciones." -ForegroundColor DarkGray
  Write-Host ""
  $choice = Read-Host "  Opcion (1/2/3)"
  if ($null -eq $choice) {
    $choice = ""
  }

  $configureCodex = $choice.Trim() -eq "1" -or $choice.Trim() -eq "3"
  $configureClaude = $choice.Trim() -eq "2" -or $choice.Trim() -eq "3"

  if (-not $configureCodex -and -not $configureClaude) {
    throw "Opcion invalida."
  }

  if ($configureCodex) {
    $codexKey = Read-PlainKey -Prompt "KEY DE CODEX / GPT" -GroupHint "Usa una key creada en el grupo ChatGPT economico o ChatGPT estable."
    Configure-Codex -ApiKey $codexKey
  }

  if ($configureClaude) {
    $claudeKey = Read-PlainKey -Prompt "KEY DE CLAUDE" -GroupHint "Usa una key creada en el grupo Claude."
    Configure-ClaudeEnvironment -ApiKey $claudeKey
  }

  Write-Host ""
  Write-Host "  =====================================================" -ForegroundColor DarkGreen
  Write-Host "   [OK] CONFIGURACION FINALIZADA CON EXITO" -ForegroundColor Green
  Write-Host "  =====================================================" -ForegroundColor DarkGreen
  Write-Host ""
  Write-Host "  Los cambios ya fueron aplicados en el sistema." -ForegroundColor White
  Write-Host "  1. Ya podes cerrar esta ventana." -ForegroundColor Gray
  Write-Host "  2. Si tenias abierto Codex, Claude o tu editor, reinicialos." -ForegroundColor Gray
  Write-Host "  Diagnostico: $DiagPath" -ForegroundColor DarkGray
  Write-Log "Activador finalizado correctamente"
}

try {
  Main
} catch {
  Write-Host ""
  Write-Host "  =====================================================" -ForegroundColor DarkRed
  Write-Host "   NO SE PUDO COMPLETAR LA CONFIGURACION" -ForegroundColor Red
  Write-Host "  =====================================================" -ForegroundColor DarkRed
  Write-Host "  Detalle: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "  Diagnostico: $DiagPath" -ForegroundColor DarkGray
  Write-Log "ERROR: $($_.Exception.Message)"
} finally {
  Pause-End
}
