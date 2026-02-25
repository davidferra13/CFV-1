[CmdletBinding()]
param(
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"

function Finish-WithPause {
  param([string]$Message)
  Write-Host $Message
  if (-not $NoPause) {
    Read-Host "Press Enter to close"
  }
}

try {
  $projectRoot = Split-Path -Parent $PSScriptRoot
  $credsPath = Join-Path $projectRoot ".auth\pi.json"

  if (-not (Test-Path $credsPath)) {
    throw "Missing Pi credentials file: $credsPath"
  }

  $creds = Get-Content -Path $credsPath -Raw | ConvertFrom-Json
  $piHost = [string]$creds.host
  $piUser = [string]$creds.username
  $piPassword = [string]$creds.password

  if ([string]::IsNullOrWhiteSpace($piHost) -or [string]::IsNullOrWhiteSpace($piUser)) {
    throw "pi.json must include non-empty host and username."
  }

  $sshCmd = Get-Command ssh -ErrorAction SilentlyContinue
  if (-not $sshCmd) {
    throw "OpenSSH client not found. Install OpenSSH Client in Windows Features."
  }

  $sshExe = $sshCmd.Source
  $sshArgs = @(
    "-o", "ConnectTimeout=15",
    "-o", "StrictHostKeyChecking=no",
    "-o", "BatchMode=yes",
    "$piUser@$piHost"
  )

  $probeOutput = & $sshExe @sshArgs "echo pi-connected" 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "SSH key auth failed for $piUser@$piHost. Output: $probeOutput"
  }

  $escapedPassword = $piPassword -replace "'", "'""'""'"
  $remoteScript = @'
set -e
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then . "$NVM_DIR/nvm.sh"; fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart chefflow-dev >/dev/null 2>&1 || true
  pm2 restart chefflow-beta >/dev/null 2>&1 || true
  pm2 save >/dev/null 2>&1 || true
fi

if command -v sudo >/dev/null 2>&1; then
  if [ -n '__PI_PASSWORD__' ]; then
    printf '%s\n' '__PI_PASSWORD__' | sudo -S -p '' systemctl restart chefflow-dev >/dev/null 2>&1 || true
    printf '%s\n' '__PI_PASSWORD__' | sudo -S -p '' systemctl restart chefflow-beta >/dev/null 2>&1 || true
    printf '%s\n' '__PI_PASSWORD__' | sudo -S -p '' systemctl restart cloudflared >/dev/null 2>&1 || true
    printf '%s\n' '__PI_PASSWORD__' | sudo -S -p '' systemctl restart ollama >/dev/null 2>&1 || true
  else
    sudo systemctl restart chefflow-dev >/dev/null 2>&1 || true
    sudo systemctl restart chefflow-beta >/dev/null 2>&1 || true
    sudo systemctl restart cloudflared >/dev/null 2>&1 || true
    sudo systemctl restart ollama >/dev/null 2>&1 || true
  fi
fi

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3100 || true)
[ -z "$HTTP_CODE" ] && HTTP_CODE=000
echo "__CHEFFLOW_PI_RESTART_DONE__ HTTP=$HTTP_CODE"
'@
  $remoteScript = $remoteScript.Replace("__PI_PASSWORD__", $escapedPassword)

  $remoteScriptB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($remoteScript))
  $remoteCommand = "echo $remoteScriptB64 | base64 -d | bash"
  $output = & $sshExe @sshArgs $remoteCommand 2>&1
  $exitCode = $LASTEXITCODE

  Write-Host ""
  Write-Host "ChefFlow Pi restart output:"
  $output | ForEach-Object { Write-Host $_ }

  if ($exitCode -ne 0) {
    throw "Remote restart command failed with exit code $exitCode."
  }

  Finish-WithPause "Restart command completed."
  exit 0
}
catch {
  Write-Host ""
  Write-Host "Restart failed: $($_.Exception.Message)" -ForegroundColor Red
  if (-not $NoPause) {
    Read-Host "Press Enter to close"
  }
  exit 1
}
