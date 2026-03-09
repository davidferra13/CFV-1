param(
  [Parameter(Mandatory = $true)]
  [string]$EndAtIso,
  [Parameter(Mandatory = $true)]
  [string]$LogPath,
  [string]$WorkingDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$Headed
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

Write-LaneLog "Core lane started. Deadline: $($endAt.ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss zzz'))"

if ($Headed) {
  $env:AUDIT_HEADED = "1"
  Write-LaneLog "AUDIT_HEADED enabled. Playwright and crawl run in headed mode."
}

if ([DateTimeOffset]::Now -lt $endAt) {
  [void](Invoke-LoggedCommand "npm run seed:e2e")
}

if ([DateTimeOffset]::Now -lt $endAt) {
  if ($Headed) {
    [void](Invoke-LoggedCommand "npm run audit:site:full -- --headed")
  } else {
    [void](Invoke-LoggedCommand "npm run audit:site:full")
  }
}

$cycle = 1
while ([DateTimeOffset]::Now -lt $endAt) {
  Write-LaneLog "Starting canary cycle $cycle"

  if ($Headed) {
    $commands = @(
      "npm run audit:site:quick -- --headed",
      "npx playwright test --project=coverage-public --project=coverage-chef --project=coverage-client --project=coverage-admin --headed",
      "npx playwright test --project=smoke --headed",
      "npx playwright test --project=isolation-tests --headed",
      "npx playwright test --project=cross-portal --headed"
    )
  } else {
    $commands = @(
      "npm run audit:site:quick",
      "npm run test:coverage",
      "npm run test:e2e:smoke",
      "npm run test:isolation",
      "npm run test:e2e:cross-portal"
    )
  }

  foreach ($command in $commands) {
    if ([DateTimeOffset]::Now -ge $endAt) {
      break
    }
    [void](Invoke-LoggedCommand $command)
  }

  $cycle++
}

Write-LaneLog "Core lane complete."
