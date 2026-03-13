# AI Provider Upgrade - March 13, 2026

## What Changed

Expanded the AI dispatch layer from 5 providers to 10 providers, added 5 new adapters, fixed the Gemini fake-out bug, and upgraded OpenClaw's brigade configuration.

## New Provider Adapters

| Provider            | Adapter File                | Cost | Speed       | Use Case                                      |
| ------------------- | --------------------------- | ---- | ----------- | --------------------------------------------- |
| Cerebras            | `lib/ai/parse-cerebras.ts`  | Free | ~2000 tok/s | Fastest free inference, structured extraction |
| Mistral / Codestral | `lib/ai/parse-mistral.ts`   | Free | ~500 tok/s  | General tasks + code-specialized (Codestral)  |
| SambaNova           | `lib/ai/parse-sambanova.ts` | Free | ~800 tok/s  | Fast Llama/DeepSeek inference                 |
| OpenAI              | `lib/ai/parse-openai.ts`    | Paid | ~200 tok/s  | GPT-4.1-nano/mini/full (through direct API)   |
| Gemini (generic)    | `lib/ai/parse-gemini.ts`    | Paid | ~300 tok/s  | Google GenAI SDK, culinary domain content     |

All adapters follow the same pattern as `parse-groq.ts`: OpenAI-compatible fetch with AbortController timeout, JSON extraction, Zod validation, custom error class, metrics recording.

## Gemini Fix

Previously, the dispatch router faked Gemini calls by routing them through Groq. Now `parse-gemini.ts` wraps the real Google GenAI SDK (`@google/genai`) for generic structured JSON tasks through the dispatch layer. The existing specialized Gemini functions in `gemini-service.ts` remain unchanged.

## Updated Dispatch Types

New `DispatchProvider` values: `cerebras`, `mistral`, `codestral`, `sambanova`, `openai`

## Updated Routing Table

| Task Class           | Primary       | Secondary     | Fallback      |
| -------------------- | ------------- | ------------- | ------------- |
| MECHANICAL_SAFE      | groq          | cerebras      | sambanova     |
| IMPLEMENTATION       | codestral     | github-models | groq          |
| REVIEW               | github-models | mistral       | groq          |
| RESEARCH             | groq          | cerebras      | github-models |
| PUBLIC_GENERATE_FOOD | gemini        | mistral       | groq          |
| PUBLIC_GENERATE_CODE | codestral     | github-models | groq          |
| ESCALATION           | groq          | cerebras      | (developer)   |
| ORCHESTRATION        | groq          | cerebras      | (developer)   |

Private task classes (PRIVATE_PARSE, MECHANICAL_PRIVATE) remain unchanged: Ollama only, HARD_FAIL if offline.

## OpenClaw Brigade Upgrade

Updated `/home/openclawcf/.openclaw-chefflow/openclaw.json` on Pi:

**New agents:**

- `triage` - Claude Haiku 4.5 for fast task classification and routing
- `coder` - Codestral for code-specific tasks

**New providers added to brigade:**

- Cerebras (3 models: llama3.1-8b, llama3.3-70b, llama-4-scout)
- Mistral (3 models: codestral, mistral-small, mistral-large)
- SambaNova (2 models: Llama 3.1 8B, Llama 3.3 70B)

**Extended fallback chain:**

```
Opus -> Sonnet -> Groq -> Cerebras -> SambaNova -> Ollama (local)
```

**Backup:** Pre-upgrade config saved at `/home/openclawcf/.openclaw-chefflow/openclaw.json.bak.pre-upgrade`

## Environment Variables Added

```
OLLAMA_BASE_URL=http://localhost:11434
GROQ_API_KEY=gsk_...
CEREBRAS_API_KEY=csk-...
MISTRAL_API_KEY=z333...
SAMBANOVA_API_KEY=5cac...
```

OpenAI API key available through GitHub Models (`openai/gpt-4.1-mini`, `openai/gpt-4.1`). Direct OpenAI API (`OPENAI_API_KEY`) is optional and can be added later.

## Files Changed

- `lib/ai/parse-cerebras.ts` (new)
- `lib/ai/parse-mistral.ts` (new)
- `lib/ai/parse-sambanova.ts` (new)
- `lib/ai/parse-openai.ts` (new)
- `lib/ai/parse-gemini.ts` (new)
- `lib/ai/providers.ts` (added 4 new provider configs)
- `lib/ai/dispatch/types.ts` (added 5 new DispatchProvider values)
- `lib/ai/dispatch/routing-table.ts` (upgraded all chains)
- `lib/ai/dispatch/router.ts` (fixed Gemini, added 5 new provider cases)
- `.env.local` (added 5 new API keys)
- `.env.local.example` (added all new provider sections)

## Provider Count

**Before:** 5 providers (Ollama, Groq, Gemini, GitHub Models, Workers AI)
**After:** 10 providers (+ Cerebras, Mistral, Codestral, SambaNova, OpenAI)

**Free providers:** 7 (Ollama, Groq, Cerebras, SambaNova, GitHub Models, Workers AI, Mistral free tier)
**Paid providers:** 3 (Gemini, OpenAI, Codestral beyond free tier)
