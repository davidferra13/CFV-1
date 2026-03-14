# OpenClaw Two-Machine Setup — Acceptance Checklist

Both agents (PC-side and Pi-side) must satisfy every item in their respective
column before the setup is considered complete. Run this checklist after both
agents report done.

---

## PC-side (Ollama inference server)

| #   | Check                     | How to verify                                                                                                                                      | Pass? |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| P1  | Ollama is running         | `curl http://localhost:11434/` returns "Ollama is running"                                                                                         |       |
| P2  | Bound to all interfaces   | `netstat -an \| grep 11434` shows `0.0.0.0:11434`                                                                                                  |       |
| P3  | Cross-origin allowed      | `curl -H "Origin: http://10.0.0.100" http://<LAN_IP>:11434/` returns 200 (not 403)                                                                 |       |
| P4  | Firewall allows inbound   | Firewall rules exist for ollama.exe on TCP                                                                                                         |       |
| P5  | OLLAMA_ORIGINS persists   | Registry value set: `[System.Environment]::GetEnvironmentVariable('OLLAMA_ORIGINS','User')` returns `*`                                            |       |
| P6  | localhost inference works | `curl http://localhost:11434/api/generate -d '{"model":"qwen3:4b","prompt":"test","stream":false,"options":{"num_predict":5}}'` returns 200 + JSON |       |
| P7  | LAN inference works       | Same curl but using LAN IP instead of localhost                                                                                                    |       |
| P8  | ChefFlow/Remy unbroken    | Start ChefFlow dev server, verify Remy still works via localhost                                                                                   |       |
| P9  | Rollback documented       | Every change has a recorded undo command                                                                                                           |       |

---

## Pi-side (OpenClaw host)

| #   | Check                        | How to verify                                                                                                                                             | Pass? |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| R1  | Pi can ping PC               | `ping -c 3 10.0.0.153` succeeds                                                                                                                           |       |
| R2  | Pi can reach Ollama          | `curl http://10.0.0.153:11434/` returns "Ollama is running"                                                                                               |       |
| R3  | Pi can list models           | `curl http://10.0.0.153:11434/api/tags` returns model list including qwen3:4b                                                                             |       |
| R4  | Pi can run inference         | `curl http://10.0.0.153:11434/api/generate -d '{"model":"qwen3:4b","prompt":"hello","stream":false,"options":{"num_predict":10}}'` returns valid response |       |
| R5  | OpenClaw installed           | OpenClaw binary or repo is present and runnable                                                                                                           |       |
| R6  | OpenClaw config points to PC | Config file or env var sets Ollama endpoint to `http://10.0.0.153:11434`                                                                                  |       |
| R7  | OpenClaw starts cleanly      | OpenClaw starts without errors using its discovered start command                                                                                         |       |
| R8  | End-to-end works             | A prompt through OpenClaw reaches the PC's Ollama, gets a real response back                                                                              |       |
| R9  | No Ollama on Pi              | `which ollama` returns nothing, no Ollama process running                                                                                                 |       |
| R10 | Rollback documented          | Every change on the Pi has a recorded undo step                                                                                                           |       |

---

## Cross-machine validation (run after both sides pass)

| #   | Check                  | How to verify                                                                                                     | Pass? |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ----- |
| X1  | Pi-to-PC inference     | From the Pi, run a full inference request through OpenClaw that hits the PC                                       |       |
| X2  | PC local still works   | From the PC, run a localhost Ollama request (confirm ChefFlow path unbroken)                                      |       |
| X3  | Concurrent requests    | Run a request from the Pi AND a localhost request on the PC at the same time; both succeed                        |       |
| X4  | Model cold-load        | Restart Ollama on the PC, send a request from the Pi; it succeeds (may be slow, that's OK)                        |       |
| X5  | Config survives reboot | Reboot the PC. Ollama comes back up. Pi can still reach it. (Test if convenient, not mandatory for initial setup) |       |

---

## Known Risks (document, don't block on these)

| Risk                                        | Mitigation                                                              | Status     |
| ------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| PC IP changes (DHCP)                        | Set a DHCP reservation on the router for the PC's MAC -> 10.0.0.153     |            |
| PC goes to sleep                            | Disable sleep in Windows power settings, or use Wake-on-LAN             |            |
| 30B model cold-load is slow (15-20s)        | Use qwen3:4b as default; 30B for explicit quality requests              | Acceptable |
| Ollama only handles 1 concurrent model load | Concurrent requests for different models will queue; same model is fine | Acceptable |
| Pi reboots and OpenClaw doesn't restart     | Set up systemd service (Step 8 in Pi prompt) after manual validation    |            |

---

## Rollback Plan (complete undo of all changes)

### PC-side rollback:

```powershell
# Remove OLLAMA_ORIGINS
[System.Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', $null, 'User')

# Remove OLLAMA_HOST (if it was changed)
[System.Environment]::SetEnvironmentVariable('OLLAMA_HOST', $null, 'User')

# Restart Ollama (kill and let tray app restart, or run ollama serve)
taskkill /F /IM ollama.exe
# Ollama tray app will auto-restart, or start manually
```

### Pi-side rollback:

```bash
# If a systemd service was created:
sudo systemctl stop openclaw
sudo systemctl disable openclaw
sudo rm /etc/systemd/system/openclaw.service
sudo systemctl daemon-reload

# If OpenClaw config was changed, restore the original:
# (The Pi-side agent should have documented the before/after for every config change)

# If OpenClaw was freshly installed and you want to remove it:
# rm -rf ~/openclaw  (or wherever it was cloned)
```

---

## Shared Facts (both agents must agree on these)

| Fact                 | Value                                         |
| -------------------- | --------------------------------------------- |
| PC LAN IP            | `10.0.0.153`                                  |
| Ollama port          | `11434`                                       |
| Full endpoint URL    | `http://10.0.0.153:11434`                     |
| Default model        | `qwen3:4b`                                    |
| Ollama version on PC | `0.17.0`                                      |
| PC GPU               | NVIDIA GeForce RTX 3050 (6 GB VRAM, CUDA 8.6) |
| PC RAM               | 128 GB                                        |
