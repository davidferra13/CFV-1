param(
  [switch]$AutoLoginLinear
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-McpListText {
  try {
    return (codex mcp list) -join "`n"
  } catch {
    Write-Error "Failed to run 'codex mcp list'. Ensure Codex CLI is installed and on PATH."
    throw
  }
}

function Has-Pattern {
  param(
    [string]$Text,
    [string]$Pattern
  )
  return [regex]::IsMatch($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
}

$listText = Get-McpListText
Write-Host $listText
Write-Host ""

$issues = New-Object System.Collections.Generic.List[string]

if (-not (Has-Pattern -Text $listText -Pattern "playwright\s+.*\s+enabled")) {
  $issues.Add("playwright is not enabled.")
}

if (Has-Pattern -Text $listText -Pattern "notion\s+.*\s+Not logged in") {
  $issues.Add("notion is not logged in. Run: codex mcp login notion")
}

if (Has-Pattern -Text $listText -Pattern "figma\s+.*\s+Not logged in") {
  $issues.Add("figma is not logged in. Run: codex mcp login figma")
}

$linearLoggedOut = Has-Pattern -Text $listText -Pattern "linear\s+.*\s+Not logged in"
if ($linearLoggedOut -and $AutoLoginLinear) {
  Write-Host "Linear is not logged in. Running: codex mcp login linear"
  codex mcp login linear | Out-Host
  $listText = Get-McpListText
  Write-Host ""
  Write-Host $listText
  Write-Host ""
  $linearLoggedOut = Has-Pattern -Text $listText -Pattern "linear\s+.*\s+Not logged in"
}

if ($linearLoggedOut) {
  $issues.Add("linear is not logged in. Run: codex mcp login linear")
}

if ($issues.Count -eq 0) {
  Write-Host "MCP status: OK"
  exit 0
}

Write-Host "MCP status: FAIL" -ForegroundColor Red
foreach ($issue in $issues) {
  Write-Host "- $issue" -ForegroundColor Red
}
exit 1
