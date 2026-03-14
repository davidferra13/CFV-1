param(
  [string]$CloneDir = "C:\Users\david\Documents\CFv1-openclaw-clone",
  [int]$Port = 3300,
  [string]$BindHost = "::",
  [string]$PublicHost = "localhost"
)

$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param(
    [string]$EnvPath,
    [string]$Name
  )

  if (-not (Test-Path $EnvPath)) {
    return $null
  }

  foreach ($line in Get-Content $EnvPath) {
    if ($line -match "^\s*$Name=(.*)$") {
      return $matches[1].Trim()
    }
  }

  return $null
}

function Test-HttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 3
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSeconds
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  } catch {
    return $false
  }
}

function Ensure-LocalSupabase {
  param([string]$WorkingDirectory)

  $healthUrl = "http://127.0.0.1:54321/auth/v1/health"
  if (Test-HttpOk -Url $healthUrl) {
    return
  }

  Write-Host "Local Supabase is not healthy. Starting it before launching OpenClaw..."
  & npx supabase start | Out-Host

  $maxAttempts = 30
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    Start-Sleep -Seconds 2
    if (Test-HttpOk -Url $healthUrl) {
      Write-Host "Local Supabase auth is healthy."
      return
    }
  }

  throw "Local Supabase auth did not become healthy at $healthUrl"
}

if (-not (Test-Path $CloneDir)) {
  throw "Clone directory not found: $CloneDir"
}

$nodeModulesPath = Join-Path $CloneDir "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
  throw "Clone is missing node_modules: $nodeModulesPath"
}

$logFile = Join-Path $CloneDir "openclaw-watch.log"
$pidFile = Join-Path $CloneDir "openclaw-watch.pid"
$envFile = Join-Path $CloneDir ".env.local"
$distDir = Join-Path $CloneDir ".next-dev"

$supabaseUrl = Get-EnvValue -EnvPath $envFile -Name "NEXT_PUBLIC_SUPABASE_URL"
if ($supabaseUrl -and ($supabaseUrl.Contains("127.0.0.1") -or $supabaseUrl.Contains("localhost"))) {
  Ensure-LocalSupabase -WorkingDirectory $CloneDir
}

$existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
if ($existing) {
  foreach ($existingPid in $existing) {
    Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2
}

if (Test-Path $logFile) {
  Remove-Item $logFile -Force
}

if (Test-Path $distDir) {
  Remove-Item $distDir -Recurse -Force
}

$command = "set `"NEXT_PUBLIC_SITE_URL=http://$PublicHost`:$Port`" && set `"NEXT_PUBLIC_APP_URL=http://$PublicHost`:$Port`" && set `"PORT=$Port`" && npx next dev -p $Port -H $BindHost >> `"$logFile`" 2>&1"

$process = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", $command `
  -WorkingDirectory $CloneDir `
  -WindowStyle Minimized `
  -PassThru

Set-Content -Path $pidFile -Value $process.Id

Write-Host "Started OpenClaw watch server on http://localhost:$Port"
Write-Host "PID: $($process.Id)"
Write-Host "Log: $logFile"
