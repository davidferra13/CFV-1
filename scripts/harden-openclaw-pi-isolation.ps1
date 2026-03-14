param(
    [string]$HostAlias = 'pi',
    [string]$SourceRepo = '/home/davidferra/apps/chefflow-beta',
    [string]$ServiceUser = 'openclawcf'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$remoteScriptTemplate = @'
#!/bin/bash
set -euo pipefail

SOURCE_REPO="__SOURCE_REPO__"
SERVICE_USER="__SERVICE_USER__"
SERVICE_HOME="/home/$SERVICE_USER"
PROFILE="chefflow"

install_openclaw_for_service_user() {
  sudo -u "$SERVICE_USER" env HOME="$SERVICE_HOME" bash -lc '
    set -euo pipefail
    mkdir -p "$HOME/.npm-global"
    npm config set prefix "$HOME/.npm-global" >/dev/null
    if [ ! -x "$HOME/.npm-global/bin/openclaw" ]; then
      npm install -g openclaw@2026.3.8 >/dev/null
    fi
  '
}

write_sandbox_env() {
  local target_dir="$1"
  sudo tee "$target_dir/.env.local" >/dev/null <<EOF
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
}

prepare_workspace() {
  local agent_name="$1"
  local target_dir="$2"
  local branch_name="$3"

  sudo rm -rf "$target_dir"
  sudo git clone --no-hardlinks "$SOURCE_REPO" "$target_dir" >/dev/null 2>&1
  sudo git -C "$target_dir" checkout -B "$branch_name" >/dev/null 2>&1
  sudo rm -rf "$target_dir/.auth"
  sudo find "$target_dir" -name 'EmailGOLDMINE.zip' -o -name 'emailGOLDMINE.zip' | xargs -r sudo rm -f
  write_sandbox_env "$target_dir"
  sudo perl -0pi -e 's/project_id = "CFv1"/project_id = "CFv1OpenClawSandbox"/; s/port = 54321/port = 54421/; s/port = 54322/port = 54422/; s/shadow_port = 54320/shadow_port = 54420/; s/port = 54329/port = 54429/; s/port = 54323/port = 54423/; s/port = 54324/port = 54424/; s/port = 54327/port = 54427/; s/site_url = "http:\/\/127\.0\.0\.1:3100"/site_url = "http:\/\/127.0.0.1:3300"/; s/additional_redirect_urls = \["https:\/\/127\.0\.0\.1:3100", "http:\/\/127\.0\.0\.1:3100"\]/additional_redirect_urls = ["https:\/\/127.0.0.1:3300", "http:\/\/127.0.0.1:3300"]/; s/inspector_port = 8083/inspector_port = 8183/;' "$target_dir/supabase/config.toml"
  sudo mkdir -p "$target_dir/.openclaw-sandbox"
  sudo tee "$target_dir/.openclaw-sandbox/README.md" >/dev/null <<EOF
# OpenClaw Sandbox

This clone exists only for OpenClaw work on the Raspberry Pi.
Agent: $agent_name
Branch: $branch_name
Service user: $SERVICE_USER
EOF
}

if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
  sudo useradd -m -s /bin/bash "$SERVICE_USER"
fi

sudo mkdir -p "$SERVICE_HOME/apps"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$SERVICE_HOME"

install_openclaw_for_service_user

prepare_workspace "main" "$SERVICE_HOME/apps/CFv1-openclaw-sandbox" "oc/main"
prepare_workspace "build" "$SERVICE_HOME/apps/CFv1-openclaw-build" "oc/build"
prepare_workspace "qa" "$SERVICE_HOME/apps/CFv1-openclaw-qa" "oc/qa"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$SERVICE_HOME/apps"

sudo rm -rf "$SERVICE_HOME/.openclaw-chefflow"
sudo cp -a "/home/davidferra/.openclaw-chefflow" "$SERVICE_HOME/.openclaw-chefflow"
sudo sed -i "s#/home/davidferra#/home/$SERVICE_USER#g" "$SERVICE_HOME/.openclaw-chefflow/openclaw.json"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$SERVICE_HOME/.openclaw-chefflow"
sudo chmod 700 "$SERVICE_HOME/.openclaw-chefflow"
sudo mkdir -p "$SERVICE_HOME/.openclaw"
sudo tee "$SERVICE_HOME/.openclaw/exec-approvals.json" >/dev/null <<EOF
{
  "version": 1,
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": false,
      "allowlist": []
    },
    "build": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": false,
      "allowlist": []
    },
    "qa": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": false,
      "allowlist": []
    }
  }
}
EOF
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$SERVICE_HOME/.openclaw"

for bin in /usr/bin/git /usr/bin/node /usr/bin/npm /usr/bin/find /usr/bin/sed /usr/bin/grep /usr/bin/cat /usr/bin/ls /usr/bin/head /usr/bin/tail /usr/bin/wc /usr/bin/sort; do
  sudo -u "$SERVICE_USER" env HOME="$SERVICE_HOME" "$SERVICE_HOME/.npm-global/bin/openclaw" approvals allowlist add --agent '*' "$bin" >/dev/null
done

systemctl --user disable --now openclaw-gateway-chefflow.service >/dev/null 2>&1 || true

sudo tee /etc/systemd/system/openclaw-chefflow.service >/dev/null <<EOF
[Unit]
Description=OpenClaw ChefFlow Gateway (isolated service user)
After=network-online.target
Wants=network-online.target

[Service]
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$SERVICE_HOME/apps/CFv1-openclaw-sandbox
Environment=HOME=$SERVICE_HOME
Environment=NPM_CONFIG_PREFIX=$SERVICE_HOME/.npm-global
ExecStart=$SERVICE_HOME/.npm-global/bin/openclaw --profile $PROFILE gateway run --bind loopback --auth none --port 18789
Restart=always
RestartSec=5
NoNewPrivileges=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectSystem=strict
ProtectControlGroups=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
LockPersonality=yes
RestrictSUIDSGID=yes
RestrictRealtime=yes
SystemCallArchitectures=native
UMask=0077
ReadWritePaths=$SERVICE_HOME
InaccessiblePaths=/home/davidferra /root /media /mnt /srv

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-chefflow.service

echo "Isolation migration applied."
echo "Service user: $SERVICE_USER"
echo "Service home: $SERVICE_HOME"
'@

$remoteScript = $remoteScriptTemplate.Replace('__SOURCE_REPO__', $SourceRepo).Replace('__SERVICE_USER__', $ServiceUser)
$localTempPath = Join-Path $env:TEMP 'harden-openclaw-pi-isolation.sh'

Set-Content -Path $localTempPath -Value $remoteScript -NoNewline

try {
    & scp $localTempPath "${HostAlias}:/tmp/harden-openclaw-pi-isolation.sh" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to copy isolation script to $HostAlias"
    }

    & ssh $HostAlias 'bash /tmp/harden-openclaw-pi-isolation.sh'
    if ($LASTEXITCODE -ne 0) {
        throw "Isolation script failed on $HostAlias"
    }
}
finally {
    Remove-Item $localTempPath -Force -ErrorAction SilentlyContinue
}

Write-Host "OpenClaw Pi isolation applied on $HostAlias."
Write-Host "Dedicated service user: $ServiceUser"
