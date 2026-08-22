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
  Write-Host "   ORBIQEN - Configuracion inteligente y automatica" -ForegroundColor Cyan
  Write-Host "  =====================================================" -ForegroundColor DarkCyan
  Write-Host ""
  Write-Host "  Configura Codex y Claude para usar tu cuenta Orbiqen." -ForegroundColor White
  Write-Host "  Valida automaticamente tus modelos disponibles y los autoconfigura." -ForegroundColor Gray
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

    if ($value -match "^sk-[A-Za-z0-9_-]{15,}$") {
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

function Get-OrbiqenAvailableModels {
  param(
    [string]$Key,
    [string]$Label
  )

  Write-Host "  [1/4] Validando API Key y consultando modelos autorizados ($Label)..." -ForegroundColor Gray
  Write-Log "Consultando modelos para $Label en $OpenAiBaseUrl/models"

  $headers = @{
    Authorization = "Bearer $Key"
    "x-api-key" = $Key
  }

  $modelList = @()
  try {
    $response = Invoke-RestMethod -Uri "$OpenAiBaseUrl/models" -Headers $headers -Method GET -TimeoutSec 15
    if ($response -and $response.data) {
      foreach ($m in $response.data) {
        if ($m.id) {
          $modelList += [string]$m.id
        } elseif ($m -is [string]) {
          $modelList += [string]$m
        }
      }
    }
  } catch {
    try {
      $raw = Invoke-WebRequest -Uri "$OpenAiBaseUrl/models" -Headers $headers -Method GET -TimeoutSec 15 -UseBasicParsing
      if ($raw.Content) {
        $json = $raw.Content | ConvertFrom-Json
        if ($json -and $json.data) {
          foreach ($m in $json.data) {
            if ($m.id) { $modelList += [string]$m.id }
          }
        }
      }
    } catch {
      Write-Log "Aviso al consultar /models: $($_.Exception.Message)"
    }
  }

  if ($modelList.Count -gt 0) {
    Write-Host "        [OK] Key validada exitosamente. Modelos autorizados: $($modelList.Count)" -ForegroundColor Green
    Write-Log "Modelos detectados ($($modelList.Count)): $($modelList -join ', ')"
    return $modelList
  }

  Write-Host "        No se pudo obtener la lista de modelos dinamicamente del gateway." -ForegroundColor Yellow
  Write-Host "        (El endpoint respondio con formato distinto o red limitada)." -ForegroundColor DarkGray
  Write-Log "No se obtuvieron modelos de /models, solicitando decision a usuario"

  $answer = Read-Host "  Deseas continuar autoconfigurando con los modelos por defecto? (S/N)"
  if ($null -eq $answer) {
    $answer = ""
  }
  if ($answer.Trim().ToUpperInvariant() -eq "S") {
    return @()
  }
  return $null
}

function Select-BestCodexModel {
  param([string[]]$AvailableModels)

  $priorities = @(
    "gpt-5.5",
    "gpt-5.4",
    "gpt-5.6-terra",
    "gpt-5.4-mini",
    "gpt-4o",
    "gpt-4o-mini",
    "o3-mini",
    "o1-mini",
    "codex-auto-review"
  )

  if ($AvailableModels -and $AvailableModels.Count -gt 0) {
    foreach ($p in $priorities) {
      if ($AvailableModels -contains $p) {
        return $p
      }
    }
    $gptCandidates = @($AvailableModels | Where-Object { $_ -notlike "claude*" })
    if ($gptCandidates.Count -gt 0) {
      return $gptCandidates[0]
    }
    return $AvailableModels[0]
  }

  return $DefaultCodexModel
}

function Select-BestClaudeModels {
  param([string[]]$AvailableModels)

  $sonnetPriorities = @(
    "claude-sonnet-5",
    "claude-sonnet-4-6",
    "claude-3-7-sonnet-20250219",
    "claude-3-7-sonnet",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet",
    "claude-fable-5"
  )

  $opusPriorities = @(
    "claude-opus-4-8",
    "claude-opus-5",
    "claude-opus-4-7",
    "claude-opus-4-6",
    "claude-3-opus"
  )

  $haikuPriorities = @(
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6",
    "claude-3-5-haiku-20241022",
    "claude-3-5-haiku",
    "claude-3-haiku"
  )

  $claudeList = @($AvailableModels | Where-Object { $_ -like "claude*" })
  if ($claudeList.Count -eq 0 -and $AvailableModels -and $AvailableModels.Count -gt 0) {
    $claudeList = $AvailableModels
  }

  $selectedSonnet = $DefaultClaudeModel
  $selectedOpus = $DefaultClaudeOpusModel
  $selectedFast = $DefaultClaudeFastModel

  if ($claudeList.Count -gt 0) {
    foreach ($p in $sonnetPriorities) {
      if ($claudeList -contains $p) { $selectedSonnet = $p; break }
    }
    foreach ($p in $opusPriorities) {
      if ($claudeList -contains $p) { $selectedOpus = $p; break }
    }
    foreach ($p in $haikuPriorities) {
      if ($claudeList -contains $p) { $selectedFast = $p; break }
    }
  }

  $finalAvailable = if ($claudeList.Count -gt 0) { $claudeList } else { $ClaudeModels }

  return @{
    Sonnet = $selectedSonnet
    Opus = $selectedOpus
    Fast = $selectedFast
    AvailableModels = $finalAvailable
  }
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

  [Environment]::SetEnvironmentVariable("ORBIQEN_ACTIVE", "1", "User")
}

function Configure-Codex {
  param([string]$ApiKey)

  Write-Step "Configurando OpenAI Codex CLI..."

  $available = Get-OrbiqenAvailableModels -Key $ApiKey -Label "Codex / GPT"
  if ($null -eq $available) {
    throw "Configuracion de Codex cancelada por el usuario."
  }

  $chosenModel = Select-BestCodexModel -AvailableModels $available
  Write-Host "        -> Modelo optimo detectado y autoconfigurado: $chosenModel" -ForegroundColor Cyan
  Write-Log "Codex modelo seleccionado: $chosenModel"

  Write-Host "  [2/4] Preparando directorios y respaldos de seguridad..." -ForegroundColor Gray
  $codexDir = Join-Path $env:USERPROFILE ".codex"
  $configPath = Join-Path $codexDir "config.toml"
  $authPath = Join-Path $codexDir "auth.json"

  Backup-File -Path $configPath
  Backup-File -Path $authPath
  New-Item -ItemType Directory -Force -Path $codexDir | Out-Null

  Write-Host "  [3/4] Escribiendo configuracion personalizada en config.toml..." -ForegroundColor Gray
  $toml = @"
model_provider = "orbiqen"
model = "$chosenModel"
review_model = "$chosenModel"
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

  Write-Host "  [4/4] Guardando credencial en auth.json..." -ForegroundColor Gray
  Write-JsonNoBom -Path $authPath -Data @{ OPENAI_API_KEY = $ApiKey }

  Write-Host ""
  Write-Host "  Codex quedo configurado exitosamente con Orbiqen." -ForegroundColor Green
  Write-Host "  -> Endpoint: $OpenAiBaseUrl" -ForegroundColor DarkGray
  Write-Host "  -> Modelo activo: $chosenModel" -ForegroundColor White
  Write-Log "Codex configurado con exito en $codexDir con modelo $chosenModel"
}

function Configure-ClaudeEnvironment {
  param([string]$ApiKey)

  Write-Step "Configurando Claude Code y Claude Desktop..."

  $available = Get-OrbiqenAvailableModels -Key $ApiKey -Label "Claude"
  if ($null -eq $available) {
    throw "Configuracion de Claude cancelada por el usuario."
  }

  $claudeConfig = Select-BestClaudeModels -AvailableModels $available
  $sonnet = $claudeConfig.Sonnet
  $opus = $claudeConfig.Opus
  $fast = $claudeConfig.Fast
  $modelsList = $claudeConfig.AvailableModels

  Write-Host "        -> Modelo principal (Sonnet): $sonnet" -ForegroundColor Cyan
  Write-Host "        -> Modelo avanzado (Opus): $opus" -ForegroundColor DarkCyan
  Write-Host "        -> Modelo rapido (Haiku): $fast" -ForegroundColor DarkGray
  Write-Host "        -> Total modelos Claude habilitados: $($modelsList.Count)" -ForegroundColor Gray
  Write-Log "Claude configurado con Sonnet: $sonnet, Opus: $opus, Fast: $fast, Total: $($modelsList.Count)"

  Write-Host "  [2/4] Aplicando variables de entorno de Windows en segundo plano..." -ForegroundColor Gray
  $envMap = @{
    "ANTHROPIC_BASE_URL" = $ClaudeBaseUrl
    "ANTHROPIC_AUTH_TOKEN" = $ApiKey
    "ANTHROPIC_API_KEY" = $null
    "ANTHROPIC_DEFAULT_SONNET_MODEL" = $sonnet
    "ANTHROPIC_DEFAULT_OPUS_MODEL" = $opus
    "ANTHROPIC_SMALL_FAST_MODEL" = $fast
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
      ANTHROPIC_DEFAULT_SONNET_MODEL = $sonnet
      ANTHROPIC_DEFAULT_OPUS_MODEL = $opus
      ANTHROPIC_SMALL_FAST_MODEL = $fast
      CLAUDE_CODE_SKIP_AUTH_LOGIN = "1"
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
      CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY = "1"
    }
    model = $sonnet
    review_model = $sonnet
    availableModels = $modelsList
  }

  Write-JsonNoBom -Path $settingsPath -Data $settings

  Write-Host "  [4/4] Configurando perfiles de Claude Desktop..." -ForegroundColor Gray
  Configure-ClaudeDesktop3p -ApiKey $ApiKey -ClaudeConfig $claudeConfig

  Write-Host ""
  Write-Host "  Claude quedo configurado exitosamente con Orbiqen." -ForegroundColor Green
  Write-Host "  -> Endpoint: $ClaudeBaseUrl" -ForegroundColor DarkGray
  Write-Host "  -> Modelo principal: $sonnet" -ForegroundColor White
  Write-Log "Claude configurado en $claudeDir"
}

function Configure-ClaudeDesktop3p {
  param(
    [string]$ApiKey,
    [hashtable]$ClaudeConfig
  )

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
      inferenceModels = $ClaudeConfig.AvailableModels
      defaultModel = $ClaudeConfig.Sonnet
      disableNonessentialTelemetry = $true
      disableNonessentialServices = $true
    }

    Write-JsonNoBom -Path $providerPath -Data $provider
    Write-Log "Claude Desktop 3p configurado en $root con modelo $($ClaudeConfig.Sonnet)"
  }
}

function Main {
  "" | Set-Content -LiteralPath $DiagPath -Encoding UTF8
  Write-Log "Inicio del activador Orbiqen con validacion dinamica de modelos"
  Write-Title

  Write-Host "  Elegi que queres configurar:" -ForegroundColor White
  Write-Host ""
  Write-Host "    [1] Codex / GPT" -ForegroundColor Green
  Write-Host "        Autodetecta tus modelos GPT y configura Codex CLI." -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "    [2] Claude" -ForegroundColor Magenta
  Write-Host "        Autodetecta tus modelos Claude y configura Claude Code / Desktop." -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "    [3] Codex / GPT + Claude" -ForegroundColor Cyan
  Write-Host "        Configura ambas aplicaciones validando sus modelos." -ForegroundColor DarkGray
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
    $codexKey = Read-PlainKey -Prompt "KEY DE CODEX / GPT" -GroupHint "Pega una key creada en el grupo ChatGPT economico o ChatGPT estable."
    Configure-Codex -ApiKey $codexKey
  }

  if ($configureClaude) {
    $claudeKey = Read-PlainKey -Prompt "KEY DE CLAUDE" -GroupHint "Pega una key creada en el grupo Claude."
    Configure-ClaudeEnvironment -ApiKey $claudeKey
  }

  Write-Host ""
  Write-Host "  =====================================================" -ForegroundColor DarkGreen
  Write-Host "   [OK] CONFIGURACION FINALIZADA CON EXITO" -ForegroundColor Green
  Write-Host "  =====================================================" -ForegroundColor DarkGreen
  Write-Host ""
  Write-Host "  Los modelos y endpoints fueron validados y configurados." -ForegroundColor White
  Write-Host "  1. Ya podes cerrar esta ventana." -ForegroundColor Gray
  Write-Host "  2. Si tenias abierto Codex, Claude o tu editor, reinicialos para cargar la nueva configuracion." -ForegroundColor Gray
  Write-Host "  Diagnostico guardado en: $DiagPath" -ForegroundColor DarkGray
  Write-Log "Activador finalizado correctamente con exito"
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
