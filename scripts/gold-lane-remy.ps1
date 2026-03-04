param(
  [Parameter(Mandatory = $true)]
  [string]$EndAtIso,
  [Parameter(Mandatory = $true)]
  [string]$LogPath,
  [string]$WorkingDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Continue"
$endAt = [DateTimeOffset]::Parse($EndAtIso)
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $LogPath) | Out-Null

function Write-LaneLog {
  param(
    [string]$Message,
    [string]$Level = "INFO"
  )
  $stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $line = "[$stamp] [$Level] $Message"
  $line | Tee-Object -FilePath $LogPath -Append
}

function Wait-ForTcpPort {
  param(
    [string]$TcpHost = "127.0.0.1",
    [int]$Port,
    [int]$TimeoutSec = 180
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $async = $client.BeginConnect($TcpHost, $Port, $null, $null)
      if ($async.AsyncWaitHandle.WaitOne(1000, $false) -and $client.Connected) {
        $client.EndConnect($async) | Out-Null
        $client.Close()
        return $true
      }
      $client.Close()
    } catch {
      # retry
    }
    Start-Sleep -Seconds 2
  }
  return $false
}

function Invoke-LoggedCommand {
  param([string]$CommandText)

  Write-LaneLog "RUN $CommandText"
  Push-Location $WorkingDir
  try {
    cmd.exe /c $CommandText 2>&1 | Tee-Object -FilePath $LogPath -Append
    $exitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }

  if ($exitCode -eq 0) {
    Write-LaneLog "EXIT $exitCode :: $CommandText" "PASS"
  } else {
    Write-LaneLog "EXIT $exitCode :: $CommandText" "FAIL"
  }
  return $exitCode
}

Write-LaneLog "Remy lane started. Deadline: $($endAt.ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss zzz'))"

if (-not (Wait-ForTcpPort -Port 3100 -TimeoutSec 240)) {
  Write-LaneLog "Port 3100 did not open in time. Remy API tests may fail." "WARN"
}
if (-not (Wait-ForTcpPort -Port 11434 -TimeoutSec 30)) {
  Write-LaneLog "Ollama port 11434 is not available. Remy model suites may fail." "WARN"
}

$fullSweep = @(
  "npm run test:remy-quality:all",
  "npm run test:remy-quality:client:all"
)

$quickSweep = @(
  "npm run test:remy-quality:consistency",
  "npm run test:remy-quality:data-accuracy",
  "npm run test:remy-quality:tier",
  "npm run test:remy-quality:boundary",
  "npm run test:remy-quality:client:boundary",
  "npm run test:remy-quality:client:resilience"
)

foreach ($command in $fullSweep) {
  if ([DateTimeOffset]::Now -ge $endAt) {
    break
  }
  [void](Invoke-LoggedCommand $command)
}

$cycle = 1
while ([DateTimeOffset]::Now -lt $endAt) {
  Write-LaneLog "Starting Remy quick sweep cycle $cycle"
  foreach ($command in $quickSweep) {
    if ([DateTimeOffset]::Now -ge $endAt) {
      break
    }
    [void](Invoke-LoggedCommand $command)
  }
  $cycle++
}

Write-LaneLog "Remy lane complete."
