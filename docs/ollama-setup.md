# Ollama Setup — Always-On Local LLM

ChefFlow uses Ollama as a privacy-first, always-on local LLM. Sensitive data (client PII, dietary restrictions, budgets) never leaves your machine.

## One-Time Setup

### 1. Install Ollama

Download from [ollama.com](https://ollama.com) and run the installer.

### 2. Register as a Windows Service (runs before you log in)

Open **PowerShell as Administrator** and run:

```powershell
ollama service install
```

This registers Ollama as a Windows service (SYSTEM account, auto-start on boot). It will survive reboots and run even before any user session.

To verify it's running:

```powershell
Get-Service -Name "Ollama"
# Should show: Running
```

### 3. Pull the model

```bash
ollama pull qwen3-coder:30b
```

This downloads ~18GB. Run it once — it stays on disk.

### 4. Set environment variables

In `.env.local`:

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3-coder:30b
```

### 5. Verify the connection

Visit the dashboard — you should see a green `● Xms` badge in the top-right corner.

Or check directly:

```bash
curl http://localhost:3100/api/ollama-status
# {"online":true,"model":"qwen3-coder:30b","latencyMs":45,"models":[...],"error":null}
```

---

## How It Works

```
ChefFlow request (PII/allergen/inquiry)
  │
  ├─ OLLAMA_BASE_URL set + Ollama responding?
  │     YES → parseWithOllama() → local Ollama (data stays on your machine)
  │     NO  → parseWithAI() → Gemini (cloud fallback)
  │
  └─ Result returned to UI (same shape either way)
```

### What Ollama handles

| Task                      | Sensitivity | Why local?                         |
| ------------------------- | ----------- | ---------------------------------- |
| Parse inquiry email       | HIGH        | Budget, name, dietary restrictions |
| Parse client notes        | HIGH        | PII (name, email, phone)           |
| Bulk client import        | HIGH        | Multiple client profiles           |
| Allergen risk analysis    | CRITICAL    | Guest allergies + menu items       |
| Client preference profile | HIGH        | Full history synthesis             |
| Brain dump import         | HIGH        | Freeform PII data                  |
| Sim-to-real scenarios     | DEV         | Synthetic only, no real data       |

### What always uses Gemini (cloud)

- Receipt/document OCR (requires vision model)
- Email drafting and correspondence
- Menu suggestions and quote drafts
- Creative copilot responses

---

## Watchdog Integration

The ChefFlow watchdog (`chefflow-watchdog.ps1`) automatically:

1. Checks Ollama health on startup
2. Starts the Ollama Windows service if it's not running
3. Checks Ollama health every ~10 server restart cycles
4. Logs all Ollama events to `chefflow-watchdog.log`

You don't need to manually manage Ollama — the watchdog handles it.

---

## Troubleshooting

### Dashboard badge shows red "Ollama off"

1. Check Windows Services: `Get-Service Ollama`
2. If stopped: `Start-Service Ollama`
3. If not found: re-run `ollama service install` as Administrator
4. Check if port 11434 is available: `netstat -ano | findstr :11434`

### Parsing falls back to Gemini unexpectedly

- Confirm `OLLAMA_BASE_URL=http://localhost:11434` in `.env.local`
- Check server console for `[ollama] Ollama unreachable` warnings
- Verify the model is downloaded: `ollama list`

### Model is slow

- `qwen3-coder:30b` requires ~24GB RAM or a GPU with 20GB+ VRAM
- For faster but less accurate results, switch to `qwen2.5:7b` or `llama3.2:3b`:
  ```bash
  OLLAMA_MODEL=qwen2.5:7b
  ```

### Service won't install

- Must run PowerShell as Administrator
- Ollama must be v0.3.0 or later: `ollama --version`
