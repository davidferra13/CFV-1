function Assert-PrivateRuntimeTree {
    param([Parameter(Mandatory=$true)][string]$Path)
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $allowed = @($sid, 'S-1-5-18', 'S-1-5-32-544')
    $root = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
    if (!$root.PSIsContainer) { throw 'directory' }
    $pending = New-Object 'System.Collections.Generic.Queue[System.IO.FileSystemInfo]'
    $pending.Enqueue($root)
    while ($pending.Count -gt 0) {
        $item = $pending.Dequeue()
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'runtime_link' }
        $acl = Get-Acl -LiteralPath $item.FullName -ErrorAction Stop
        if ($item.FullName -eq $root.FullName -and !$acl.AreAccessRulesProtected) { throw 'inheritance' }
        $owner = $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value
        if ($owner -notin $allowed) { throw 'owner' }
        foreach ($ace in $acl.Access) {
            $identity = $ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
            if ($ace.AccessControlType -eq 'Allow' -and $identity -notin $allowed) { throw 'acl' }
        }
        if ($item.PSIsContainer) {
            foreach ($child in @(Get-ChildItem -LiteralPath $item.FullName -Force -ErrorAction Stop)) {
                $pending.Enqueue($child)
            }
        }
    }
}
