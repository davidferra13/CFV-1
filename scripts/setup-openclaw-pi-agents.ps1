param(
    [string]$HostAlias = 'pi',
    [string]$SourceDir = '/home/davidferra/apps/chefflow-beta'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$remoteScript = @'
#!/bin/bash
set -euo pipefail

SOURCE="__SOURCE__"

for name in build qa; do
  WORKSPACE="$HOME/apps/CFv1-openclaw-$name"
  rm -rf "$WORKSPACE"
  git clone --no-hardlinks "$SOURCE" "$WORKSPACE" >/dev/null 2>&1
  cd "$WORKSPACE"
  git checkout -B "oc/$name" >/dev/null 2>&1

  cat > .env.local <<EOF
# OpenClaw sandbox env
# Local-only values. No production secrets.

NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54421
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

NEXT_PUBLIC_SITE_URL=http://localhost:3300
NEXT_PUBLIC_APP_URL=http://localhost:3300
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
  cat > .openclaw-sandbox/README.md <<EOF
# OpenClaw Sandbox

This clone exists only for OpenClaw work on the Raspberry Pi.
Agent: $name
Branch: oc/$name
EOF
done

$HOME/.npm-global/bin/openclaw --profile chefflow agents add build --workspace /home/davidferra/apps/CFv1-openclaw-build --non-interactive --model openai-codex/gpt-5.4 >/dev/null 2>&1 || true
$HOME/.npm-global/bin/openclaw --profile chefflow agents add qa --workspace /home/davidferra/apps/CFv1-openclaw-qa --non-interactive --model openai-codex/gpt-5.4 >/dev/null 2>&1 || true

mkdir -p "$HOME/.openclaw-chefflow/agents/build/agent" "$HOME/.openclaw-chefflow/agents/qa/agent"
cp "$HOME/.openclaw-chefflow/agents/main/agent/auth-profiles.json" "$HOME/.openclaw-chefflow/agents/build/agent/auth-profiles.json"
cp "$HOME/.openclaw-chefflow/agents/main/agent/auth-profiles.json" "$HOME/.openclaw-chefflow/agents/qa/agent/auth-profiles.json"
'@

$resolvedScript = $remoteScript.Replace('__SOURCE__', $SourceDir)
$localTempPath = Join-Path $env:TEMP 'setup-openclaw-pi-agents.sh'

Set-Content -Path $localTempPath -Value $resolvedScript -NoNewline

try {
    & scp $localTempPath "${HostAlias}:/tmp/setup-openclaw-pi-agents.sh" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to copy agent setup script to $HostAlias"
    }

    & ssh $HostAlias 'bash /tmp/setup-openclaw-pi-agents.sh'
    if ($LASTEXITCODE -ne 0) {
        throw "Pi agent setup script failed on $HostAlias"
    }
}
finally {
    Remove-Item $localTempPath -Force -ErrorAction SilentlyContinue
}

Write-Host "OpenClaw Pi agents configured on $HostAlias."
