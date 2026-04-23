param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Message,

  [string]$AgentId = 'main',

  [string]$SessionKey = '',

  [string]$PiHost = '',

  [string]$GatewayToken = '',

  [int]$AgentTimeoutSec = 600,

  [int]$RpcTimeoutMs = 700000
)

$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -ge 7) {
  $PSNativeCommandUseErrorActionPreference = $false
}

if (-not $PiHost) {
  $PiHost = if ($env:OPENCLAW_PI_HOST) { $env:OPENCLAW_PI_HOST } else { 'pi' }
}

if (-not $GatewayToken) {
  $GatewayToken = $env:GW_TOKEN
}

function Invoke-OpenClawSsh {
  param(
    [string]$HostName,
    [string]$RemoteCommand
  )

  $guid = [guid]::NewGuid().ToString('N')
  $stdout = Join-Path $env:TEMP "openclaw-ssh-$guid.out.log"
  $stderr = Join-Path $env:TEMP "openclaw-ssh-$guid.err.log"

  $proc = Start-Process `
    -FilePath 'C:\Windows\System32\OpenSSH\ssh.exe' `
    -ArgumentList @(
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=8',
      $HostName,
      $RemoteCommand
    ) `
    -NoNewWindow `
    -Wait `
    -PassThru `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr

  $outputLines = if (Test-Path $stdout) { @(Get-Content $stdout) } else { @() }
  $outputText = if ($outputLines.Count -gt 0) { ($outputLines -join "`n").Trim() } else { '' }
  $errorText = ''
  if (Test-Path $stderr) {
    $stderrRaw = Get-Content $stderr -Raw
    if ($null -ne $stderrRaw) {
      $errorText = $stderrRaw.Trim()
    }
  }

  Remove-Item $stdout, $stderr -ErrorAction SilentlyContinue

  if ($proc.ExitCode -ne 0) {
    $detailParts = @($errorText, $outputText) | Where-Object { $_ }
    if ($detailParts.Count -gt 0) {
      throw "SSH to '$HostName' failed: $($detailParts -join "`n")"
    }

    throw "SSH to '$HostName' failed with exit code $($proc.ExitCode)."
  }

  return $outputLines
}

function Test-LocalGateway {
  param(
    [string]$Url = 'http://127.0.0.1:18789/',
    [int]$TimeoutSec = 3
  )

  try {
    Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec | Out-Null
    return $true
  } catch {
    if ($_.Exception.Response) {
      return $true
    }

    return $false
  }
}

function Get-TunnelProcesses {
  Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'ssh.exe' -and
      $_.CommandLine -match [regex]::Escape('18789:127.0.0.1:18789') -and
      $_.CommandLine -match [regex]::Escape('18791:127.0.0.1:18791')
  }
}

function Ensure-Tunnel {
  $probeUrl = 'http://127.0.0.1:18789/'
  if (Test-LocalGateway -Url $probeUrl) {
    return
  }

  $existing = @(Get-TunnelProcesses)
  if ($existing.Count -gt 0) {
    $existing | ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 350
  }

  $args = @(
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=8',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'ExitOnForwardFailure=yes',
    '-N',
    '-L', '18789:127.0.0.1:18789',
    '-L', '18791:127.0.0.1:18791',
    $PiHost
  )

  $guid = [guid]::NewGuid().ToString('N')
  $stdout = Join-Path $env:TEMP "openclaw-tunnel-$guid.out.log"
  $stderr = Join-Path $env:TEMP "openclaw-tunnel-$guid.err.log"

  $proc = Start-Process `
    -FilePath 'C:\Windows\System32\OpenSSH\ssh.exe' `
    -ArgumentList $args `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr

  $deadline = (Get-Date).AddSeconds(12)
  while ((Get-Date) -lt $deadline) {
    if (Test-LocalGateway -Url $probeUrl) {
      Remove-Item $stdout, $stderr -ErrorAction SilentlyContinue
      return
    }

    if ($proc.HasExited) {
      break
    }

    Start-Sleep -Milliseconds 500
  }

  if (-not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  }

  $sshError = ''
  if (Test-Path $stderr) {
    $stderrRaw = Get-Content $stderr -Raw
    if ($null -ne $stderrRaw) {
      $sshError = $stderrRaw.Trim()
    }
  }

  Remove-Item $stdout, $stderr -ErrorAction SilentlyContinue

  if ($sshError) {
    throw "The OpenClaw SSH tunnel to '$PiHost' never became healthy at $probeUrl. SSH error: $sshError"
  }

  throw "The OpenClaw SSH tunnel to '$PiHost' never became healthy at $probeUrl. The Pi may be reachable by ping but not serving SSH or gateway traffic."
}

function Get-GatewayToken {
  if ($GatewayToken) {
    return $GatewayToken
  }

  $raw = Invoke-OpenClawSsh -HostName $PiHost -RemoteCommand @'
python3 - <<'PY'
import json, pathlib
p = pathlib.Path('~/.openclaw/openclaw.json').expanduser()
obj = json.loads(p.read_text())
print(obj['gateway']['auth']['token'])
PY
'@

  return ($raw | Select-Object -Last 1).Trim()
}

function Get-ParamsJson {
  param(
    [string]$Prompt,
    [string]$Agent,
    [string]$Session,
    [int]$TimeoutSec
  )

  $payload = [ordered]@{
    message = $Prompt
    agentId = $Agent
    sessionKey = $Session
    thinking = 'off'
    deliver = $false
    idempotencyKey = "talk-openclaw-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
    timeout = $TimeoutSec
  }

  return $payload | ConvertTo-Json -Compress
}

Ensure-Tunnel

if (-not $AgentId) {
  $AgentId = 'main'
}

if (-not $SessionKey) {
  $SessionKey = "agent:${AgentId}:direct"
}

if (-not (Test-LocalGateway -TimeoutSec 8)) {
  throw "Gateway probe failed at http://127.0.0.1:18789/ after tunnel setup."
}

$token = Get-GatewayToken
if (-not $token) {
  throw 'Gateway token lookup failed'
}

$paramsJson = Get-ParamsJson -Prompt $Message -Agent $AgentId -Session $SessionKey -TimeoutSec $AgentTimeoutSec
$paramsFile = Join-Path $env:TEMP "openclaw-params-$([guid]::NewGuid().ToString('N')).json"
Set-Content -Path $paramsFile -Value $paramsJson -NoNewline

$stdout = Join-Path $PWD '.talk-openclaw.out'
$stderr = Join-Path $PWD '.talk-openclaw.err'
Remove-Item $stdout, $stderr -ErrorAction SilentlyContinue

$previousGatewayToken = $null
if (Test-Path Env:GW_TOKEN) {
  $previousGatewayToken = $env:GW_TOKEN
}

$env:GW_TOKEN = $token

try {
  $proc = Start-Process `
    -FilePath 'C:\Program Files\nodejs\node.exe' `
    -ArgumentList @(
      (Join-Path $PWD 'openclaw_gateway_call.mjs'),
      'agent',
      "@$paramsFile",
      "$RpcTimeoutMs"
    ) `
    -WorkingDirectory $PWD `
    -NoNewWindow `
    -Wait `
    -PassThru `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr
} finally {
  if ($null -eq $previousGatewayToken) {
    Remove-Item Env:GW_TOKEN -ErrorAction SilentlyContinue
  } else {
    $env:GW_TOKEN = $previousGatewayToken
  }

  Remove-Item $paramsFile -ErrorAction SilentlyContinue
}

if ($proc.ExitCode -ne 0) {
  $errorText = ''
  if (Test-Path $stderr) {
    $stderrRaw = Get-Content $stderr -Raw
    if ($null -ne $stderrRaw) {
      $errorText = $stderrRaw.Trim()
    }
  }

  if ($errorText) {
    throw "Gateway call failed with exit code $($proc.ExitCode): $errorText"
  }

  throw "Gateway call failed with exit code $($proc.ExitCode)"
}

$result = Get-Content $stdout -Raw | ConvertFrom-Json
$text = $result.result.payloads | Where-Object { $_.text } | Select-Object -First 1 -ExpandProperty text
if (-not $text) {
  throw 'No assistant text returned'
}

$text
