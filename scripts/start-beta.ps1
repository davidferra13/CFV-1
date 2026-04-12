$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $PSScriptRoot
$port = 3200
$buildMarker = Join-Path $projectDir '.next\BUILD_ID'
$gitHead = $null

try {
    $gitHead = (& git -C $projectDir rev-parse --short HEAD 2>$null).Trim()
} catch {
    $gitHead = $null
}

$buildId = if (Test-Path $buildMarker) { (Get-Content $buildMarker -TotalCount 1).Trim() } else { $null }
$buildIsCurrent = (
    -not [string]::IsNullOrWhiteSpace($buildId) -and
    -not [string]::IsNullOrWhiteSpace($gitHead) -and
    $buildId -eq $gitHead
)
$scriptArgs = if ($buildIsCurrent) { 'scripts/run-next-prod.mjs' } else { 'scripts/run-next-prod.mjs --build' }

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'node'
$psi.Arguments = $scriptArgs
$psi.WorkingDirectory = $projectDir
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$psi.CreateNoWindow = $true
$psi.UseShellExecute = $false
$psi.EnvironmentVariables['PORT'] = "$port"
$psi.EnvironmentVariables['HOST'] = '0.0.0.0'

[System.Diagnostics.Process]::Start($psi) | Out-Null
