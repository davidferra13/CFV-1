[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$userProfilePath = [Environment]::GetFolderPath('UserProfile')
if ([string]::IsNullOrWhiteSpace($userProfilePath)) {
    throw 'Unable to resolve the current user profile.'
}

$beginMarker = '<!-- BEGIN DAVID AUTONOMOUS DELIVERY V1 -->'
$endMarker = '<!-- END DAVID AUTONOMOUS DELIVERY V1 -->'

$policyBlock = @"
$beginMarker
# David's Autonomous Delivery Default

An explicit request to build, fix, implement, proceed, do it, keep building, or ship authorizes the complete software-delivery lifecycle.

- Inspect the real repository, existing instructions, dirty state, branch/upstream, production target, and live revision before editing.
- Implement, test, review, commit, push, deploy website/runtime changes through the established production path, and verify the canonical live surface.
- Never ask David for a second prompt to fire a queue, commit, push, publish, or deploy. Queue systems track and coordinate work; they are not permission gates.
- Commit only task-owned changes and preserve unrelated work. Never guess a repository, domain, branch, or deployment target.
- Documentation-only and inert tooling changes still commit and push but do not require a production restart.
- Continue through recoverable failures. Stop only for missing credentials/MFA, destructive or irreversible data actions, unproven rollback, a new paid service or architecture, external messages or financial actions, unresolved dirty-work overlap, an unknown target, or a release gate that remains broken after bounded repair.
- Finish implementation work only as LIVE (verified production), COMPLETE (verified non-runtime work pushed), or BLOCKED with exact evidence and one next action. Local-only, unpushed, preview-only, and unverified deployments are not done.
$endMarker
"@

function Set-ManagedPolicyBlock {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $directoryPath = [IO.Path]::GetDirectoryName($Path)
    if (-not [string]::IsNullOrWhiteSpace($directoryPath)) {
        [IO.Directory]::CreateDirectory($directoryPath) | Out-Null
    }

    $current = if ([IO.File]::Exists($Path)) {
        [IO.File]::ReadAllText($Path)
    } else {
        ''
    }

    $startIndex = $current.IndexOf($beginMarker, [StringComparison]::Ordinal)
    $endIndex = $current.IndexOf($endMarker, [StringComparison]::Ordinal)

    if (($startIndex -ge 0) -xor ($endIndex -ge 0)) {
        throw "Incomplete managed delivery-policy markers in $Path. No changes were written."
    }

    if ($startIndex -ge 0) {
        if ($endIndex -lt $startIndex) {
            throw "Invalid managed delivery-policy marker order in $Path. No changes were written."
        }

        $suffixStart = $endIndex + $endMarker.Length
        $next = $current.Substring(0, $startIndex) + $policyBlock + $current.Substring($suffixStart)
    } elseif ([string]::IsNullOrWhiteSpace($current)) {
        $next = $policyBlock + [Environment]::NewLine
    } else {
        $next = $current.TrimEnd() + [Environment]::NewLine + [Environment]::NewLine + $policyBlock + [Environment]::NewLine
    }

    if (-not [string]::Equals($current, $next, [StringComparison]::Ordinal)) {
        $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
        [IO.File]::WriteAllText($Path, $next, $utf8WithoutBom)
        return 'updated'
    }

    return 'current'
}

$codexConfigRoot = if (-not [string]::IsNullOrWhiteSpace($env:CODEX_HOME)) {
    $env:CODEX_HOME
} else {
    Join-Path $userProfilePath '.codex'
}
$codexOverridePath = Join-Path $codexConfigRoot 'AGENTS.override.md'
$codexDefaultPath = Join-Path $codexConfigRoot 'AGENTS.md'
$codexTargetPath = if ([IO.File]::Exists($codexOverridePath) -and (Get-Item -LiteralPath $codexOverridePath).Length -gt 0) {
    $codexOverridePath
} else {
    $codexDefaultPath
}

$openCodeConfigRoot = if (-not [string]::IsNullOrWhiteSpace($env:XDG_CONFIG_HOME)) {
    Join-Path $env:XDG_CONFIG_HOME 'opencode'
} else {
    Join-Path $userProfilePath '.config\opencode'
}

$targets = @(
    $codexTargetPath
    (Join-Path $userProfilePath '.claude\CLAUDE.md')
    (Join-Path $openCodeConfigRoot 'AGENTS.md')
    (Join-Path $userProfilePath '.gemini\GEMINI.md')
)

$results = foreach ($targetPath in $targets) {
    $status = Set-ManagedPolicyBlock -Path $targetPath
    [pscustomobject]@{
        Path = $targetPath
        Status = $status
    }
}

$results | Format-Table -AutoSize
