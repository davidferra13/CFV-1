param(
  [string]$TaskLabel = "ChefFlow MCP Health Check"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logsDir = Join-Path $root "logs"
$reportsDir = Join-Path $root "reports\mcp-health"

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $logsDir "mcp-check-scheduled-$stamp.log"
$latestPath = Join-Path $reportsDir "latest.txt"
$failPath = Join-Path $reportsDir "last-failure.txt"

Push-Location $root
try {
  $result = & npm run mcp:check 2>&1
  $exitCode = $LASTEXITCODE
} finally {
  Pop-Location
}

$resultText = ($result | Out-String)
$resultText | Set-Content -Path $logPath -Encoding UTF8
$resultText | Set-Content -Path $latestPath -Encoding UTF8

if ($exitCode -eq 0) {
  exit 0
}

$message = @"
$TaskLabel failed at $(Get-Date -Format "yyyy-MM-dd HH:mm:ss").
Command: npm run mcp:check
See: $logPath
Quick fix: npm run mcp:check:fix
"@

$message | Set-Content -Path $failPath -Encoding UTF8

try {
  Add-Type -AssemblyName PresentationFramework -ErrorAction Stop
  [void][System.Windows.MessageBox]::Show(
    $message,
    "ChefFlow MCP Alert",
    [System.Windows.MessageBoxButton]::OK,
    [System.Windows.MessageBoxImage]::Warning
  )
} catch {
  try {
    msg.exe $env:USERNAME $message | Out-Null
  } catch {
    # No interactive notification channel available; logs already written.
  }
}

exit $exitCode
