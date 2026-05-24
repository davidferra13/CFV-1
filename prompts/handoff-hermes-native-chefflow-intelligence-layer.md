# HANDOFF: Re-Envision ChefFlow's Native Intelligence Layer on Hermes

## Read This First

This is a continuity prompt for a fresh agent session after a failed/crashed session. The prior session made a serious category error: it treated **Hermes** and **OpenClaw** as ChefFlow-local bash/cron/script systems instead of the external AI agent platforms the developer has been talking about since the beginning.

Do not continue the old migration framing blindly. Do not build inside Hermes first and then try to attach ChefFlow data later. The correct task is to reverse-engineer ChefFlow's full intelligence needs, then design Hermes as the native intelligence layer that serves those needs.

## Latest Developer Intent

Preserve this intent exactly:

- "it sounds like we need to build everything chef flow needs fully from scratch, since you never even used hermes and openclaw properly int he first place"
- "in recent tech news, OpenClaw is being surpassed in ALL benchmarks, meaning we should fully adopt on using Hermes."
- "We need to define how Hermes is the native intelligence layer to Chef Flow."
- "its time to reinvision the layer all together."
- "We should reverse engineer Hermes based on what chef flow needs, so basically analyze every chef flow needs before you build anything into hermes."
- "Do not blindly add to hermes and then try to find a home for the data/assets within Chef flow."

Translation: the next agent must produce an architecture/intake artifact first. No feature implementation. No ad hoc script patching. No "Hermes as monitoring scripts" framing.

## Correct Platform Identities

### Hermes

Hermes means **NousResearch/hermes-agent**, not ChefFlow's local `scripts/hermes/*` alone.

Verified upstream facts from official sources:

- Repository: https://github.com/NousResearch/hermes-agent
- Docs: https://hermes-agent.nousresearch.com/docs/
- Hermes describes itself as a self-improving autonomous AI agent with persistent memory, skills, session recall, messaging gateway, scheduled automations, subagents, MCP support, and multiple execution backends.
- It can live across CLI and messaging platforms including Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost, Email, SMS, Teams, Google Chat, and others.
- It supports built-in cron/scheduled automations, isolated subagents for parallel workstreams, MCP integration, and portable skills.
- The README includes `hermes claw migrate`, which is directly relevant because the migration target is from OpenClaw to Hermes.

Sources to preserve in any final plan:

- https://github.com/NousResearch/hermes-agent
- https://hermes-agent.nousresearch.com/docs/

### OpenClaw

OpenClaw means **openclaw/openclaw**, not ChefFlow's pricing schema by itself.

Verified upstream facts from official sources:

- Repository: https://github.com/openclaw/openclaw
- It is a personal AI assistant platform with a Gateway, channels, sessions, tools, skills, cron jobs, webhooks, mobile/desktop nodes, and a local workspace model.
- Its docs and README reference channel setup, gateway, tools, skills, cron jobs, webhooks, session model, agent internals, and ClawHub.
- OpenClaw has a workspace and skill model under `~/.openclaw/workspace`.

Sources to preserve in any final plan:

- https://github.com/openclaw/openclaw

## Critical Correction To Prior Handoff

The existing file `prompts/handoff-openclaw-to-hermes-migration.md` is useful as evidence of local ChefFlow artifact names, but its interpretation is wrong/incomplete.

It says:

- OpenClaw = ChefFlow pricing DB, Pi cron jobs, scrapers, pipelines.
- Hermes = lightweight local monitor with Discord bot and cron scripts.

The corrected interpretation is:

- Those ChefFlow artifacts may be integrations, adaptations, or code built around the platforms.
- The strategic decision is a **platform migration and intelligence-layer redesign** from OpenClaw-era assumptions to Hermes-native architecture.
- ChefFlow's app needs must define the architecture. Hermes capabilities should be mapped to those needs only after the needs are audited.

Do not ask the developer to choose between "umbrella rebrand", "independent migration", or "full rebuild" as if the next step is still a simple migration. The developer has already chosen the direction: fully adopt Hermes, but design it from ChefFlow's needs first.

## Working Stance For The Next Agent

Start with read-only architecture discovery.

Do not:

- Edit application code.
- Add new Hermes agents.
- Rename OpenClaw references.
- Queue or fire implementation work unless explicitly asked.
- Treat local `scripts/hermes/*` as the total definition of Hermes.
- Treat `openclaw.*` database tables as the total definition of OpenClaw.
- Build a price intelligence engine inside an unexamined Hermes layer.

Do:

- Apply `AGENTS.md` Build Queue First rules.
- Inspect `git status --short` before any edits.
- Use web/docs for current Hermes/OpenClaw platform facts when needed.
- Audit ChefFlow needs before proposing target architecture.
- Preserve user-facing/business language while still being technically precise.
- Mark claims about "recent benchmarks/news" as user-stated unless independently verified from current sources.

## Immediate Next Action

Create a read-only **ChefFlow Intelligence Needs Audit**. This should become the foundation for the Hermes-native architecture.

The audit must answer:

1. What intelligence does ChefFlow need to operate as a private-chef operating system?
2. Which app surfaces consume that intelligence today?
3. Which needs are currently backed by OpenClaw-era artifacts?
4. Which needs are currently backed by local Hermes scripts?
5. Which needs are specced but missing or broken?
6. Which needs map naturally to Hermes platform primitives: gateway, memory, skills, scheduled automations, subagents, MCP, toolsets, message channels, execution backends?
7. Which needs should remain in ChefFlow app/database code instead of Hermes?
8. What are the boundaries between ChefFlow product state and Hermes agent state?

## Required Audit Domains

### 1. Pricing Intelligence / PIE

Search and read:

- `lib/pricing/`
- `lib/pricing/resolve-price.ts`
- `lib/openclaw/`
- `app/**` files that mention price, pricing, cost, margin, store, inventory, trend, anomaly, seasonal, census, PIE, resolved price, or price prediction
- `docs/specs/pie-*.md`
- server actions that read/write pricing or catalog data
- database migrations involving `openclaw.*`, pricing, products, stores, canonical ingredients, anomalies, census, and predictions

Output:

- Needed intelligence types
- Data freshness requirements
- Consumers and file paths
- Existing contracts
- Missing/broken feeds
- Whether Hermes should orchestrate, normalize, explain, monitor, or directly own the data flow

### 2. AI / Agent Intelligence

Search and read:

- `lib/remy/`
- `app/**/remy/**`
- `lib/cil/`
- AI/Ollama/model references
- ingredient normalization and matching logic
- recipe intelligence, scaling, substitutions, nutrition
- client intelligence, preferences, lifecycle, rebooking predictions
- event planning intelligence
- communication drafting or inquiry analysis
- `docs/specs/` intelligence specs

Output:

- Every AI capability ChefFlow requires
- Inputs and outputs
- Product consumers and file paths
- Current model/tool dependencies
- Which capabilities belong in Hermes skills/subagents versus ChefFlow server code

### 3. Background Operations / Data Freshness

Search and read:

- `scripts/openclaw-pull/`
- `scripts/hermes/`
- `scripts/` broadly for sync, cron, daemon, scraper, crawler, backup, report, health, watchdog
- `docs/hermes/`
- `docs/sync-status.json`
- `docs/build-state.md`
- `.openclaw-deploy/`
- `.openclaw-build/`
- service, cron, watchdog, or scheduler references

Output:

- All autonomous background operations ChefFlow needs
- Criticality and frequency
- What is broken today
- What stale data breaks user-facing features
- Which operations should become Hermes scheduled automations/subagents
- Which operations should stay deterministic jobs outside Hermes

### 4. Multi-Channel Communication

Search and read:

- `lib/email/`
- `lib/communication/`
- `lib/notifications/`
- SMS/text references
- Discord references
- webhook/API inbound message routes
- client inquiry, booking, confirmation, reminder, follow-up, vendor, and staff communication flows
- Remy or AI drafting flows
- communication specs in `docs/specs/`

Output:

- Inbound channels
- Outbound channels
- AI-assisted communication points
- Gaps and broken integrations
- Where Hermes's native gateway should replace or wrap custom channel code

### 5. ChefFlow Memory / Context / Knowledge

Search and read:

- `docs/`
- `memory/` if present
- `.claude/`, `.agents/`, prompt and proof-pack directories
- project context files used by agents
- any context-index, conversation-history, daily-brief, ledger, or reporting artifacts

Output:

- What long-term memory ChefFlow needs
- What should live in Hermes memory/skills
- What must remain auditable in repo docs or database tables
- What cannot be stored in agent memory because it is product-critical state

## Recommended Commands

Use `rg` first. Examples:

```powershell
git status --short
rg -n "openclaw|hermes|Remy|CIL|PIE|price|pricing|cost|margin|store|ingredient|normaliz|Ollama|Discord|email|SMS|notification|webhook|cron|sync|scrape|backup|morning|daily brief|agent|memory|skill" .
rg --files | rg "pricing|openclaw|hermes|remy|cil|email|communication|notification|sync|scrape|cron|spec|memory"
```

Use external sources only for current platform capabilities, not as a replacement for ChefFlow codebase discovery.

## Deliverable For The Next Session

Produce a file, preferably:

`docs/specs/hermes-native-chefflow-intelligence-layer.md`

The document should include:

1. Executive correction: Hermes/OpenClaw are external agent platforms; prior local-script framing was wrong.
2. ChefFlow intelligence needs map by domain.
3. Current consumers and file paths.
4. Current OpenClaw-era dependencies.
5. Current local Hermes-script dependencies.
6. Broken/stale/missing pieces.
7. Hermes-native target primitives:
   - Gateway
   - Skills
   - Memory
   - Scheduled automations
   - Subagents/parallel workstreams
   - MCP/toolsets
   - Execution backends
   - Message channels
8. Boundary rules:
   - Product state belongs in ChefFlow DB.
   - Agent memory belongs in Hermes only when it is procedural/contextual and recoverable.
   - Deterministic data ingestion must have auditable logs and replay.
   - Hermes can orchestrate and explain, but must not become an opaque store for product-critical data.
9. Migration/rebuild phases:
   - Phase 0: needs audit and source-of-truth map
   - Phase 1: Hermes platform capability verification
   - Phase 2: target contracts between ChefFlow and Hermes
   - Phase 3: pilot one domain with proof, likely non-destructive monitoring or normalization
   - Phase 4: move pricing/data workflows only after contracts and replay are proven
10. Open questions for the developer, only after the audit has concrete findings.

## Acceptance Criteria

The next agent succeeds only if:

- It stops using the false "Hermes equals bash monitoring scripts" model.
- It treats OpenClaw and Hermes as real external platforms.
- It inventories ChefFlow's actual intelligence requirements before proposing implementation.
- It avoids implementation until the developer explicitly asks to fire/build.
- It creates a repo-grounded architecture document that can drive queue items later.

## Session State

- User is angry because prior agents misunderstood the platforms repeatedly.
- The correct response is not apology loops; it is disciplined, source-grounded architecture work.
- Existing workspace is dirty; preserve unrelated changes.
- This handoff is a prompt for a new session to resume correctly.
