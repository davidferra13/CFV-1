param(
    [int]$Port = 3300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Push-Location $RepoRoot
try {
    npx next dev -p $Port -H 0.0.0.0
}
finally {
    Pop-Location
}
