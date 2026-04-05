# AI Systems

**What:** Two AI backends (Ollama for private data, Gemini for generic tasks), plus Remy (client-facing concierge) and Gustav (developer ops assistant).

**Key files:** `lib/ai/providers.ts`, `lib/ai/dispatch/`, `lib/ai/remy-actions.ts`
**Status:** FUNCTIONAL (Remy parsing broken)

## What's Here

- **Ollama-compatible runtime:** Cloud endpoint in production, localhost:11434 in dev. Handles all private data (client PII, financials, allergies, recipes). Never falls back to Gemini.
- **Gemini:** Generic tasks only (technique lists, kitchen specs, campaign concepts). No PII ever.
- **Remy:** Client-facing AI concierge in the chef's portal. Chat drawer, inquiry parsing, daily ops generation, client preference analysis. Full reference: `docs/remy-complete-reference.md`
- **Gustav:** Developer ops AI in Mission Control (localhost:41937). 110+ tools, kitchen-themed personality, natural language infrastructure control.
- **Privacy boundary:** Hard. PII routes through Ollama only. OllamaOfflineError on failure (never silent fallback).

## Open Items

- **CRITICAL:** Remy inquiry_parse and client_parse return empty since March 30 (0% parse rate)
- Ollama exposed on localhost:11434 without auth (low risk locally, wrong for production)
