param(
  [Parameter(Mandatory = $true)]
  [string]$HostName,

  [string]$User = "chefflow",
  [string]$AppRoot = "/srv/chefflow",
  [string]$ServiceName = "chefflow-prod",
  [string]$ReleaseId = ""
)

$ErrorActionPreference = "Stop"

function Escape-RemoteArg {
  param([string]$Value)
  return "'" + ($Value -replace "'", "'\''") + "'"
}

$target = "$User@$HostName"
$scriptPath = "$AppRoot/shared/scripts/rollback-release.sh"
$releaseArg = if ($ReleaseId) { " $(Escape-RemoteArg $ReleaseId)" } else { "" }
$command = "sudo env APP_ROOT=$(Escape-RemoteArg $AppRoot) SERVICE_NAME=$(Escape-RemoteArg $ServiceName) $(Escape-RemoteArg $scriptPath)$releaseArg"

Write-Host "Triggering ChefFlow rollback on $target"
& ssh $target $command
if ($LASTEXITCODE -ne 0) {
  throw "Rollback failed. Inspect systemd and release logs on the production host."
}

Write-Host "Rollback completed."
