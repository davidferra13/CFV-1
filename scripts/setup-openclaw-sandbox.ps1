param(
    [string]$TargetDir,
    [switch]$Bootstrap,
    [switch]$RefreshExisting
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SandboxProjectId = 'CFv1OpenClawSandbox'
$SandboxAppPort = 3300
$SandboxApiPort = 54421
$SandboxDbPort = 54422
$SandboxDbShadowPort = 54420
$SandboxStudioPort = 54423
$SandboxInbucketPort = 54424
$SandboxAnalyticsPort = 54427
$SandboxPoolerPort = 54429
$SandboxInspectorPort = 8183
$SandboxAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
$SandboxServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

function Write-Step {
    param([string]$Message)
    Write-Host "[openclaw-sandbox] $Message"
}

function Write-SandboxEnvFile {
    param([string]$Path)

    $content = @"
# OpenClaw sandbox env
# Local-only values. No production secrets.

NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:$SandboxApiPort
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SandboxAnonKey
SUPABASE_SERVICE_ROLE_KEY=$SandboxServiceRoleKey

NEXT_PUBLIC_SITE_URL=http://localhost:$SandboxAppPort
NEXT_PUBLIC_APP_URL=http://localhost:$SandboxAppPort
ADMIN_EMAILS=admin@example.com

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GEMINI_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=

CRON_SECRET=openclaw-local-only
SUPABASE_E2E_ALLOW_REMOTE=false
COMM_TRIAGE_ENABLED=false
NOTIFICATIONS_OUTBOUND_ENABLED=false
BRAND_MONITOR_WEB_SEARCH_ENABLED=false

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3-coder:30b
OLLAMA_MODEL_FAST=qwen3:4b
OLLAMA_MODEL_COMPLEX=qwen3:30b
"@

    Set-Content -Path $Path -Value $content
}

function Update-SandboxSupabaseConfig {
    param([string]$Path)

    $content = Get-Content -Path $Path -Raw
    $content = $content.Replace('project_id = "CFv1"', "project_id = `"$SandboxProjectId`"")
    $content = $content.Replace('port = 54321', "port = $SandboxApiPort")
    $content = $content.Replace('port = 54322', "port = $SandboxDbPort")
    $content = $content.Replace('shadow_port = 54320', "shadow_port = $SandboxDbShadowPort")
    $content = $content.Replace('port = 54329', "port = $SandboxPoolerPort")
    $content = $content.Replace('port = 54323', "port = $SandboxStudioPort")
    $content = $content.Replace('port = 54324', "port = $SandboxInbucketPort")
    $content = $content.Replace('port = 54327', "port = $SandboxAnalyticsPort")
    $content = $content.Replace('site_url = "http://127.0.0.1:3100"', "site_url = `"http://127.0.0.1:$SandboxAppPort`"")
    $content = $content.Replace(
        'additional_redirect_urls = ["https://127.0.0.1:3100", "http://127.0.0.1:3100"]',
        "additional_redirect_urls = [`"https://127.0.0.1:$SandboxAppPort`", `"http://127.0.0.1:$SandboxAppPort`"]"
    )
    $content = $content.Replace('inspector_port = 8083', "inspector_port = $SandboxInspectorPort")
    Set-Content -Path $Path -Value $content
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ParentDir = Split-Path -Parent $RepoRoot

if (-not $TargetDir) {
    $TargetDir = Join-Path $ParentDir 'CFv1-openclaw-sandbox'
}

if (-not (Test-Path (Join-Path $RepoRoot '.git'))) {
    throw "Source repo does not contain .git: $RepoRoot"
}

if ((Test-Path $TargetDir) -and (-not $RefreshExisting)) {
    throw "Target already exists: $TargetDir"
}

$git = (Get-Command git -ErrorAction Stop).Source

if (-not (Test-Path $TargetDir)) {
    Write-Step "Cloning sandbox repo to $TargetDir"
    & $git clone --no-hardlinks $RepoRoot $TargetDir
    if ($LASTEXITCODE -ne 0) {
        throw "git clone failed with exit code $LASTEXITCODE"
    }
}
elseif ($RefreshExisting) {
    Write-Step "Refreshing existing sandbox at $TargetDir"
}

$targetEnv = Join-Path $TargetDir '.env.local'
Write-SandboxEnvFile -Path $targetEnv
Write-Step "Wrote scrubbed sandbox env file"

$sandboxSupabaseConfig = Join-Path $TargetDir 'supabase\config.toml'
if (-not (Test-Path $sandboxSupabaseConfig)) {
    throw "Sandbox Supabase config not found: $sandboxSupabaseConfig"
}
Update-SandboxSupabaseConfig -Path $sandboxSupabaseConfig
Write-Step "Rewrote sandbox Supabase config with isolated project ID and ports"

$sandboxDir = Join-Path $TargetDir '.openclaw-sandbox'
New-Item -ItemType Directory -Path $sandboxDir -Force | Out-Null

$blockedCommands = @(
    'git push',
    'git remote add',
    'npm run supabase:push',
    'npm run supabase:reset',
    'npm run env:use-prod',
    'npm run beta:deploy',
    'bash scripts/deploy-beta.sh'
)
Set-Content -Path (Join-Path $sandboxDir 'blocked-commands.txt') -Value $blockedCommands

$requiredVerification = @(
    'npm run typecheck',
    'Run the smallest relevant unit or integration test suite',
    'Run the smallest relevant Playwright suite',
    'Walk the changed flow in a real browser',
    'Capture proof before promotion'
)
Set-Content -Path (Join-Path $sandboxDir 'required-verification.txt') -Value $requiredVerification

$ports = @(
    "App: http://localhost:$SandboxAppPort",
    "Supabase API: http://127.0.0.1:$SandboxApiPort",
    "Supabase DB: 127.0.0.1:$SandboxDbPort",
    "Supabase Studio: http://127.0.0.1:$SandboxStudioPort",
    "Inbucket: http://127.0.0.1:$SandboxInbucketPort"
)
Set-Content -Path (Join-Path $sandboxDir 'ports.txt') -Value $ports

$filesToCopy = @(
    'docs\openclaw-operating-policy.md',
    'docs\openclaw-sandbox-runbook.md',
    'scripts\setup-openclaw-sandbox.ps1',
    'scripts\start-openclaw-sandbox-dev.ps1'
)

foreach ($relativePath in $filesToCopy) {
    $sourcePath = Join-Path $RepoRoot $relativePath
    if (-not (Test-Path $sourcePath)) {
        continue
    }

    $targetPath = Join-Path $TargetDir $relativePath
    $targetParent = Split-Path -Parent $targetPath
    if (-not (Test-Path $targetParent)) {
        New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    }
    Copy-Item $sourcePath $targetPath -Force
}

$readme = @'
# OpenClaw Sandbox

This clone exists only for OpenClaw work.

Rules:
- Do not use real production credentials here.
- Do not run deploy or production-switch commands.
- Work on one branch per task.
- Verify every task before promotion.
- Promote changes back to the real repo only after review.
- Start the app on port 3300 with scripts/start-openclaw-sandbox-dev.ps1.
'@
Set-Content -Path (Join-Path $sandboxDir 'README.md') -Value $readme

if ($Bootstrap) {
    $npm = (Get-Command npm -ErrorAction Stop).Source

    Push-Location $TargetDir
    try {
        Write-Step "Running npm install"
        & $npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE"
        }

        Write-Step "Running npm run local:bootstrap"
        & $npm run local:bootstrap
        if ($LASTEXITCODE -ne 0) {
            throw "npm run local:bootstrap failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

Write-Step "Sandbox created successfully."
Write-Step "Next steps:"
Write-Step "1. cd $TargetDir"
Write-Step "2. npm install"
Write-Step "3. npm run local:bootstrap"
Write-Step "4. powershell -ExecutionPolicy Bypass -File scripts/start-openclaw-sandbox-dev.ps1"
Write-Step "5. git checkout -b oc/first-task"
Write-Step "Sandbox app URL: http://localhost:$SandboxAppPort"
