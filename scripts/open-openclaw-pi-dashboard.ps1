param(
    [string]$HostAlias = 'pi',
    [int]$LocalPort = 18789,
    [int]$RemotePort = 18789
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$forwardSpec = "$LocalPort`:127.0.0.1:$RemotePort"
$existingTunnel = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -eq 'ssh.exe' -and
        $_.CommandLine -match [regex]::Escape("-L $forwardSpec") -and
        $_.CommandLine -match [regex]::Escape($HostAlias)
    } |
    Select-Object -First 1

if (-not $existingTunnel) {
    Start-Process -FilePath 'ssh' -ArgumentList @('-o', 'ExitOnForwardFailure=yes', '-N', '-L', $forwardSpec, $HostAlias) -WindowStyle Hidden
}

for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 250
    if (Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue) {
        break
    }
}

Start-Process "http://127.0.0.1:$LocalPort"
Write-Host "Pi-hosted OpenClaw dashboard available at http://127.0.0.1:$LocalPort"
