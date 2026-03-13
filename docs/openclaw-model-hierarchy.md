# OpenClaw Model Hierarchy and Job Definitions

> Complete reference for how OpenClaw operates, which models do what, and how
> the entire AI infrastructure fits together across ChefFlow.

Last updated: 2026-03-13

---

## The Two Systems

ChefFlow has TWO separate AI systems. They do completely different jobs and never overlap.

### System 1: ChefFlow App AI (runs on PC, serves the web app)

This is the AI that powers Remy (the in-app concierge), recipe parsing, lead scoring,
email intelligence, and all the AI features inside the ChefFlow web application.

- **Where it runs:** Inside the Next.js app on the developer's PC
- **Config file:** `lib/ai/providers.ts` + `lib/ai/dispatch/routing-table.ts`
- **Privacy enforcement:** Hard architectural boundary. Private data (client PII,
  allergies, financials) NEVER leaves the PC. Public/generic tasks can use cloud.
- **Controlled by:** The dispatch layer (`lib/ai/dispatch/`)

### System 2: OpenClaw (runs on Pi, autonomous agent team)

This is the autonomous coding/ops agent that runs on the Raspberry Pi. It reads the
ChefFlow codebase, builds features, runs QA, and handles development tasks.

- **Where it runs:** Raspberry Pi (10.0.0.177), gateway on port 18789
- **Config file:** `/home/openclawcf/.openclaw-chefflow/openclaw.json`
- **Access:** Via the OpenClaw web dashboard (through Cloudflare Tunnel or LAN)
- **Controlled by:** OpenClaw's own config and agent definitions

**These two systems share Ollama on the PC (10.0.0.153:11434) but nothing else.**

---

## System 1: ChefFlow App AI - Complete Model Map

### Privacy Tiers

| Tier           | Rule                                                         | What it protects                                                                                            |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **LOCAL_ONLY** | Data NEVER leaves the PC. Only Ollama. Hard fail if offline. | Client names, emails, allergies, dietary restrictions, financials, messages, contracts, staff data, pricing |
| **CLOUD_SAFE** | Can use any configured cloud provider. No private data.      | Technique lists, kitchen specs, campaign themes, code generation, generic content                           |

### Models Available (ChefFlow App)

| Provider          | Model                          | Tier     | Cost         | Speed       | Primary Use                                      |
| ----------------- | ------------------------------ | -------- | ------------ | ----------- | ------------------------------------------------ |
| **Ollama**        | qwen3:4b                       | fast     | Free (local) | 40-60 tok/s | Classification, intent parsing, quick extraction |
| **Ollama**        | qwen3-coder:30b                | standard | Free (local) | 12-15 tok/s | Structured JSON extraction from private data     |
| **Ollama**        | qwen3:30b                      | complex  | Free (local) | 12-15 tok/s | Conversational AI (Remy), prose generation       |
| **Groq**          | llama-3.1-8b-instant           | fast     | Free         | ~800 tok/s  | Fast cloud extraction for generic tasks          |
| **Groq**          | llama-3.3-70b-versatile        | standard | Free         | ~800 tok/s  | Structured output for generic tasks              |
| **Cerebras**      | llama3.1-8b                    | fast     | Free         | ~2000 tok/s | Backup fast extraction                           |
| **Cerebras**      | llama3.3-70b                   | standard | Free         | ~2000 tok/s | Backup structured output                         |
| **Cerebras**      | llama-4-scout-17b-16e          | complex  | Free         | ~2000 tok/s | Backup reasoning                                 |
| **Mistral**       | mistral-small-latest           | fast     | Free         | Cloud       | General-purpose small                            |
| **Mistral**       | mistral-medium-latest          | standard | Free         | Cloud       | General-purpose medium                           |
| **Mistral**       | mistral-large-latest           | complex  | Free         | Cloud       | General-purpose large                            |
| **Mistral**       | codestral-latest               | standard | Free         | Cloud       | Code-specialized (Codestral endpoint)            |
| **SambaNova**     | Meta-Llama-3.1-8B-Instruct     | fast     | Free         | Cloud       | Fast Llama inference                             |
| **SambaNova**     | Meta-Llama-3.3-70B-Instruct    | standard | Free         | Cloud       | Standard Llama inference                         |
| **SambaNova**     | DeepSeek-R1-Distill-Llama-70B  | complex  | Free         | Cloud       | Reasoning tasks                                  |
| **Gemini**        | gemini-2.0-flash               | standard | Paid         | Cloud       | Culinary domain content, technique lists         |
| **GitHub Models** | meta/Llama-3.1-8B-Instruct     | fast     | Free         | Cloud       | Code-adjacent tasks                              |
| **GitHub Models** | openai/gpt-4.1-mini            | standard | Free         | Cloud       | Code review, implementation                      |
| **GitHub Models** | openai/gpt-4.1                 | complex  | Free         | Cloud       | Complex code tasks                               |
| **Workers AI**    | @cf/meta/llama-3.1-8b-instruct | fast     | Free         | Edge        | Edge inference                                   |
| **OpenAI**        | gpt-4.1-nano                   | fast     | Paid         | Cloud       | Not active (available via GitHub Models)         |

### Routing Table (what model handles what)

| Task                                                  | Primary       | Fallback 1      | Fallback 2    | If all fail             |
| ----------------------------------------------------- | ------------- | --------------- | ------------- | ----------------------- |
| **Private data parsing** (allergies, PII, financials) | Ollama fast   | Ollama standard | HARD FAIL     | HARD FAIL (never cloud) |
| **Private structured extraction**                     | Ollama fast   | Ollama standard | HARD FAIL     | HARD FAIL (never cloud) |
| **Generic structured extraction**                     | Groq          | Cerebras        | SambaNova     | Ask developer           |
| **Code writing**                                      | Codestral     | GitHub Models   | Groq          | Ask developer           |
| **Code review**                                       | GitHub Models | Mistral         | Groq          | Ask developer           |
| **Research/exploration**                              | Groq          | Cerebras        | GitHub Models | Ask developer           |
| **Culinary content generation**                       | Gemini        | Mistral         | Groq          | Ask developer           |
| **Code/docs generation**                              | Codestral     | GitHub Models   | Groq          | Ask developer           |
| **Deterministic** (math, regex)                       | No LLM        | N/A             | N/A           | Ask developer           |
| **Escalation** (ambiguous)                            | Groq          | Cerebras        | N/A           | Ask developer           |
| **Orchestration** (routing)                           | Groq          | Cerebras        | N/A           | Ask developer           |

### Strict Job Definitions (ChefFlow App Models)

**qwen3:4b (Ollama, local)**

- Classification and intent parsing for Remy
- Quick structured extraction from private data (small payloads)
- Remy's streaming intent detection
- MUST be the default for any task that touches private data and needs speed

**qwen3-coder:30b (Ollama, local)**

- Primary model for all private data structured extraction
- Recipe parsing, brain dump parsing, client data extraction
- Any task that needs structured JSON from private content
- Fallback for qwen3:4b when it can't handle complexity

**qwen3:30b (Ollama, local)**

- Remy conversational responses (the "voice" of Remy)
- Chef bio generation, contract text generation
- Any private task that needs prose/natural language output
- Campaign personalized outreach (touches client names/history)

**Groq llama-3.3-70b-versatile (cloud, free)**

- Primary workhorse for ALL non-private structured tasks
- Campaign concept drafting (generic themes, no client data)
- Technique lists, kitchen spec suggestions
- Any cloud-safe extraction that needs reliability

**Groq llama-3.1-8b-instant (cloud, free)**

- Fast classification for cloud-safe tasks
- Simple yes/no decisions, category assignments
- Lightweight extraction from generic content

**Codestral (cloud, free)**

- All code writing and modification tasks
- Code generation for docs/templates
- Primary for IMPLEMENTATION and PUBLIC_GENERATE_CODE

**GitHub Models gpt-4.1-mini (cloud, free)**

- Code review and evaluation
- Secondary for code implementation
- Architecture analysis

**Gemini gemini-2.0-flash (cloud, paid)**

- Culinary domain content (technique lists, kitchen specs)
- Food-adjacent content generation
- Primary for PUBLIC_GENERATE_FOOD only

**Cerebras, SambaNova, Mistral, Workers AI**

- Backup/fallback providers
- Step in when primary providers are rate-limited or down
- Never primary for any task (they're insurance)

---

## System 2: OpenClaw - Complete Model Map

### Infrastructure

```
Raspberry Pi (10.0.0.177)
  - OpenClaw v2026.3.12
  - Service: openclaw-chefflow.service (systemd, auto-restart)
  - User: openclawcf (isolated, hardened)
  - Gateway: ws://127.0.0.1:18789
  - Profile: --profile chefflow
  - Config: /home/openclawcf/.openclaw-chefflow/openclaw.json

Developer PC (10.0.0.153)
  - Ollama v0.17.0 (bound to 0.0.0.0:11434)
  - GPU: RTX 3050 (6GB VRAM)
  - Serves inference to Pi over LAN
```

### Providers Configured in OpenClaw

| Provider      | Name in Config | API                | Models                                                           | Cost                   |
| ------------- | -------------- | ------------------ | ---------------------------------------------------------------- | ---------------------- |
| **Anthropic** | `claude`       | anthropic-messages | Opus 4.6, Sonnet 4.6                                             | Paid ($50 API credits) |
| **Groq**      | `groq`         | openai-completions | Llama 3.3 70B, Llama 3.1 8B                                      | Free                   |
| **Ollama**    | `ollama`       | ollama             | qwen3:4b, qwen3:30b, qwen3-coder:30b, llama3.2, nomic-embed-text | Free (local)           |

> **IMPORTANT:** The Anthropic provider is named `claude` (not `anthropic`) in the config.
> This is a workaround for a bug in OpenClaw v2026.3.12 where the `normalizeAnthropicModelId`
> function crashes on config load. Renaming the provider to `claude` bypasses the buggy
> code path while still using the `anthropic-messages` API. Do NOT rename it back to
> `anthropic` until OpenClaw ships a fix.

### Agent Definitions

| Agent ID   | Role                | Model                        | Workspace             | Job Description                                                                                                                                                                                                                |
| ---------- | ------------------- | ---------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **main**   | Lead orchestrator   | claude/claude-opus-4-6       | CFv1-openclaw-sandbox | THE BOSS. Receives all user messages. Decides what to do, delegates to other agents, makes architectural decisions, writes critical code. Opus is the smartest model in the system. It orchestrates, it doesn't do grunt work. |
| **sonnet** | Senior engineer     | claude/claude-sonnet-4-6     | CFv1-openclaw-sandbox | Handles complex implementation tasks delegated by main. Writes features, refactors code, handles multi-file changes. Faster and cheaper than Opus but still very capable.                                                      |
| **build**  | Build/compile agent | groq/llama-3.3-70b-versatile | CFv1-openclaw-build   | Runs builds, checks compilation, validates that code changes don't break things. Fast and free. Does NOT write code; just validates it.                                                                                        |
| **qa**     | Quality assurance   | groq/llama-3.3-70b-versatile | CFv1-openclaw-qa      | Runs tests, checks for regressions, validates feature behavior. Reviews code for obvious bugs. Fast and free. Reports issues back to main.                                                                                     |
| **runner** | Task runner         | groq/llama-3.1-8b-instant    | CFv1-openclaw-sandbox | Runs simple commands, file operations, quick lookups. The smallest/fastest model. Handles grunt work: listing files, reading configs, running scripts.                                                                         |

### Fallback Chain

When a model fails, OpenClaw automatically tries the next one:

```
claude/claude-opus-4-6        (Anthropic - paid, smartest)
  -> claude/claude-sonnet-4-6  (Anthropic - paid, fast + smart)
    -> groq/llama-3.3-70b-versatile  (Groq - free, 800 tok/s)
      -> ollama/qwen3:4b             (Local - free, 40-60 tok/s, last resort)
```

### Strict Job Definitions (OpenClaw Agents)

**main (Opus 4.6) - The Orchestrator**

- Receives every user message first
- Decides the plan: what needs to happen, in what order
- Delegates implementation to sonnet, build checks to build, QA to qa
- Makes all architectural decisions
- Handles anything ambiguous or requiring judgment
- Writes code ONLY when it's critical/sensitive (auth, security, database)
- Reviews work from other agents before it's committed
- NEVER does grunt work (file listing, simple lookups - that's runner's job)

**sonnet (Sonnet 4.6) - Senior Engineer**

- Implements features delegated by main
- Multi-file refactors
- Complex bug fixes
- Documentation writing
- Handles the bulk of actual code writing
- Reports back to main for review

**build (Groq Llama 3.3 70B) - Build Validator**

- `npx tsc --noEmit --skipLibCheck`
- `npx next build --no-lint`
- Reports pass/fail back to the requesting agent
- Does NOT fix errors - reports them so sonnet/main can fix
- Runs in a separate workspace to avoid conflicts

**qa (Groq Llama 3.3 70B) - Quality Assurance**

- Runs test suites
- Checks for regressions
- Reviews code diffs for obvious issues
- Validates feature behavior against requirements
- Reports findings back to main
- Does NOT fix issues - reports them

**runner (Groq Llama 3.1 8B) - Task Runner**

- Lists files, reads configs, runs simple scripts
- Quick lookups ("what's in this file?", "what's the current branch?")
- File operations (copy, move, create directories)
- The workhorse for simple, repetitive tasks
- Fastest and cheapest model - perfect for high-volume simple ops

### Concurrency Limits

- Max 2 agents running simultaneously
- Max 3 subagents per agent
- This prevents overwhelming the PC's Ollama server and Groq's rate limits

---

## How the Two Systems Connect

```
                    DEVELOPER
                       |
          +------------+------------+
          |                         |
     Claude Code              OpenClaw Dashboard
     (VS Code ext)            (Pi web UI)
          |                         |
     ChefFlow App AI          OpenClaw Agents
     (PC, Next.js)            (Pi, gateway)
          |                         |
     +----+----+              +-----+-----+
     |         |              |           |
   Ollama    Cloud          Claude      Groq
   (local)   providers     (Anthropic)  (free)
     |                        |
     +--------shared----------+
              Ollama
         (PC GPU, LAN)
```

- **Claude Code** (this conversation) uses the developer's Anthropic subscription (OAuth)
- **OpenClaw** uses a separate Anthropic API key (prepaid credits, $50 loaded)
- **ChefFlow App** uses Ollama locally for private data, cloud providers for generic tasks
- **Ollama** on the PC serves both the ChefFlow app AND OpenClaw (as fallback)

### What Each Thing Costs

| System       | Component                          | Cost                                |
| ------------ | ---------------------------------- | ----------------------------------- |
| Claude Code  | Anthropic subscription             | Monthly plan (developer pays)       |
| OpenClaw     | Opus/Sonnet via API                | $50 prepaid credits (loaded Mar 13) |
| OpenClaw     | Groq agents                        | Free (rate-limited)                 |
| OpenClaw     | Ollama fallback                    | Free (PC GPU)                       |
| ChefFlow App | Ollama (all private tasks)         | Free (PC GPU)                       |
| ChefFlow App | Groq, Cerebras, SambaNova, Mistral | Free (rate-limited)                 |
| ChefFlow App | Gemini                             | Paid (Google, small usage)          |
| ChefFlow App | GitHub Models                      | Free                                |

---

## Known Issues and Workarounds

### OpenClaw v2026.3.12 Anthropic Bug

The `normalizeAnthropicModelId` function in OpenClaw v2026.3.12 crashes when parsing
config if a provider is named `anthropic`. Workaround: name the provider `claude` instead.
The API still works correctly with `api: "anthropic-messages"`.

**Do NOT:**

- Rename the provider back to `anthropic`
- Add `claude-haiku-4-5-20251001` to the model list (this specific ID triggers the crash)
- Set `lastTouchedVersion` higher than the installed version

**Do:**

- Keep provider named `claude`
- Only use `claude-opus-4-6` and `claude-sonnet-4-6` model IDs
- Check `openclaw --version` before making config changes

### Ollama 30B Model Limitation

qwen3:30b and qwen3-coder:30b are 18GB models. The RTX 3050 has 6GB VRAM.
These models offload to CPU RAM and run at 12-15 tok/s. Under concurrent load,
they can time out. Only qwen3:4b should be used as an OpenClaw fallback.

### Groq Rate Limits

Free tier: ~30 requests/minute. OpenClaw's build and QA agents can hit this
during intensive work. When rate-limited, the fallback chain drops to Ollama qwen3:4b.

---

## SSH Quick Reference

```bash
# Status
ssh pi "sudo systemctl status openclaw-chefflow.service --no-pager"

# Logs (last 20 lines)
ssh pi "sudo journalctl -u openclaw-chefflow.service -n 20 --no-pager"

# Restart
ssh pi "sudo systemctl restart openclaw-chefflow.service"

# Read config
ssh pi "sudo -u openclawcf cat /home/openclawcf/.openclaw-chefflow/openclaw.json"

# Check version
ssh pi 'sudo -u openclawcf env HOME=/home/openclawcf PATH=/home/openclawcf/.npm-global/bin:/usr/bin:/bin openclaw --version'
```
