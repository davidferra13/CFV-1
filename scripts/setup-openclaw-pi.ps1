param(
    [string]$HostAlias = 'pi',
    [string]$SourceDir = '/home/davidferra/apps/chefflow-beta',
    [string]$SandboxDir = '/home/davidferra/apps/CFv1-openclaw-sandbox',
    [string]$Profile = 'chefflow'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$remoteScriptTemplate = @'
#!/bin/bash
set -euo pipefail

SANDBOX="__SANDBOX__"
SOURCE="__SOURCE__"
PROFILE="__PROFILE__"
PROFILE_DIR="$HOME/.openclaw-$PROFILE"
STATE_DIR="$HOME/.openclaw"
APP_PORT=3300
API_PORT=54421
DB_PORT=54422
DB_SHADOW_PORT=54420
STUDIO_PORT=54423
INBUCKET_PORT=54424
ANALYTICS_PORT=54427
POOLER_PORT=54429
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

rm -rf "$SANDBOX"
git clone --no-hardlinks "$SOURCE" "$SANDBOX"
cd "$SANDBOX"
git checkout -B oc/first-task

cat > .env.local <<EOF
# OpenClaw sandbox env
# Local-only values. No production secrets.

NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:$API_PORT
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY

NEXT_PUBLIC_SITE_URL=http://localhost:$APP_PORT
NEXT_PUBLIC_APP_URL=http://localhost:$APP_PORT
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
EOF

perl -0pi -e 's/project_id = "CFv1"/project_id = "CFv1OpenClawSandbox"/; s/port = 54321/port = 54421/; s/port = 54322/port = 54422/; s/shadow_port = 54320/shadow_port = 54420/; s/port = 54329/port = 54429/; s/port = 54323/port = 54423/; s/port = 54324/port = 54424/; s/port = 54327/port = 54427/; s/site_url = "http:\/\/127\.0\.0\.1:3100"/site_url = "http:\/\/127.0.0.1:3300"/; s/additional_redirect_urls = \["https:\/\/127\.0\.0\.1:3100", "http:\/\/127\.0\.0\.1:3100"\]/additional_redirect_urls = ["https:\/\/127.0.0.1:3300", "http:\/\/127.0.0.1:3300"]/; s/inspector_port = 8083/inspector_port = 8183/;' supabase/config.toml

mkdir -p .openclaw-sandbox

cat > .openclaw-sandbox/blocked-commands.txt <<EOF
git push
git remote add
npm run supabase:push
npm run supabase:reset
npm run env:use-prod
npm run beta:deploy
bash scripts/deploy-beta.sh
EOF

cat > .openclaw-sandbox/required-verification.txt <<EOF
npm run typecheck
Run the smallest relevant unit or integration test suite
Run the smallest relevant Playwright suite
Walk the changed flow in a real browser
Capture proof before promotion
EOF

cat > .openclaw-sandbox/ports.txt <<EOF
App: http://localhost:$APP_PORT
Supabase API: http://127.0.0.1:$API_PORT
Supabase DB: 127.0.0.1:$DB_PORT
Supabase Studio: http://127.0.0.1:$STUDIO_PORT
Inbucket: http://127.0.0.1:$INBUCKET_PORT
EOF

cat > .openclaw-sandbox/README.md <<EOF
# OpenClaw Sandbox

This clone exists only for OpenClaw work on the Raspberry Pi.

Rules:
- Do not use real production credentials here.
- Do not run deploy or production-switch commands.
- Work on one branch per task.
- Verify every task before promotion.
- Promote changes back to the real repo only after review.
- Start the app on port $APP_PORT.
EOF

cat > .openclaw-sandbox/starter-prompt.md <<EOF
Work only in __SANDBOX__ on branch oc/first-task.

Read .openclaw-sandbox/README.md, .openclaw-sandbox/blocked-commands.txt, and .openclaw-sandbox/required-verification.txt first.

Do not use blocked commands.
Do not use production credentials.
Do not work outside this sandbox clone.
Do one bounded task at a time.
Run the smallest relevant verification before reporting done.
EOF

rm -rf "$PROFILE_DIR"
cp -a "$STATE_DIR" "$PROFILE_DIR"
rm -rf "$PROFILE_DIR/workspace"

$HOME/.npm-global/bin/openclaw --profile "$PROFILE" config set agents.defaults.workspace "__SANDBOX__"
$HOME/.npm-global/bin/openclaw --profile "$PROFILE" config set gateway.mode local
$HOME/.npm-global/bin/openclaw --profile "$PROFILE" config set gateway.bind loopback
$HOME/.npm-global/bin/openclaw --profile "$PROFILE" config set gateway.port 18789
$HOME/.npm-global/bin/openclaw --profile "$PROFILE" config set gateway.auth.mode none

mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/openclaw-gateway-chefflow.service" <<EOF
[Unit]
Description=OpenClaw Gateway ChefFlow Profile
After=network.target

[Service]
Type=simple
WorkingDirectory=__SANDBOX__
ExecStart=/home/davidferra/.npm-global/bin/openclaw --profile __PROFILE__ gateway run --bind loopback --auth none --port 18789
Restart=always
RestartSec=5
Environment=HOME=/home/davidferra

[Install]
WantedBy=default.target
EOF

systemctl --user stop openclaw-gateway.service || true
systemctl --user disable openclaw-gateway.service || true
systemctl --user daemon-reload
systemctl --user enable --now openclaw-gateway-chefflow.service
'@

$remoteScript = $remoteScriptTemplate.Replace('__SANDBOX__', $SandboxDir).Replace('__SOURCE__', $SourceDir).Replace('__PROFILE__', $Profile)
$localTempPath = Join-Path $env:TEMP 'setup-openclaw-pi.sh'

Set-Content -Path $localTempPath -Value $remoteScript -NoNewline

try {
    & scp $localTempPath "${HostAlias}:/tmp/setup-openclaw-pi.sh" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to copy setup script to $HostAlias"
    }

    & ssh $HostAlias 'bash /tmp/setup-openclaw-pi.sh'
    if ($LASTEXITCODE -ne 0) {
        throw "Pi setup script failed on $HostAlias"
    }
}
finally {
    Remove-Item $localTempPath -Force -ErrorAction SilentlyContinue
}

Write-Host "OpenClaw ChefFlow profile is configured on $HostAlias."
Write-Host "Sandbox: $SandboxDir"
Write-Host "Profile: $Profile"
