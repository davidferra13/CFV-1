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

Write-LaneLog "Hardening lane started. Deadline: $($endAt.ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss zzz'))"

$cycleCommands = @(
  "npx tsc -p tsconfig.ci.json --noEmit --skipLibCheck",
  "npm run lint",
  "npm run test:unit:financial",
  "npm run test:critical",
  "npm run test:integration",
  "npm run audit:db"
)

$cycle = 1
while ([DateTimeOffset]::Now -lt $endAt) {
  Write-LaneLog "Starting hardening cycle $cycle"
  foreach ($command in $cycleCommands) {
    if ([DateTimeOffset]::Now -ge $endAt) {
      break
    }
    [void](Invoke-LoggedCommand $command)
  }
  $cycle++
}

Write-LaneLog "Hardening lane complete."
