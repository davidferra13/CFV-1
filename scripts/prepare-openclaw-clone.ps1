param(
  [string]$ClonePath = "C:\Users\david\Documents\CFv1-openclaw-clone"
)

$ErrorActionPreference = "Stop"

$source = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$branch = (git -C $source rev-parse --abbrev-ref HEAD).Trim()

if (-not (Test-Path $ClonePath)) {
  git clone --no-hardlinks --branch $branch $source $ClonePath | Out-Null
} else {
  if (-not (Test-Path (Join-Path $ClonePath ".git"))) {
    throw "Clone path exists but is not a git clone: $ClonePath"
  }
}

git -C $ClonePath fetch origin $branch | Out-Null
git -C $ClonePath checkout $branch | Out-Null
git -C $ClonePath reset --hard FETCH_HEAD | Out-Null
git -C $ClonePath clean -fd | Out-Null

$excludedPrefixes = @(
  ".git",
  ".auth",
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
  # GOLDMINE: contains real client email data, lead scoring, pricing from real bookings
  "scripts/email-references",
  "tests/fixtures/email-references",
  "data/email-references",
  "app/api/gmail",
  "app/(admin)/admin/gmail-sync",
  "components/gmail"
)

$excludedExactFiles = @(
  ".env.local",
  ".env.local.beta",
  "mission-control.log",
  "cloudflared-beta-pc.log",
  # GOLDMINE scripts
  "scripts/goldmine-audit.mjs",
  "scripts/gold-followup-queue.ps1",
  "scripts/gmail-reconnect.mjs",
  "scripts/fix-gmail-token.mjs"
)

# Patterns matched with -like (wildcards). Checked against normalized relative paths.
$excludedPatterns = @(
  "docs/goldmine-*",
  "docs/gmail-*",
  "docs/GMAIL_*",
  "docs/email-intelligence-*",
  "docs/storyboard-*goldmine*",
  "*/goldmine-*",
  "tests/unit/gmail-*",
  "scripts/fix-gmail-*",
  "scripts/gmail-*"
)

function Test-IsExcludedPath {
  param([string]$RelativePath)

  if ([string]::IsNullOrWhiteSpace($RelativePath)) {
    return $true
  }

  $normalized = $RelativePath.Replace('\', '/')

  if ($excludedExactFiles -contains $normalized) {
    return $true
  }

  foreach ($prefix in $excludedPrefixes) {
    $normalizedPrefix = $prefix.Replace('\', '/')
    if ($normalized -eq $normalizedPrefix -or $normalized.StartsWith("$normalizedPrefix/")) {
      return $true
    }
  }

  foreach ($pattern in $excludedPatterns) {
    if ($normalized -like $pattern) {
      return $true
    }
  }

  return $false
}

$modifiedPaths = @(git -C $source diff --name-only HEAD)
$untrackedPaths = @(git -C $source ls-files --others --exclude-standard)
$deletedPaths = @(git -C $source diff --name-only --diff-filter=D HEAD)

$pathsToCopy = @($modifiedPaths + $untrackedPaths) |
  Where-Object { -not (Test-IsExcludedPath $_) } |
  Sort-Object -Unique

foreach ($relativePath in $pathsToCopy) {
  $sourcePath = Join-Path $source $relativePath
  if (-not (Test-Path $sourcePath)) {
    continue
  }

  $destinationPath = Join-Path $ClonePath $relativePath
  $destinationDirectory = Split-Path -Parent $destinationPath
  if ($destinationDirectory -and -not (Test-Path $destinationDirectory)) {
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
  }

  Copy-Item -Path $sourcePath -Destination $destinationPath -Force -Recurse
}

foreach ($relativePath in $deletedPaths) {
  if (Test-IsExcludedPath $relativePath) {
    continue
  }

  $destinationPath = Join-Path $ClonePath $relativePath
  if (Test-Path $destinationPath) {
    Remove-Item -Path $destinationPath -Force -Recurse
  }
}

foreach ($repoMetaPath in @(".auth")) {
  $target = Join-Path $ClonePath $repoMetaPath
  if (Test-Path $target) {
    Remove-Item -Path $target -Recurse -Force
  }
}

# GOLDMINE purge: remove from clone even if they came through git clone (not just overlay).
# These contain real client email data, lead scoring with real pricing, and personal info.
$goldminePurge = @(
  "scripts/email-references",
  "tests/fixtures/email-references",
  "data/email-references",
  "app/api/gmail",
  "app/(admin)/admin/gmail-sync",
  "components/gmail",
  "scripts/goldmine-audit.mjs",
  "scripts/gold-followup-queue.ps1",
  "scripts/gmail-reconnect.mjs",
  "scripts/fix-gmail-token.mjs"
)
foreach ($purge in $goldminePurge) {
  $target = Join-Path $ClonePath $purge
  if (Test-Path $target) {
    Remove-Item -Path $target -Recurse -Force
  }
}
# Remove goldmine docs by pattern
$docsPath = Join-Path $ClonePath "docs"
if (Test-Path $docsPath) {
  Get-ChildItem -Path $docsPath -Filter "goldmine-*" | Remove-Item -Force
  Get-ChildItem -Path $docsPath -Filter "gmail-*" | Remove-Item -Force
  Get-ChildItem -Path $docsPath -Filter "GMAIL_*" | Remove-Item -Force
  Get-ChildItem -Path $docsPath -Filter "email-intelligence-*" | Remove-Item -Force
  Get-ChildItem -Path $docsPath -Filter "storyboard-*goldmine*" | Remove-Item -Force
}
# Remove goldmine audit reports
$reportsPath = Join-Path $ClonePath "reports"
if (Test-Path $reportsPath) {
  Get-ChildItem -Path $reportsPath -Recurse -Filter "goldmine-*" | Remove-Item -Force
}
# Remove gmail test files
$testsUnitPath = Join-Path $ClonePath "tests/unit"
if (Test-Path $testsUnitPath) {
  Get-ChildItem -Path $testsUnitPath -Filter "gmail-*" | Remove-Item -Force
}

$cloneEnv = Join-Path $ClonePath ".env.local"

$safeEnv = @"
# OpenClaw clone: local-only safe environment
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NEXT_PUBLIC_SITE_URL=http://localhost:3300
NEXT_PUBLIC_APP_URL=http://localhost:3300
APP_ENV=development
NEXT_PUBLIC_APP_ENV=development
SUPABASE_E2E_ALLOW_REMOTE=false
NOTIFICATIONS_OUTBOUND_ENABLED=false
BRAND_MONITOR_WEB_SEARCH_ENABLED=false
DEMO_MODE_ENABLED=false
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
GEMINI_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3-coder:30b
OLLAMA_MODEL_FAST=qwen3:4b
"@

Set-Content -Path $cloneEnv -Value $safeEnv

foreach ($sensitiveEnvPath in @(".env.local.beta", ".env.local.dev")) {
  $target = Join-Path $ClonePath $sensitiveEnvPath
  if (Test-Path $target) {
    Remove-Item -Path $target -Force
  }
}

git -C $ClonePath remote set-url --push origin DISABLED_PUSH | Out-Null

$stampPath = Join-Path $ClonePath "OPENCLAW_CLONE.txt"
$stamp = @"
This directory is an isolated OpenClaw clone of CFv1.
OpenClaw should work here, not in the real repository.
Source: $source
Branch: $branch
Synced: $(Get-Date -Format s)
Pushes disabled: origin pushurl set to DISABLED_PUSH
"@
Set-Content -Path $stampPath -Value $stamp

Write-Host "OpenClaw clone prepared at $ClonePath"
