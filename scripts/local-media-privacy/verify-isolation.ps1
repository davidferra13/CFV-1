$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'firewall-policy.ps1')
. (Join-Path $PSScriptRoot 'storage-policy.ps1')
try {
    $folder = Get-Item -LiteralPath $env:CF_PRIVACY_DIRECTORY
    if (!$folder.PSIsContainer -or ($folder.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'directory' }
    Assert-PrivateRuntimeTree -Path $folder.FullName
    $volume = Get-BitLockerVolume -MountPoint $folder.PSDrive.Root
    if ($volume.ProtectionStatus -ne 'On' -or $volume.VolumeStatus -ne 'FullyEncrypted' -or $volume.EncryptionPercentage -ne 100) { throw 'encryption' }
    if (@(Get-NetFirewallProfile -PolicyStore ActiveStore | Where-Object { !$_.Enabled }).Count -gt 0) { throw 'firewall_disabled' }
    $listener = @(Get-NetTCPConnection -LocalPort 11434 -State Listen)
    if ($listener.Count -ne 1 -or $listener[0].LocalAddress -ne '127.0.0.1') { throw 'listener' }
    $ollama = (Get-Process -Id $listener[0].OwningProcess).Path
    if (!$ollama) { throw 'process' }
    $programs = @($env:CF_PRIVACY_PYTHON, $ollama, $env:CF_PRIVACY_FFMPEG, $env:CF_PRIVACY_FFPROBE, $env:CF_PRIVACY_FFPLAY)
    if (@($programs | Where-Object { !$_ }).Count -gt 0) { throw 'decoder_program_missing' }
    if ($env:CF_PRIVACY_CONSUMER) { $programs += $env:CF_PRIVACY_CONSUMER }
    $required = @('0.0.0.0-126.255.255.255', '128.0.0.0-255.255.255.255', '::/0')
    foreach ($program in $programs) {
        $protected = $false
        $rules = Get-NetFirewallApplicationFilter -PolicyStore ActiveStore -Program $program | Get-NetFirewallRule |
            Where-Object { $_.Enabled -eq 'True' -and $_.Direction -eq 'Outbound' -and $_.Action -eq 'Block' -and $_.Profile -eq 'Any' }
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
        if (!$protected) { throw 'egress_unverified' }
    }
    @{ isolated = $true; encrypted = $true; owner_only = $true } | ConvertTo-Json -Compress
} catch {
    Write-Output '{"isolated":false,"encrypted":false,"owner_only":false}'
    exit 2
}
