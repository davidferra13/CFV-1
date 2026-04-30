param(
  [Parameter(Mandatory = $true)]
  [string]$HostName,

  [string]$User = "chefflow",
  [string]$PackagePath = "",
  [string]$Commit = "HEAD",
  [string]$AppRoot = "/srv/chefflow",
  [string]$ServiceName = "chefflow-prod",
  [switch]$IncludeDirty
)

$ErrorActionPreference = "Stop"

function Escape-RemoteArg {
  param([string]$Value)
  return "'" + ($Value -replace "'", "'\''") + "'"
}

$repoRoot = (& git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0) {
  throw "Must run from inside the ChefFlow git repository."
}
Set-Location $repoRoot

if (-not $PackagePath) {
  $packageArgs = @("-ExecutionPolicy", "Bypass", "-File", "scripts\package-release.ps1", "-Commit", $Commit)
  if ($IncludeDirty) {
    $packageArgs += "-IncludeDirty"
  }
  & powershell @packageArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Release packaging failed."
  }
  $latest = Get-ChildItem -Path "dist\self-hosted-releases" -Filter "*.tar.gz" |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
  if (-not $latest) {
    throw "No release archive was produced."
  }
  $PackagePath = $latest.FullName
}

$resolvedPackage = (Resolve-Path $PackagePath).Path
$target = "$User@$HostName"
$remoteInbox = "/tmp/chefflow-releases"
$remoteScripts = "/tmp/chefflow-server-scripts"
$remotePackage = "$remoteInbox/$([System.IO.Path]::GetFileName($resolvedPackage))"

Write-Host "Deploying ChefFlow release"
Write-Host "Target  : $target"
Write-Host "Package : $resolvedPackage"

& ssh $target "mkdir -p $(Escape-RemoteArg $remoteInbox) $(Escape-RemoteArg $remoteScripts)"
if ($LASTEXITCODE -ne 0) {
  throw "Unable to prepare remote inbox."
}

& scp $resolvedPackage "${target}:$remotePackage"
if ($LASTEXITCODE -ne 0) {
  throw "Package transfer failed."
}

& scp "scripts/server/install-release.sh" "scripts/server/activate-release.sh" "scripts/server/rollback-release.sh" "${target}:$remoteScripts/"
if ($LASTEXITCODE -ne 0) {
  throw "Server script transfer failed."
}

$installScripts = "sudo mkdir -p $(Escape-RemoteArg "$AppRoot/shared/scripts") && sudo install -m 0755 $remoteScripts/*.sh $(Escape-RemoteArg "$AppRoot/shared/scripts/")"
& ssh $target $installScripts
if ($LASTEXITCODE -ne 0) {
  throw "Unable to install server scripts."
}

$installCommand = "sudo env APP_ROOT=$(Escape-RemoteArg $AppRoot) SERVICE_NAME=$(Escape-RemoteArg $ServiceName) $(Escape-RemoteArg "$AppRoot/shared/scripts/install-release.sh") $(Escape-RemoteArg $remotePackage)"
& ssh $target $installCommand
if ($LASTEXITCODE -ne 0) {
  throw "Remote release install failed. Current production release was not changed."
}

$activateCommand = "sudo env APP_ROOT=$(Escape-RemoteArg $AppRoot) SERVICE_NAME=$(Escape-RemoteArg $ServiceName) $(Escape-RemoteArg "$AppRoot/shared/scripts/activate-release.sh")"
& ssh $target $activateCommand
if ($LASTEXITCODE -ne 0) {
  throw "Remote activation failed. Check host logs and rollback state."
}

Write-Host "Self-hosted deployment completed."
