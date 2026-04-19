# AI Systems

**What:** Single AI backend (Gemma 4 via Ollama), Remy (client-facing concierge), CIL (Continuous Intelligence Layer), Gustav (developer ops assistant).

**Key files:** `lib/ai/providers.ts`, `lib/ai/remy-actions.ts`, `lib/cil/`
**Status:** FUNCTIONAL

## What's Here

- **Gemma 4 (e4b) via Ollama:** Single provider. Cloud endpoint in production, localhost:11434 in dev. All AI routes through `parseWithOllama`. 128K context, native JSON, vision, audio.
- **Remy:** Client-facing AI concierge. 200+ command executors, 8-category memory, personality engine, reactive hooks, scheduled jobs. Full reference: `docs/remy-complete-reference.md`
- **CIL (Continuous Intelligence Layer):** Per-tenant SQLite knowledge graph. Observes activity log, event transitions, ledger, Remy memories, automations, inventory, SSE bus. Hourly pattern scanner detects anomalies, dormant clients, weakening relations, cohesiveness gaps. Insights feed into Remy context. Graphify-inspired confidence model (EXTRACTED/INFERRED/AMBIGUOUS). Built April 18. Key files: `lib/cil/`, spec: `docs/specs/cil-phase1-implementation.md`.
- **32 Intelligence Engines:** Stateless business analyzers in `lib/intelligence/`. CIL is accumulative; these are point-in-time. Both feed Remy.
- **Gustav:** Developer ops AI in Mission Control (localhost:41937). 110+ tools, kitchen-themed personality.
- **Privacy boundary:** Hard. PII routes through Ollama only. OllamaOfflineError on failure (never silent fallback).

## Open Items

- Ollama exposed on localhost:11434 without auth (low risk locally, wrong for production)
- CIL Phase 3+ (Causal DAG, predictions, interventions) not yet built
