param(
  [string]$SandboxPath = "C:\Users\david\Documents\CFv1-openclaw-sandbox"
)

$ErrorActionPreference = "Stop"

$source = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not (Test-Path $SandboxPath)) {
  New-Item -ItemType Directory -Path $SandboxPath | Out-Null
}

$excludeDirs = @(
  ".git",
  ".next",
  ".next-dev",
  ".next-dev-pin-smoke",
  ".vercel",
  "node_modules",
  "playwright-report",
  "test-results",
  "logs",
  "tmp",
  ".tmp",
  "backups",
  ".auth",
  # GOLDMINE: real client email data, lead scoring, pricing from real bookings
  "scripts\email-references",
  "tests\fixtures\email-references",
  "data\email-references",
  "lib\gmail",
  "lib\inquiries",
  "app\api\gmail",
  "app\(admin)\admin\gmail-sync",
  "components\gmail"
) | ForEach-Object {
  Join-Path $source $_
}

$excludeFiles = @(
  ".env.local",
  ".env.local.beta",
  "mission-control.log",
  "cloudflared-beta-pc.log",
  # GOLDMINE scripts
  "goldmine-audit.mjs",
  "gold-followup-queue.ps1",
  "gmail-reconnect.mjs",
  "fix-gmail-token.mjs"
)

$roboArgs = @(
  $source,
  $SandboxPath,
  "/MIR",
  "/R:1",
  "/W:1",
  "/NFL",
  "/NDL",
  "/NJH",
  "/NJS",
  "/NP",
  "/XD"
) + $excludeDirs + @(
  "/XF"
) + $excludeFiles

robocopy @roboArgs | Out-Null
$exitCode = $LASTEXITCODE

if ($exitCode -ge 8) {
  throw "robocopy failed with exit code $exitCode"
}

foreach ($repoMetaPath in @(".git", ".auth")) {
  $target = Join-Path $SandboxPath $repoMetaPath
  if (Test-Path $target) {
    Remove-Item -Path $target -Recurse -Force
  }
}

$sandboxEnv = Join-Path $SandboxPath ".env.local"
$devEnv = Join-Path $SandboxPath ".env.local.dev"
$exampleEnv = Join-Path $SandboxPath ".env.local.example"

if (Test-Path $devEnv) {
  Copy-Item $devEnv $sandboxEnv -Force
} elseif (Test-Path $exampleEnv) {
  Copy-Item $exampleEnv $sandboxEnv -Force
}

# GOLDMINE purge: remove docs with real client data
$docsPath = Join-Path $SandboxPath "docs"
if (Test-Path $docsPath) {
  Get-ChildItem -Path $docsPath -Filter "goldmine-*" | Remove-Item -Force
  Get-ChildItem -Path $docsPath -Filter "gmail-*" | Remove-Item -Force
  Get-ChildItem -Path $docsPath -Filter "GMAIL_*" | Remove-Item -Force
  Get-ChildItem -Path $docsPath -Filter "email-intelligence-*" | Remove-Item -Force
  Get-ChildItem -Path $docsPath -Filter "storyboard-*goldmine*" | Remove-Item -Force
}
# Remove goldmine audit reports
$reportsPath = Join-Path $SandboxPath "reports"
if (Test-Path $reportsPath) {
  Get-ChildItem -Path $reportsPath -Recurse -Filter "goldmine-*" | Remove-Item -Force
}
# Remove gmail test files
$testsUnitPath = Join-Path $SandboxPath "tests\unit"
if (Test-Path $testsUnitPath) {
  Get-ChildItem -Path $testsUnitPath -Filter "gmail-*" | Remove-Item -Force
}

$stampPath = Join-Path $SandboxPath "OPENCLAW_SANDBOX.txt"
$stamp = @"
This directory is a disposable sandbox copy of CFv1.
OpenClaw should work here, not in the real repository.
Source: $source
Synced: $(Get-Date -Format s)
"@
Set-Content -Path $stampPath -Value $stamp

Write-Host "Sandbox synced to $SandboxPath"
