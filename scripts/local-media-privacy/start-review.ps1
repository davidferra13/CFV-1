param([switch]$Demo)
$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'review.py'
if ($Demo) {
    py -3.12 $script --demo
} else {
    py -3.12 $script
}
