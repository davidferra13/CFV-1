param(
  [string]$TaskName = "AnythingLLM Ensure NordVPN LAN Access"
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "Ensure-NordVpnLocalLanAccess.ps1"
if (-not (Test-Path $scriptPath)) {
  throw "Missing script: $scriptPath"
}

$quotedScriptPath = '"' + $scriptPath + '"'
$powershellExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$taskCommand = '"' + $powershellExe + '"' + " -Sta -NoProfile -ExecutionPolicy Bypass -File $quotedScriptPath"
$currentUser = "$env:USERDOMAIN\$env:USERNAME"

schtasks /Create /F /TN $TaskName /SC ONLOGON /IT /RU $currentUser /TR $taskCommand | Out-Null

Write-Output "Registered task: $TaskName"
