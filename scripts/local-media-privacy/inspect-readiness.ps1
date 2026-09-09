# Read-only machine preflight. No encryption, ACL, firewall or service changes.
param([string]$ReportPath)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'firewall-policy.ps1')
. (Join-Path $PSScriptRoot 'storage-policy.ps1')
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$administrator = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$result = [ordered]@{
    schema = 1
    read_only = $true
    administrator = $administrator
    volume_encryption = 'unverified'
    runtime_present = $false
    runtime_owner_only = $false
    all_firewall_profiles_enabled = $false
    verified_listener = $false
    executable_blocks = [ordered]@{}
}
$runtime = Join-Path $env:LOCALAPPDATA 'ChefFlowMediaPrivacy'
try {
    $volume = Get-BitLockerVolume -MountPoint 'C:' -ErrorAction Stop
    $result.volume_encryption = if ($volume.ProtectionStatus -eq 'On' -and
        $volume.VolumeStatus -eq 'FullyEncrypted' -and $volume.EncryptionPercentage -eq 100) {
        'verified_on'
    } else { 'not_fully_protected' }
} catch { $result.volume_encryption = 'unverified' }
$result.runtime_present = Test-Path -LiteralPath $runtime -PathType Container
if ($result.runtime_present) {
    try { Assert-PrivateRuntimeTree -Path $runtime; $result.runtime_owner_only = $true } catch {}
}
try {
    $profiles = @(Get-NetFirewallProfile -PolicyStore ActiveStore -ErrorAction Stop)
    $result.all_firewall_profiles_enabled = $profiles.Count -eq 3 -and @($profiles | Where-Object { !$_.Enabled }).Count -eq 0
} catch {}
$programs = [ordered]@{}
# Resolve the interpreter through the same launcher used by start-review.ps1.
try {
    $resolvedPython = & py -3.12 -c 'import sys; print(sys.executable)' 2>$null
    $programs.python = if ($LASTEXITCODE -eq 0 -and $resolvedPython) { [string]$resolvedPython } else { $null }
} catch { $programs.python = $null }
$programs.pythonw = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\pythonw.exe'
foreach ($role in @('ffmpeg','ffprobe','ffplay','node')) {
    try {
        $command = Get-Command ($role + '.exe') -ErrorAction Stop
        $item = Get-Item -LiteralPath $command.Source
        # The Python resolver pins WinGet symlinks to their concrete targets.
        if ($item.Target) { $programs[$role] = [string]@($item.Target)[0] }
        else { $programs[$role] = $item.FullName }
    } catch { $programs[$role] = $null }
}
try {
    $listeners = @(Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction Stop)
    $result.verified_listener = $listeners.Count -eq 1 -and $listeners[0].LocalAddress -eq '127.0.0.1'
    if ($result.verified_listener) { $programs.ollama = (Get-Process -Id $listeners[0].OwningProcess).Path }
} catch {}
foreach ($entry in $programs.GetEnumerator()) {
    $protected = $false
    if ($entry.Value) {
        try {
            $rules = Get-NetFirewallApplicationFilter -PolicyStore ActiveStore -Program $entry.Value -ErrorAction Stop |
                Get-NetFirewallRule
            foreach ($rule in $rules) {
                $filters = @{
                    Rule = $rule
                    Application = ($rule | Get-NetFirewallApplicationFilter)
                    Address = ($rule | Get-NetFirewallAddressFilter)
                    Port = ($rule | Get-NetFirewallPortFilter)
                    Interface = ($rule | Get-NetFirewallInterfaceFilter)
                    InterfaceType = ($rule | Get-NetFirewallInterfaceTypeFilter)
                    Service = ($rule | Get-NetFirewallServiceFilter)
                    Security = ($rule | Get-NetFirewallSecurityFilter)
                }
                if (Test-UnrestrictedProgramBlock @filters) { $protected = $true }
            }
        } catch {}
    }
    $result.executable_blocks[$entry.Key] = $protected
}
$json = $result | ConvertTo-Json -Depth 4 -Compress
Write-Output $json
if ($ReportPath) {
    $target = [IO.Path]::GetFullPath($ReportPath)
    $expectedParent = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'Temp'))
    if ([IO.Path]::GetDirectoryName($target) -ne $expectedParent -or
        [IO.Path]::GetFileName($target) -notmatch '^cf-privacy-readiness-[a-f0-9]{32}\.json$') { throw 'Invalid report destination' }
    # A unique new report only. Never overwrite any existing file or link.
    $stream = [IO.File]::Open($target, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($json)
        $stream.Write($bytes, 0, $bytes.Length)
    } finally { $stream.Dispose() }
}
