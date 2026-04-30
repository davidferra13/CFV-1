param(
  [int]$IntervalSeconds = 300,
  [switch]$CommitRecords
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$logDir = Join-Path $root 'system\v1-builder\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdout = Join-Path $logDir "runner-$stamp.out.log"
$stderr = Join-Path $logDir "runner-$stamp.err.log"

$runnerArgs = @(
  'run',
  'v1-builder:runner',
  '--',
  '--',
  '--interval',
  "$IntervalSeconds"
)

if ($CommitRecords) {
  $runnerArgs += '--commitRecords'
}

$process = Start-Process `
  -FilePath 'npm.cmd' `
  -ArgumentList $runnerArgs `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

Write-Output "Started V1 builder runner PID $($process.Id)"
Write-Output "stdout: $stdout"
Write-Output "stderr: $stderr"
