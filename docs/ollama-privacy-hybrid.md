# Ollama Privacy-First Hybrid LLM

## What This Is

ChefFlow uses a hybrid AI routing system: sensitive data (client PII, inquiry details, personal notes) is processed by a local Ollama model running on your machine, while quality-critical creative tasks (email drafting, menu suggestions, correspondence) stay on Google Gemini.

This means client names, emails, dietary restrictions, addresses, and inquiry budgets are **never sent to a cloud API** when Ollama is configured.

---

## Architecture

```
Parser call (parse-client, parse-inquiry, parse-brain-dump)
    ↓
parseWithOllama()                    ← lib/ai/parse-ollama.ts
    │
    ├── OLLAMA_BASE_URL set?
    │       YES → call Ollama (local inference, data stays on machine)
    │       NO  → call parseWithAI (Gemini, previous behavior)
    │
    ├── Ollama unreachable?
    │       → fallback to Gemini + console.warn
    │
    └── Ollama returns invalid JSON?
            → repair pass → fallback to Gemini if repair fails

Vision tasks (receipts, documents)   ← always Gemini (vision model required)
Creative tasks (drafts, menus, ACE)  ← always Gemini (quality matters)
```

---

## Sensitivity Routing

| File                              | Data                                      | Routes To        |
| --------------------------------- | ----------------------------------------- | ---------------- |
| `lib/ai/parse-client.ts`          | Names, emails, phones, addresses          | **Ollama**       |
| `lib/ai/parse-clients-bulk.ts`    | Same, multiple clients                    | **Ollama**       |
| `lib/ai/parse-inquiry.ts`         | Budget, dietary restrictions, preferences | **Ollama**       |
| `lib/ai/parse-brain-dump.ts`      | Personal notes, client info, recipes      | **Ollama**       |
| `lib/ai/parse-receipt.ts`         | Receipt vision                            | Gemini (vision)  |
| `lib/ai/parse-document-vision.ts` | Document OCR                              | Gemini (vision)  |
| `lib/ai/gemini-service.ts`        | Email drafts, menu suggestions, ACE       | Gemini (quality) |

---

## Setup

### Local Development

1. Install and start Ollama: https://ollama.com
2. Pull the recommended model:
   ```bash
   ollama pull qwen3-coder:30b
   ```
3. Add to `.env.local`:
   ```bash
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=qwen3-coder:30b
   ```
4. Restart the dev server. Smart Import will now route PII through Ollama.
   Watch the server console for `[ollama] Parsed successfully with qwen3-coder:30b`.

### Production (Self-Hosted)

Run Ollama on a server and set:

```bash
OLLAMA_BASE_URL=http://your-server:11434
OLLAMA_MODEL=qwen3-coder:30b
```

If `OLLAMA_BASE_URL` is not set on Vercel, all operations use Gemini (no change).

---

## Model: qwen3-coder:30b

- 30B parameters, 18GB on disk
- Excellent at structured JSON extraction (critical for parsing)
- Text-only — no vision capabilities
- Runs well on machines with 24GB+ RAM or a modern GPU

**Vision gap**: Receipt parsing and document OCR require a multimodal model. To enable local receipt privacy in the future, pull `qwen2.5-vl` or `llava-llama3` and add a vision routing path in `parse-receipt.ts`.

---

## Key Files

| File                     | Purpose                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `lib/ai/providers.ts`    | Config helpers — `isOllamaEnabled()`, `getOllamaConfig()`          |
| `lib/ai/parse-ollama.ts` | Ollama adapter with Zod validation + repair pass + Gemini fallback |
| `lib/ai/parse.ts`        | Original Gemini `parseWithAI` — unchanged                          |

---

## Fallback Behavior

| Scenario                        | Behavior                                             |
| ------------------------------- | ---------------------------------------------------- |
| `OLLAMA_BASE_URL` not set       | All ops use Gemini — identical to before this change |
| Ollama connection refused       | Falls back to Gemini + `console.warn`                |
| Ollama returns non-JSON         | Falls back to Gemini + `console.warn`                |
| Zod validation fails (1st pass) | Repair pass attempted via Ollama                     |
| Repair pass also fails          | Falls back to Gemini                                 |

The system is designed so that **no parsing operation silently breaks** — there is always a Gemini fallback. The individual parsers also have their own heuristic fallbacks (`fallback-parsers.ts`) as the last resort.

---

## Professional Practices This Implements

This follows the "Tier 2 hybrid" pattern used by privacy-conscious businesses:

1. **Privacy routing** — PII goes local, creative tasks go cloud
2. **Model pinning** — `OLLAMA_MODEL` env var pins the exact model
3. **Graceful degradation** — cloud fallback when local inference fails
4. **No silent failures** — every fallback is logged with `console.warn`
5. **Structured output** — Ollama `format: 'json'` + Zod validation + repair pass
6. **Infrastructure-agnostic** — `OLLAMA_BASE_URL` supports localhost or self-hosted server
