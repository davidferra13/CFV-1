# Live Browser Notes

## Intent Model

- User goal: Set up Hermes in Discord for ChefFlow as an organized dogfood conversation and bot workspace.
- Audience/persona: David and ChefFlow build agents first; not clients or chefs.
- Evaluation lens: Can Hermes become a dedicated ChefFlow conversation hub without unsafe autonomous mutation?
- Success criteria: Discord app created, Hermes installed into Chef Leads, target IDs recorded, remaining runtime blockers identified.
- Output expected: queue-ready plus setup progress/proof.
- Run mode: standard
- Browser context: Playwright-controlled Chromium with Discord web session.

## Browser Context Decision

- Candidate contexts: Discord desktop app, Playwright browser, Discord Developer Portal.
- Selected context: Playwright browser plus user-assisted input/authorization where text entry or account approval was required.
- Reason: Browser session exposed Developer Portal and server UI; native desktop app is not controllable with current tools.
- Confidence impact: High for visible portal/server state; limited for actions requiring text entry or token handling.

## Timeline

| Time  | Step | URL                                               | Action                                 | Observation                                                                       | Screenshot                                   |
| ----- | ---- | ------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| 18:10 | 1    | discord.com/channels/@me                          | Checked Discord auth state             | Initial tab redirected once, later Discord web session was available.             |                                              |
| 18:12 | 2    | discord.com/developers/applications               | Opened Developer Portal                | Existing apps visible; created app flow available.                                | screenshots/hermes-new-application-modal.png |
| 18:13 | 3    | Developer Portal modal                            | User typed app name and clicked Create | Hermes app created.                                                               |                                              |
| 18:14 | 4    | /applications/1506721689306665131/information     | Captured app information               | Application ID visible: 1506721689306665131.                                      | screenshots/hermes-app-information.png       |
| 18:15 | 5    | /applications/1506721689306665131/bot             | Opened bot page                        | Bot user exists, token requires reset/reveal and must be handled locally.         |                                              |
| 18:16 | 6    | OAuth2 authorize URL                              | Invited Hermes to Discord              | User completed server selection/authorization.                                    | screenshots/hermes-invite-select-server.png  |
| 18:17 | 7    | /channels/1388148643533557831/1481750094028996768 | Opened Chef Leads server               | Hermes authorized into Chef Leads; target guild and current channel IDs recorded. |                                              |

## Raw Non-Private Observations

- Discord application: Hermes.
- Discord application ID: 1506721689306665131.
- Target guild/server: Chef Leads.
- Target guild ID: 1388148643533557831.
- Current channel: #chef-flow-updates.
- Current channel ID: 1481750094028996768.
- Bot token is not present in local environment and was not copied, pasted, or exposed.

## Architecture Completion Update - 2026-05-20 18:54 ET

- Server renamed from `Chef Leads` to `Hermes : Chef Flow`.
- Final verified Discord guild ID: `1388148643533557831`.
- Hermes app ID: `1506721689306665131`.
- Created command/observability category: `00-HERMES-COMMAND`.
- Created build ledger category: `01-BUILDS`.
- Created dogfood intake category: `02-PRODUCT-DOGFOOD`.
- Created ChefFlow system category: `03-CHEFFLOW-SYSTEMS`.
- Created operations category: `04-OPERATIONS`.
- Created archive category and corrected its name to `05-ARCHIVE`.
- Verified key channels exist after final snapshot, including `#universal-rail`, `#hermes-night-shift`, and `#old-dogfood`.
- Final structure proof snapshot: `channels-final-architecture-after-rename.md`.

Final channel architecture:

- `00-HERMES-COMMAND`: `#hermes-command`, `#daily-brief`, `#alerts`, `#decision-log`
- `01-BUILDS`: `#build-intake`, `#queue-ready`, `#in-flight`, `#proof-packs`, `#blocked`
- `02-PRODUCT-DOGFOOD`: `#dogfood-observations`, `#feature-ideas`, `#bugs-regressions`, `#ux-friction`, `#customer-simulation`
- `03-CHEFFLOW-SYSTEMS`: `#page-xray`, `#wiring-audit`, `#universal-rail`, `#client-intelligence`, `#menu-intelligence`, `#pie-pricing`, `#remy-automation`, `#cil-signals`
- `04-OPERATIONS`: `#dev-server`, `#hermes-night-shift`, `#openclaw`, `#database-health`, `#deploys-incidents`
- `05-ARCHIVE`: `#closed-decisions`, `#completed-builds`, `#old-dogfood`

## Second-Brain Context Update - 2026-05-20 19:02 ET

Added a compact second-brain layer without mirroring every build item into Discord:

- `06-HERMES-BRAIN`
  - `#context-index`: authoritative repo sources and routing map.
  - `#repo-ledger`: build-history snapshot and current queue-state counts.
  - `#rules-guardrails`: Build Queue First, secret boundaries, approval-gated mutation, finish gate.
  - `#working-memory`: durable operational facts and current bot/runtime status.

Seeded concise anchor posts in:

- `#hermes-command`
- `#daily-brief`
- `#build-intake`
- `#context-index`
- `#repo-ledger`
- `#rules-guardrails`
- `#working-memory`

Proof snapshot: `discord-second-brain-final-visible.md`.

## Conversation History Memory Update - 2026-05-20 19:06 ET

Added the supplied local conversation-history report as a low-noise memory map:

- Created `#conversation-history` under `06-HERMES-BRAIN`.
- Posted a summarized conversation-memory map rather than raw transcripts.
- Included headline counts:
  - 2,519 imported ChatGPT conversations.
  - 58,129 total messages.
  - 1,083 retained/promoted unique conversation markdown files.
  - 1,175 unresolved REVIEW conversations.
  - 261 discarded conversations.
  - 223 repo session-log entries.
  - 72 session digest files.
  - 8 handoff files.
  - 25 agent/prompt handoff files.
  - 19 Codex dispatch artifacts.
  - 92 build run folders with orchestration/proof context.
- Added source routes for Hermes:
  - `.chatgpt-ingestion/INGESTION-LOG.md`
  - retained `.chatgpt-ingestion` batches
  - `obsidian_export/cfv1/.chatgpt-ingestion/`
  - `docs/session-log.md`
  - `docs/archive/session-log-archive.md`
  - `docs/session-digests/`
  - `docs/handoffs/`
  - `docs/prompts/`
  - `logs/codex-dispatch/`
  - `.agents/build-queue/runs/`
  - `docs/hermes/`
- Updated `#context-index` with the new conversation-memory source route.
- Preserved the PII caveat: never paste raw transcripts into Discord; summarize and redact.

Proof snapshots:

- `discord-conversation-history-posted-final.md`
- `discord-context-index-after-native-enter.md`

## Claude-Aware Conversation Ledger Correction - 2026-05-20 19:08 ET

Posted a corrected addendum in `#conversation-history` because Claude Code materially changes the local memory count.

Added:

- Claude Code CFv1 cache path: `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1`
- Total Claude JSONL transcript files: 9,379
- Main Claude session JSONL files: 962
- Claude subagent JSONL files: 8,417
- Total Claude transcript bytes: 4,023,767,723 bytes, about 4.0 GB
- Earliest Claude CFv1 record: 2026-02-13 20:12
- Latest Claude CFv1 record seen: 2026-05-20 14:31
- Corrected headline: at least 11,898 conversation/session transcript records when counting ChatGPT conversations plus Claude main sessions plus Claude subagents.

Hermes rule preserved:

- Treat Claude JSONL as high-volume raw memory. Search, summarize, and redact before promoting into specs, queue items, or Discord posts.

Proof snapshot:

- `discord-claude-ledger-posted.md`
