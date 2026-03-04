param(
  [string]$RunDir = "",
  [int]$QueueHours = 12,
  [string]$Headed = "1"
)

$ErrorActionPreference = "Stop"

if ($QueueHours -lt 1 -or $QueueHours -gt 48) {
  throw "QueueHours must be between 1 and 48."
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportsDir = Join-Path $root "reports"

function Resolve-LatestGoldRunDir {
  if (-not (Test-Path $reportsDir)) {
    return ""
  }

  $latest = Get-ChildItem -Path $reportsDir -Directory |
    Where-Object { $_.Name -like "gold-watch-*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($null -eq $latest) {
    return ""
  }
  return $latest.FullName
}

$targetRunDir = ""
if ([string]::IsNullOrWhiteSpace($RunDir)) {
  $targetRunDir = Resolve-LatestGoldRunDir
  if ([string]::IsNullOrWhiteSpace($targetRunDir)) {
    throw "No gold-watch run found under $reportsDir"
  }
} else {
  $candidate = if ([System.IO.Path]::IsPathRooted($RunDir)) { $RunDir } else { Join-Path $root $RunDir }
  if (-not (Test-Path $candidate)) {
    throw "Run directory does not exist: $candidate"
  }
  $targetRunDir = (Resolve-Path $candidate).Path
}

$manifestPath = Join-Path $targetRunDir "manifest.json"
if (-not (Test-Path $manifestPath)) {
  throw "Not a gold-watch run dir (manifest missing): $targetRunDir"
}

$managerScript = Join-Path $root "scripts\gold-followup-manager.ps1"
$cmd = "& '$managerScript' -RunDir '$targetRunDir' -QueueHours $QueueHours -Headed '$Headed'"

$proc = Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", "`$Host.UI.RawUI.WindowTitle = 'GOLD FOLLOWUP MANAGER'; $cmd"
) -WorkingDirectory $root -PassThru

Write-Host ""
Write-Host "Follow-up queue manager scheduled."
Write-Host "Source run : $targetRunDir"
Write-Host "Queue hours: $QueueHours"
Write-Host "Headed     : $Headed"
Write-Host "PID        : $($proc.Id)"
Write-Host ""
Write-Host "A new terminal window is now watching the current run and will auto-start the next queue."
