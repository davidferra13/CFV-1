# PC-side Agent Prompt — Prepare Ollama for Remote OpenClaw

You are preparing a Windows PC to serve as the **remote Ollama inference server** in a two-machine local AI system.

## Architecture Goal

- **This PC** = Ollama inference server (GPU, models, compute)
- **Raspberry Pi** = OpenClaw host (connects to this PC over the LAN)
- The Pi will call Ollama on this PC. This PC does not run OpenClaw.
- Local network only. Nothing exposed to the internet.

## Hard Constraints

- Do **NOT** break the existing local Ollama setup (ChefFlow/Remy depends on it)
- Do **NOT** uninstall, downgrade, or reconfigure models
- Do **NOT** expose anything to the public internet
- Do **NOT** change firewall rules unless strictly necessary and clearly explained
- Do **NOT** touch Windows services, scheduled tasks, or system-level config without explaining why
- Show commands before running them
- Prefer minimal, reversible changes
- If something fails 3 times, stop and report

---

## Step 1 — Gather current state

Before changing anything, collect and report all of the following:

```bash
# OS
systeminfo | head -5

# Ollama version
ollama --version

# Is Ollama running?
tasklist | grep -i ollama
curl -s http://localhost:11434/

# Installed models
ollama list

# What address is Ollama bound to?
netstat -an | grep ":11434"

# Environment variables
echo "OLLAMA_HOST=${OLLAMA_HOST:-not set}"
echo "OLLAMA_ORIGINS=${OLLAMA_ORIGINS:-not set}"

# LAN IP
ipconfig | grep -A 5 "Ethernet" | grep "IPv4"

# Firewall rules for Ollama
netsh advfirewall firewall show rule name=all dir=in | grep -i -A 3 "ollama"
```

Report findings before proceeding. Do not assume any of these values.

---

## Step 2 — Evaluate what needs to change

Based on Step 1 findings, determine whether each of these is already correct:

| Requirement                      | How to check                                                                   | Expected state                                           |
| -------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Ollama bound to all interfaces   | `netstat -an \| grep 11434` shows `0.0.0.0:11434`                              | If bound to `127.0.0.1`, set `OLLAMA_HOST=0.0.0.0:11434` |
| Cross-origin requests allowed    | Test with `curl -H "Origin: http://10.0.0.100" http://<LAN_IP>:11434/api/tags` | If 403, set `OLLAMA_ORIGINS=*`                           |
| Firewall allows inbound on 11434 | Firewall rules from Step 1                                                     | If missing, add a rule for ollama.exe                    |
| LAN IP reachable                 | `curl http://<LAN_IP>:11434/`                                                  | Must return "Ollama is running"                          |

Only change what is actually broken. If Ollama is already bound to `0.0.0.0` and origins are already set, do nothing.

---

## Step 3 — Apply changes (only what's needed)

For each change, explain what it does and how to undo it before applying.

### If OLLAMA_ORIGINS needs to be set:

```powershell
# Set as persistent user environment variable (survives reboots)
[System.Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', '*', 'User')
```

Rollback:

```powershell
[System.Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', $null, 'User')
```

### If OLLAMA_HOST needs to be set:

```powershell
[System.Environment]::SetEnvironmentVariable('OLLAMA_HOST', '0.0.0.0:11434', 'User')
```

Rollback:

```powershell
[System.Environment]::SetEnvironmentVariable('OLLAMA_HOST', $null, 'User')
```

### After setting env vars:

Ollama must be restarted to pick them up. Kill it and start it from a new shell that inherits the updated environment:

```bash
taskkill //F //IM ollama.exe
# Then start from a new shell or export the var in the current shell:
export OLLAMA_ORIGINS="*"
ollama serve &
```

---

## Step 4 — Validate

Run all of these. Every one must pass.

```bash
# 1. localhost still works (existing ChefFlow/Remy not broken)
curl -s http://localhost:11434/api/generate \
  -d '{"model":"qwen3:4b","prompt":"Test","stream":false,"options":{"num_predict":5}}'
# Expected: HTTP 200, valid JSON response

# 2. LAN IP works without Origin header
curl -s http://<LAN_IP>:11434/api/generate \
  -d '{"model":"qwen3:4b","prompt":"Test","stream":false,"options":{"num_predict":5}}'
# Expected: HTTP 200

# 3. LAN IP works WITH foreign Origin header (simulates Pi)
curl -s -H "Origin: http://10.0.0.100" http://<LAN_IP>:11434/api/generate \
  -d '{"model":"qwen3:4b","prompt":"Test","stream":false,"options":{"num_predict":5}}'
# Expected: HTTP 200 (NOT 403)

# 4. Model list accessible from LAN
curl -s http://<LAN_IP>:11434/api/tags
# Expected: JSON with all installed models
```

If test 1 fails, you broke ChefFlow. Stop and fix immediately.
If test 3 returns 403, the OLLAMA_ORIGINS change did not take effect. Restart Ollama from a clean shell.

---

## Step 5 — Report

When done, output:

- OS and Ollama version
- LAN IP address
- Bind address (confirm 0.0.0.0)
- OLLAMA_ORIGINS value (confirm \*)
- List of installed models with sizes
- All 4 validation results (pass/fail)
- Every change made with its rollback command
- Recommendation for stable IP (DHCP reservation on router)

---

## Stable IP Note

The PC's LAN IP may change if DHCP reassigns it. Recommend the user set a **DHCP reservation** on their router (map the PC's MAC address to its current IP). This is safer than setting a static IP on Windows.

Do **not** change Windows network adapter settings to static IP unless explicitly asked.

---

## What not to do

- Do not uninstall or pull new models
- Do not change Ollama's model directory
- Do not modify Windows services or scheduled tasks
- Do not install additional software
- Do not set up Tailscale (future improvement, not now)
- Do not change the Windows firewall profile type
- Do not modify any ChefFlow config
