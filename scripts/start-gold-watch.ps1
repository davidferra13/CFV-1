param(
  [int]$Hours = 12,
  [string]$Headed = "1"
)

$ErrorActionPreference = "Stop"

if ($Hours -lt 1 -or $Hours -gt 48) {
  throw "Hours must be between 1 and 48."
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportsDir = Join-Path $root "reports"
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

$headedNormalized = $Headed.Trim().ToLowerInvariant()
$isHeaded = @("1", "true", "yes", "y", "on").Contains($headedNormalized)

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runDir = Join-Path $reportsDir "gold-watch-$stamp"
$logsDir = Join-Path $runDir "logs"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

# Load window placement utility (moves spawned windows to secondary monitor)
$windowPlacementPath = Join-Path $PSScriptRoot "lib\window-placement.ps1"
if (Test-Path $windowPlacementPath) {
  . $windowPlacementPath
  $useWindowPlacement = $true
} else {
  $useWindowPlacement = $false
}

$endAt = [DateTimeOffset]::Now.AddHours($Hours)
$endIso = $endAt.ToString("o")

$computer = Get-CimInstance Win32_ComputerSystem
$processor = Get-CimInstance Win32_Processor
$os = Get-CimInstance Win32_OperatingSystem

$logical = [int]$computer.NumberOfLogicalProcessors
$cores = [int]$processor.NumberOfCores
$ramGb = [math]::Round($computer.TotalPhysicalMemory / 1GB, 1)
$freeRamGb = [math]::Round(($os.FreePhysicalMemory * 1KB) / 1GB, 1)

$useRemyLane = $true
$useHardeningLane = $true

if ($logical -lt 8 -or $ramGb -lt 16) {
  $useRemyLane = $false
  $useHardeningLane = $true
} elseif ($logical -lt 12 -or $ramGb -lt 32) {
  $useRemyLane = $true
  $useHardeningLane = $false
}

function Test-TcpPort {
  param(
    [string]$TcpHost = "127.0.0.1",
    [int]$Port
  )
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($TcpHost, $Port, $null, $null)
    $ok = $async.AsyncWaitHandle.WaitOne(800, $false) -and $client.Connected
    if ($ok) {
      $client.EndConnect($async) | Out-Null
    }
    $client.Close()
    return $ok
  } catch {
    return $false
  }
}

$startServerLane = -not (Test-TcpPort -Port 3100)

$manifest = [ordered]@{
  createdAt = (Get-Date).ToString("o")
  endsAt = $endIso
  hours = $Hours
  headed = $isHeaded
  machine = [ordered]@{
    cpu = $processor.Name
    cores = $cores
    logicalProcessors = $logical
    totalRamGb = $ramGb
    freeRamGb = $freeRamGb
  }
  lanes = [ordered]@{
    server = $startServerLane
    core = $true
    remy = $useRemyLane
    hardening = $useHardeningLane
  }
}

$manifestPath = Join-Path $runDir "manifest.json"
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $manifestPath

function Start-GoldWindow {
  param(
    [string]$Title,
    [string]$CommandText
  )

  $cmd = "`$Host.UI.RawUI.WindowTitle = '$Title'; $CommandText"
  $args_ = @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", $cmd
  )

  if ($useWindowPlacement) {
    $proc = Start-ProcessOnSecondaryMonitor -FilePath "powershell.exe" -ArgumentList $args_ -WorkingDirectory $root -PreserveSize
  } else {
    $proc = Start-Process -FilePath "powershell.exe" -ArgumentList $args_ -WorkingDirectory $root -PassThru
  }

  return $proc
}

$serverLog = Join-Path $logsDir "lane-server.log"
$coreLog = Join-Path $logsDir "lane-core.log"
$remyLog = Join-Path $logsDir "lane-remy.log"
$hardeningLog = Join-Path $logsDir "lane-hardening.log"

$serverCommand = "Set-Location '$root'; npm run dev 2>&1 | Tee-Object -FilePath '$serverLog' -Append"
$coreScript = Join-Path $root "scripts\gold-lane-core.ps1"
$coreCommand = "Set-Location '$root'; & '$coreScript' -EndAtIso '$endIso' -LogPath '$coreLog' -WorkingDir '$root'"
if ($isHeaded) {
  $coreCommand += " -Headed"
}

$remyScript = Join-Path $root "scripts\gold-lane-remy.ps1"
$remyCommand = "Set-Location '$root'; & '$remyScript' -EndAtIso '$endIso' -LogPath '$remyLog' -WorkingDir '$root'"

$hardeningScript = Join-Path $root "scripts\gold-lane-hardening.ps1"
$hardeningCommand = "Set-Location '$root'; & '$hardeningScript' -EndAtIso '$endIso' -LogPath '$hardeningLog' -WorkingDir '$root'"

Write-Host ""
Write-Host "Gold Watch Run Created"
Write-Host "Run Directory : $runDir"
Write-Host "Ends At       : $($endAt.ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss zzz'))"
Write-Host "CPU / RAM     : $cores cores, $logical threads, $ramGb GB RAM ($freeRamGb GB free)"
Write-Host "Headed Mode   : $isHeaded"
Write-Host "Lanes         : $($(if ($startServerLane) { 'server + ' } else { '' }))core$($(if ($useRemyLane) { ' + remy' } else { '' }))$($(if ($useHardeningLane) { ' + hardening' } else { '' }))"
Write-Host ""

$processes = @()
if ($startServerLane) {
  $processes += Start-GoldWindow -Title "GOLD SERVER" -CommandText $serverCommand
  Start-Sleep -Seconds 8
} else {
  Write-Host "Port 3100 already in use. Reusing existing dev server."
}
$processes += Start-GoldWindow -Title "GOLD CORE" -CommandText $coreCommand

if ($useRemyLane) {
  Start-Sleep -Seconds 2
  $processes += Start-GoldWindow -Title "GOLD REMY" -CommandText $remyCommand
}
if ($useHardeningLane) {
  Start-Sleep -Seconds 2
  $processes += Start-GoldWindow -Title "GOLD HARDENING" -CommandText $hardeningCommand
}

$pidPath = Join-Path $runDir "pids.json"
$pidPayload = [ordered]@{
  createdAt = (Get-Date).ToString("o")
  runDir = $runDir
  pids = $processes | ForEach-Object {
    [ordered]@{
      id = $_.Id
      processName = $_.ProcessName
      startedAt = (Get-Date).ToString("o")
    }
  }
}
$pidPayload | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 $pidPath

Write-Host "Windows opened:"
$processes | ForEach-Object { Write-Host "  PID $($_.Id)  $($_.ProcessName)" }
Write-Host ""
Write-Host "Live logs are also written under: $logsDir"
Write-Host "Morning summary command: npm run gold:brief -- --run-dir `"$runDir`""
