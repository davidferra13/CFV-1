$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../../scripts/local-media-privacy/storage-policy.ps1')
$fixture = Join-Path $env:TEMP ('cf-privacy-acl-fixture-' + [guid]::NewGuid())
try {
    New-Item -ItemType Directory -Path $fixture | Out-Null
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = New-Object Security.AccessControl.DirectorySecurity
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true, $false)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
    Set-Acl -LiteralPath $fixture -AclObject $acl
    $child = Join-Path $fixture 'archive'
    New-Item -ItemType Directory -Path $child | Out-Null
    $file = Join-Path $child 'synthetic.txt'
    Set-Content -LiteralPath $file -Value 'Harmless generated ACL test'
    Assert-PrivateRuntimeTree -Path $fixture
    $childAcl = Get-Acl -LiteralPath $file
    $everyone = New-Object Security.Principal.SecurityIdentifier('S-1-1-0')
    $public = New-Object Security.AccessControl.FileSystemAccessRule($everyone, 'Read', 'Allow')
    $childAcl.AddAccessRule($public)
    Set-Acl -LiteralPath $file -AclObject $childAcl
    $blocked = $false
    try { Assert-PrivateRuntimeTree -Path $fixture } catch { $blocked = $true }
    if (!$blocked) { throw 'Public descendant was accepted' }
    Write-Output 'Storage policy fixtures: 2 passed; only disposable fixture ACLs were changed.'
} finally {
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}
