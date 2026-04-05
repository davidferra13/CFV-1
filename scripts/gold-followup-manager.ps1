param(
  [Parameter(Mandatory = $true)]
  [string]$RunDir,
  [int]$QueueHours = 12,
  [string]$Headed = "1"
)

$ErrorActionPreference = "Stop"

if ($QueueHours -lt 1 -or $QueueHours -gt 48) {
  throw "QueueHours must be between 1 and 48."
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

# Load window placement utility (moves spawned windows to secondary monitor)
$windowPlacementPath = Join-Path $root "scripts\lib\window-placement.ps1"
if (Test-Path $windowPlacementPath) {
  . $windowPlacementPath
  $useWindowPlacement = $true
} else {
  $useWindowPlacement = $false
}
$runDirResolved = if ([System.IO.Path]::IsPathRooted($RunDir)) { $RunDir } else { (Resolve-Path (Join-Path $root $RunDir)).Path }

$manifestPath = Join-Path $runDirResolved "manifest.json"
$pidsPath = Join-Path $runDirResolved "pids.json"
if (-not (Test-Path $manifestPath)) {
  throw "Missing manifest.json in run directory: $runDirResolved"
}

$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
$endAt = [DateTimeOffset]::Parse($manifest.endsAt)
$managerLog = Join-Path $runDirResolved "followup-manager.log"

function Write-ManagerLog {
  param(
    [string]$Message,
    [string]$Level = "INFO"
  )
  $stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $line = "[$stamp] [$Level] $Message"
  $line | Tee-Object -FilePath $managerLog -Append
}

function Get-TrackedPids {
  if (-not (Test-Path $pidsPath)) {
    return @()
  }
  try {
    $pidPayload = Get-Content -Raw $pidsPath | ConvertFrom-Json
    return @($pidPayload.pids | ForEach-Object { [int]$_.id })
  } catch {
    return @()
  }
}

function Get-RunningTrackedPids {
  param([int[]]$TrackedPids)
  $running = @()
  foreach ($id in $TrackedPids) {
    try {
      $null = Get-Process -Id $id -ErrorAction Stop
      $running += $id
    } catch {
      # not running
    }
  }
  return $running
}

function Test-TcpPort {
  param(
    [string]$TcpHost = "127.0.0.1",
    [int]$Port
  )
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($TcpHost, $Port, $null, $null)
    $ok = $async.AsyncWaitHandle.WaitOne(1000, $false) -and $client.Connected
    if ($ok) {
      $client.EndConnect($async) | Out-Null
    }
    $client.Close()
    return $ok
  } catch {
    return $false
  }
}

Write-ManagerLog "Follow-up manager started for run: $runDirResolved"
Write-ManagerLog "Current run planned end: $($endAt.ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss zzz'))"
Write-ManagerLog "Queue hours requested: $QueueHours"

$trackedPids = Get-TrackedPids
Write-ManagerLog "Tracked lane PIDs: $($trackedPids -join ', ')"

$waitReason = ""
$lastHeartbeat = [DateTimeOffset]::MinValue
$hardDeadline = $endAt.AddMinutes(20)

while ($true) {
  $now = [DateTimeOffset]::Now
  $running = Get-RunningTrackedPids -TrackedPids $trackedPids

  if ($running.Count -eq 0 -and $trackedPids.Count -gt 0) {
    $waitReason = "all tracked lane windows exited"
    break
  }
  if ($trackedPids.Count -eq 0 -and $now -ge $endAt) {
    $waitReason = "planned end reached (no tracked PIDs)"
    break
  }
  if ($now -ge $hardDeadline) {
    $waitReason = "planned end + 20m grace reached"
    break
  }

  if (($now - $lastHeartbeat).TotalMinutes -ge 5) {
    $remainingMin = [math]::Round(($endAt - $now).TotalMinutes, 1)
    Write-ManagerLog "Waiting... active PIDs: $($running -join ', ') | remaining to planned end: ${remainingMin}m"
    $lastHeartbeat = $now
  }

  Start-Sleep -Seconds 60
}

Write-ManagerLog "Triggering follow-up queue because $waitReason"

$reportsDir = Join-Path $root "reports"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$followupDir = Join-Path $reportsDir "gold-followup-$stamp"
$followupLogs = Join-Path $followupDir "logs"
New-Item -ItemType Directory -Force -Path $followupDir | Out-Null
New-Item -ItemType Directory -Force -Path $followupLogs | Out-Null

$queueEnd = [DateTimeOffset]::Now.AddHours($QueueHours)
$queueEndIso = $queueEnd.ToString("o")
$queueLog = Join-Path $followupLogs "queue.log"
$queueContext = [ordered]@{
  createdAt = (Get-Date).ToString("o")
  sourceRunDir = $runDirResolved
  triggerReason = $waitReason
  queueEndsAt = $queueEndIso
  queueHours = $QueueHours
}
$queueContext | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 (Join-Path $followupDir "context.json")

if (-not (Test-TcpPort -Port 3100)) {
  $serverLog = Join-Path $followupLogs "server.log"
  $serverCommand = "Set-Location '$root'; npm run dev 2>&1 | Tee-Object -FilePath '$serverLog' -Append"
  $spawnArgs = @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", "`$Host.UI.RawUI.WindowTitle = 'GOLD FOLLOWUP SERVER'; $serverCommand"
  )
  if ($useWindowPlacement) {
    $proc = Start-ProcessOnSecondaryMonitor -FilePath "powershell.exe" -ArgumentList $spawnArgs -WorkingDirectory $root -PreserveSize
  } else {
    $proc = Start-Process -FilePath "powershell.exe" -ArgumentList $spawnArgs -WorkingDirectory $root -PassThru
  }
  Write-ManagerLog "Started follow-up server window PID $($proc.Id)"
  Start-Sleep -Seconds 10
} else {
  Write-ManagerLog "Port 3100 already active. Reusing existing server."
}

$queueScript = Join-Path $root "scripts\gold-followup-queue.ps1"
Write-ManagerLog "Starting follow-up queue run at $followupDir"
& $queueScript -EndAtIso $queueEndIso -RunDir $followupDir -WorkingDir $root -Headed $Headed

Write-ManagerLog "Running morning brief for source gold run..."
Push-Location $root
try {
  cmd.exe /c "npm run gold:brief -- --run-dir `"$runDirResolved`"" 2>&1 | Tee-Object -FilePath $managerLog -Append
} finally {
  Pop-Location
}

Write-ManagerLog "Follow-up manager complete."
Write-ManagerLog "Follow-up directory: $followupDir"
