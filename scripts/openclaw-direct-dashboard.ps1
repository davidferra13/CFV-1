param(
  [string]$PiHost = "",
  [int]$LocalGatewayPort = 18789,
  [int]$LocalBrowserPort = 18791,
  [switch]$PrintOnly
)

$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSVersion.Major -ge 7) {
  $PSNativeCommandUseErrorActionPreference = $false
}

if (-not $PiHost) {
  $PiHost = if ($env:OPENCLAW_PI_HOST) { $env:OPENCLAW_PI_HOST } else { 'pi' }
}

function Test-LocalGateway {
  param([string]$Url)

  try {
    Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3 | Out-Null
    return $true
  } catch {
    if ($_.Exception.Response) {
      return $true
    }

    return $false
  }
}

function Invoke-OpenClawSsh {
  param(
    [string]$HostName,
    [string]$RemoteCommand
  )

  $guid = [guid]::NewGuid().ToString('N')
  $stdout = Join-Path $env:TEMP "openclaw-dashboard-ssh-$guid.out.log"
  $stderr = Join-Path $env:TEMP "openclaw-dashboard-ssh-$guid.err.log"

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

function Get-RemoteDashboardUrl {
  param([string]$HostName)

  Invoke-OpenClawSsh -HostName $HostName -RemoteCommand "systemctl --user start openclaw-gateway" | Out-Null

  $output = Invoke-OpenClawSsh -HostName $HostName -RemoteCommand "openclaw dashboard --no-open"
  $urlLine = $output | Select-String "Dashboard URL:"
  if (-not $urlLine) {
    throw "Failed to read the dashboard URL from '$HostName'. openclaw dashboard --no-open did not report a Dashboard URL."
  }

  return ($urlLine.ToString() -replace "^.*Dashboard URL:\s*", "").Trim()
}

function Get-TunnelProcesses {
  param(
    [int]$GatewayPort,
    [int]$BrowserPort
  )

  Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'ssh.exe' -and
      $_.CommandLine -match [regex]::Escape("${GatewayPort}:127.0.0.1:18789") -and
      $_.CommandLine -match [regex]::Escape("${BrowserPort}:127.0.0.1:18791")
  }
}

function Ensure-LocalTunnel {
  param(
    [string]$HostName,
    [int]$GatewayPort,
    [int]$BrowserPort
  )

  $probeUrl = "http://127.0.0.1:$GatewayPort/"
  if (Test-LocalGateway -Url $probeUrl) {
    return
  }

  $existing = @(Get-TunnelProcesses -GatewayPort $GatewayPort -BrowserPort $BrowserPort)
  if ($existing.Count -gt 0) {
    $existing | ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 350
  }

  $guid = [guid]::NewGuid().ToString('N')
  $stdout = Join-Path $env:TEMP "openclaw-dashboard-tunnel-$guid.out.log"
  $stderr = Join-Path $env:TEMP "openclaw-dashboard-tunnel-$guid.err.log"

  $proc = Start-Process `
    -FilePath "C:\Windows\System32\OpenSSH\ssh.exe" `
    -ArgumentList @(
      "-o", "BatchMode=yes",
      "-o", "ConnectTimeout=8",
      "-o", "ServerAliveInterval=15",
      "-o", "ServerAliveCountMax=3",
      "-o", "ExitOnForwardFailure=yes",
      "-N",
      "-L", "${GatewayPort}:127.0.0.1:18789",
      "-L", "${BrowserPort}:127.0.0.1:18791",
      $HostName
    ) `
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
    throw "The OpenClaw SSH tunnel to '$HostName' never became healthy on $probeUrl. SSH error: $sshError"
  }

  throw "The OpenClaw SSH tunnel to '$HostName' never became healthy on $probeUrl. The Pi may be reachable by ping but not serving SSH or gateway traffic."
}

$remoteDashboardUrl = Get-RemoteDashboardUrl -HostName $PiHost
Ensure-LocalTunnel -HostName $PiHost -GatewayPort $LocalGatewayPort -BrowserPort $LocalBrowserPort

$localDashboardUrl = $remoteDashboardUrl -replace "http://127\.0\.0\.1:18789", "http://127.0.0.1:$LocalGatewayPort"

if ($PrintOnly) {
  Write-Output $localDashboardUrl
  exit 0
}

Start-Process $localDashboardUrl
