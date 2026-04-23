param(
  [Parameter(Mandatory = $true)]
  [string]$EndAtIso,
  [Parameter(Mandatory = $true)]
  [string]$RunDir,
  [string]$WorkingDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$Headed = "1"
)

$ErrorActionPreference = "Continue"

$endAt = [DateTimeOffset]::Parse($EndAtIso)
$runDirResolved = if ([System.IO.Path]::IsPathRooted($RunDir)) { $RunDir } else { (Resolve-Path (Join-Path $WorkingDir $RunDir)).Path }
$logsDir = Join-Path $runDirResolved "logs"
$logPath = Join-Path $logsDir "queue.log"
New-Item -ItemType Directory -Force -Path $runDirResolved | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$headedNormalized = $Headed.Trim().ToLowerInvariant()
$isHeaded = @("1", "true", "yes", "y", "on").Contains($headedNormalized)
$pwFlag = if ($isHeaded) { " --headed" } else { "" }

$summary = [ordered]@{
  startedAt = (Get-Date).ToString("o")
  endsAt = $endAt.ToString("o")
  headed = $isHeaded
  executed = @()
  skipped = @()
}

function Write-QueueLog {
  param(
    [string]$Message,
    [string]$Level = "INFO"
  )
  $stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $line = "[$stamp] [$Level] $Message"
  $line | Tee-Object -FilePath $logPath -Append
}

function Minutes-Remaining {
  $remaining = ($endAt - [DateTimeOffset]::Now).TotalMinutes
  return [math]::Round($remaining, 1)
}

function Invoke-QueueCommand {
  param(
    [string]$Name,
    [string]$CommandText
  )

  Write-QueueLog "RUN [$Name] $CommandText"
  $start = [DateTimeOffset]::Now

  Push-Location $WorkingDir
  try {
    cmd.exe /c $CommandText 2>&1 | Tee-Object -FilePath $logPath -Append
    $exitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }

  $durationSec = [math]::Round(([DateTimeOffset]::Now - $start).TotalSeconds, 1)
  if ($exitCode -eq 0) {
    Write-QueueLog "EXIT $exitCode [$Name] (${durationSec}s)" "PASS"
  } else {
    Write-QueueLog "EXIT $exitCode [$Name] (${durationSec}s)" "FAIL"
  }

  $summary.executed += [ordered]@{
    name = $Name
    command = $CommandText
    exitCode = $exitCode
    durationSec = $durationSec
    startedAt = $start.ToString("o")
    finishedAt = (Get-Date).ToString("o")
  }
}

Write-QueueLog "Follow-up queue started. Deadline: $($endAt.ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss zzz'))"
Write-QueueLog "Mode: $($(if ($isHeaded) { 'headed' } else { 'headless' }))"

$primaryQueue = @(
  [pscustomobject]@{
    Name = "release-verify"
    MinRemainingMin = 120
    Command = "npm run verify:release"
  },
  [pscustomobject]@{
    Name = "launch-readiness"
    MinRemainingMin = 240
    Command = "npx playwright test --project=launch-chef --project=launch-client --project=launch-public --project=launch-mobile$pwFlag"
  },
  [pscustomobject]@{
    Name = "journey-chef"
    MinRemainingMin = 240
    Command = "npx playwright test --config=playwright.journey.config.ts --project=journey-chef$pwFlag"
  },
  [pscustomobject]@{
    Name = "coverage-full"
    MinRemainingMin = 180
    Command = "npx playwright test --project=coverage-public --project=coverage-chef --project=coverage-client --project=coverage-admin --project=coverage-staff --project=coverage-partner --project=coverage-auth-boundaries --project=coverage-api$pwFlag"
  },
  [pscustomobject]@{
    Name = "interactions-core"
    MinRemainingMin = 240
    Command = "npx playwright test --project=interactions-chef --project=interactions-client --project=interactions-public$pwFlag"
  },
  [pscustomobject]@{
    Name = "interactions-admin"
    MinRemainingMin = 60
    Command = "npx playwright test --project=interactions-admin$pwFlag"
  },
  [pscustomobject]@{
    Name = "remy-full"
    MinRemainingMin = 240
    Command = "npm run test:remy-quality:all"
  },
  [pscustomobject]@{
    Name = "remy-client-full"
    MinRemainingMin = 180
    Command = "npm run test:remy-quality:client:all"
  },
  [pscustomobject]@{
    Name = "goldmine-audit"
    MinRemainingMin = 75
    Command = "npm run audit:goldmine"
  },
  [pscustomobject]@{
    Name = "db-audit"
    MinRemainingMin = 30
    Command = "npm run audit:db"
  }
)

foreach ($item in $primaryQueue) {
  if ([DateTimeOffset]::Now -ge $endAt) {
    break
  }

  $remainingMin = Minutes-Remaining
  if ($remainingMin -lt $item.MinRemainingMin) {
    Write-QueueLog "SKIP [$($item.Name)] needs >= $($item.MinRemainingMin)m, remaining ${remainingMin}m" "WARN"
    $summary.skipped += [ordered]@{
      name = $item.Name
      reason = "insufficient_time"
      requiredMin = $item.MinRemainingMin
      remainingMin = $remainingMin
      command = $item.Command
    }
    continue
  }

  Invoke-QueueCommand -Name $item.Name -CommandText $item.Command
}

$fallbackQueue = @(
  [pscustomobject]@{
    Name = "smoke"
    Command = "npx playwright test --project=smoke$pwFlag"
  },
  [pscustomobject]@{
    Name = "isolation"
    Command = "npx playwright test --project=isolation-tests$pwFlag"
  },
  [pscustomobject]@{
    Name = "critical-units"
    Command = "npm run test:critical"
  },
  [pscustomobject]@{
    Name = "financial-units"
    Command = "npm run test:unit:financial"
  },
  [pscustomobject]@{
    Name = "db-audit"
    Command = "npm run audit:db"
  }
)

$cycle = 1
while ([DateTimeOffset]::Now -lt $endAt) {
  Write-QueueLog "Fallback cycle $cycle started (remaining $(Minutes-Remaining)m)"
  foreach ($item in $fallbackQueue) {
    if ([DateTimeOffset]::Now -ge $endAt) {
      break
    }
    Invoke-QueueCommand -Name "fallback-$($item.Name)" -CommandText $item.Command
  }
  $cycle++
}

$summary.finishedAt = (Get-Date).ToString("o")
$summaryPath = Join-Path $runDirResolved "queue-summary.json"
$summary | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $summaryPath

$mdLines = @()
$mdLines += "# Follow-up Queue Summary"
$mdLines += ""
$mdLines += "- Started: $($summary.startedAt)"
$mdLines += "- Finished: $($summary.finishedAt)"
$mdLines += "- Deadline: $($summary.endsAt)"
$mdLines += "- Headed: $($summary.headed)"
$mdLines += "- Executed commands: $($summary.executed.Count)"
$mdLines += "- Skipped queue items: $($summary.skipped.Count)"
$mdLines += ""
$mdLines += "## Executed"
$mdLines += ""
foreach ($entry in $summary.executed) {
  $mdLines += "- [$($entry.exitCode)] $($entry.name) ($($entry.durationSec)s)"
}
$mdLines += ""
if ($summary.skipped.Count -gt 0) {
  $mdLines += "## Skipped"
  $mdLines += ""
  foreach ($entry in $summary.skipped) {
    $mdLines += "- $($entry.name): needed $($entry.requiredMin)m, had $($entry.remainingMin)m"
  }
  $mdLines += ""
}
$mdPath = Join-Path $runDirResolved "QUEUE-SUMMARY.md"
$mdLines | Set-Content -Encoding UTF8 $mdPath

Write-QueueLog "Follow-up queue complete."
Write-QueueLog "Summary JSON: $summaryPath"
Write-QueueLog "Summary MD: $mdPath"
