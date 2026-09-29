param(
  [Parameter(Mandatory = $true)]
  [string]$Scraper,
  [string]$NordGroup = 'United States',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$NordExe = 'C:\Program Files\NordVPN\NordVPN.exe'
$AllowedRoot = (Resolve-Path (Join-Path $RepoRoot '.openclaw-build\services')).Path

function Get-PublicIp {
  try {
    return (Invoke-RestMethod -TimeoutSec 8 'https://api.ipify.org?format=json').ip
  } catch {
    throw "Could not verify public egress IP: $($_.Exception.Message)"
  }
}

function Disconnect-Nord {
  if (-not (Test-Path $NordExe)) { return }
  try {
    Start-Process $NordExe -ArgumentList '-d' -WindowStyle Hidden | Out-Null
  } catch {}
}
function Resolve-Scraper {
  param([string]$Name)
  if ($Name -notmatch '^scraper-[a-z0-9-]+\.mjs$') {
    throw 'Scraper must be a scraper-*.mjs filename.'
  }
  $candidate = Join-Path $AllowedRoot $Name
  $resolved = (Resolve-Path $candidate -ErrorAction Stop).Path
  if (-not $resolved.StartsWith($AllowedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Scraper resolved outside the OpenClaw services directory.'
  }
  return $resolved
}

if (-not (Test-Path $NordExe)) {
  throw 'NordVPN is not installed at the expected path.'
}

$service = Get-Service 'nordvpn-service' -ErrorAction Stop
if ($service.Status -ne 'Running') {
  throw 'NordVPN service is not running. Refusing to mark collector egress isolated.'
}

$scraperPath = Resolve-Scraper $Scraper
$beforeIp = Get-PublicIp
Write-Output "Baseline egress: $beforeIp"
if ($DryRun) {
  Write-Output "DRY RUN: would connect NordVPN group '$NordGroup' and run $scraperPath"
  exit 0
}

$connectProc = $null
try {
  $connectProc = Start-Process $NordExe -ArgumentList @('-c','-g',$NordGroup) -PassThru
  $deadline = (Get-Date).AddSeconds(45)
  $afterIp = $null
  $adapterUp = $false

  do {
    Start-Sleep -Seconds 3
    $afterIp = Get-PublicIp
    $adapterUp = @(Get-NetAdapter -ErrorAction SilentlyContinue |
      Where-Object {
        ($_.Name -match 'Nord|OpenVPN') -and $_.Status -eq 'Up'
      }).Count -gt 0
    if ($adapterUp -and $afterIp -and $afterIp -ne $beforeIp) { break }
  } while ((Get-Date) -lt $deadline)

  if (-not $adapterUp -or -not $afterIp -or $afterIp -eq $beforeIp) {
    throw 'NordVPN egress could not be proven. Collector was not started.'
  }

  Write-Output "Verified isolated egress: $afterIp"
  $env:OPENCLAW_EGRESS_PROFILE = 'isolated'
  $node = (Get-Command node -ErrorAction Stop).Source
  & $node $scraperPath
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "Collector exited with code $exitCode"
  }
} finally {
  Remove-Item Env:OPENCLAW_EGRESS_PROFILE -ErrorAction SilentlyContinue
  Disconnect-Nord
  if ($connectProc -and -not $connectProc.HasExited) {
    try { Stop-Process -Id $connectProc.Id -Force -ErrorAction SilentlyContinue } catch {}
  }
}

Write-Output 'Collector completed and VPN disconnect was requested.'
