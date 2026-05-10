# Local AI Connector Setup Guide

Connect your local Ollama instance to ChefFlow without exposing it to the internet.

## How it works

```text
ChefFlow website
    → ChefFlow backend
    → your Local AI Connector (running on your machine)
    → your local Ollama at http://localhost:11434
```

Your Ollama never needs a public IP address or open firewall port. The connector app reaches **out** to ChefFlow, not the other way around.

---

## Requirements

- Node.js 18+ installed on your machine
- Ollama installed and running (`ollama serve`)
- At least one model pulled (e.g. `ollama pull gemma4`)

---

## Step 1: Generate a connector key

1. Go to **Settings** in ChefFlow
2. Scroll to **Local AI Connector**
3. Click **Add Device**
4. Enter a device name (e.g. "MacBook Pro" or "Home Server")
5. Optionally change the default model (defaults to `gemma4`)
6. Click **Generate Key**

**Copy the key immediately.** It is shown only once and cannot be recovered.

---

## Step 2: Install the connector

Download the connector script from your ChefFlow installation:

```bash
# Option A: from the ChefFlow repo (if you have it locally)
cp scripts/chefflow-connector.mjs ~/chefflow-connector.mjs

# Option B: create the file manually and paste in the script contents
touch ~/chefflow-connector.mjs
```

---

## Step 3: Configure the connector

Create a config file next to the script:

```bash
cat > ~/.chefflow-connector.env << 'EOF'
CHEFFLOW_CONNECTOR_KEY=cf_connector_<your-key-here>
# Optional: change Ollama URL if not default
# OLLAMA_BASE_URL=http://localhost:11434
# Optional: ChefFlow API URL (defaults to production)
# CHEFFLOW_API_URL=https://app.cheflowhq.com
EOF
```

Replace `<your-key-here>` with the key you copied in Step 1.

---

## Step 4: Start the connector

```bash
node ~/chefflow-connector.mjs
```

You should see:

```text
[chefflow-connector] Starting v1.0.0
[chefflow-connector] ChefFlow API: https://app.cheflowhq.com
[chefflow-connector] Ollama:       http://localhost:11434
[chefflow-connector] Key:          cf_connector_abc12345...
```

The connector is now live. ChefFlow AI tasks will be routed to your local Ollama.

---

## Step 5: Verify the connection

Go back to Settings > Local AI Connector. Your device should show **Last seen: Just now** with a green dot.

---

## Running in the background

### macOS / Linux (using pm2)

```bash
npm install -g pm2
pm2 start ~/chefflow-connector.mjs --name chefflow-connector
pm2 save
pm2 startup  # follow the printed command to auto-start on boot
```

### macOS (using launchd)

Create `~/Library/LaunchAgents/com.chefflow.connector.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.chefflow.connector</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/YOUR_USERNAME/chefflow-connector.mjs</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>CHEFFLOW_CONNECTOR_KEY</key>
    <string>cf_connector_YOUR_KEY_HERE</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

Then: `launchctl load ~/Library/LaunchAgents/com.chefflow.connector.plist`

### Windows (as a background process)

```powershell
# Run in background with logging
Start-Process node -ArgumentList "$HOME\chefflow-connector.mjs" `
  -RedirectStandardOutput "$HOME\chefflow-connector.log" `
  -RedirectStandardError "$HOME\chefflow-connector.err" `
  -WindowStyle Hidden
```

---

## Advanced: Ollama behind a proxy

If you run Ollama behind an HTTPS reverse proxy (e.g. nginx with SSL):

1. In Step 3, set `OLLAMA_BASE_URL` to your proxy URL:
   ```
   OLLAMA_BASE_URL=https://ollama.yourserver.internal
   ```
2. If your proxy requires auth:
   ```
   OLLAMA_AUTH_TOKEN=your-proxy-token
   ```
3. When creating the connector in ChefFlow, expand **Advanced** and enter the same URL.

**Security note:** Your proxy must have valid HTTPS and access controls. Do not expose raw Ollama (`http://localhost:11434`) on a public IP without authentication.

---

## Revoking access

To revoke a connector:

1. Go to Settings > Local AI Connector
2. Click **Revoke** next to the device
3. The connector app will immediately receive 401 responses and stop processing tasks

Revoked connector records are kept for audit purposes but the key is permanently disabled. Generate a new connector to reconnect.

---

## Troubleshooting

**Connector shows "Never connected" after starting:**

- Check that the key is correct (starts with `cf_connector_`)
- Verify internet connectivity from the machine running the connector
- Check the connector logs for error messages

**Ollama jobs are not completing:**

- Make sure `ollama serve` is running: `curl http://localhost:11434/api/tags`
- Check that the model is pulled: `ollama list`
- Look at the connector terminal output for error details

**Tasks are still going to the server worker:**

- Make sure the connector is running and shows "Last seen: Just now" in Settings
- If the connector was just added, the next enqueued task will route to it automatically

---

## Security boundaries

| What is private                 | What is exposed                                       |
| ------------------------------- | ----------------------------------------------------- |
| `localhost:11434` (your Ollama) | Only the connector talks to it                        |
| Your model weights              | Stored locally, never uploaded                        |
| The raw connector key           | Shown once, then hashed server-side                   |
| Your task payloads              | Sent only over HTTPS to ChefFlow, then to your Ollama |
| ChefFlow backend                | Receives task results over HTTPS from connector       |

The connector never opens a server port. It only makes outbound HTTPS requests to `app.cheflowhq.com`.
