$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$statePath = Join-Path $root 'system\v1-builder\runner-state.json'

if (!(Test-Path $statePath)) {
  Write-Output 'No runner-state.json found.'
  exit 0
}

$state = Get-Content $statePath -Raw | ConvertFrom-Json
if (!$state.pid) {
  Write-Output 'No runner PID recorded.'
  exit 0
}

$process = Get-Process -Id $state.pid -ErrorAction SilentlyContinue
if (!$process) {
  Write-Output "Runner PID $($state.pid) is not running."
  exit 0
}

if ($process.ProcessName -notin @('node', 'npm', 'cmd')) {
  throw "Refusing to stop PID $($state.pid) because it is $($process.ProcessName), not a runner process."
}

Stop-Process -Id $state.pid
Write-Output "Stopped V1 builder runner PID $($state.pid)."
