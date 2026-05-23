# Live Experience Research Pack

## Executive Takeaway

Hermes now exists as a Discord Developer Portal application and has been authorized into the `Chef Leads` server. The Discord-side install is partially complete; the live bot is not complete until the bot token is generated/stored locally and a Hermes runtime is fired from the queued build item.

## Setup

- Task: Set up Hermes in Discord for ChefFlow dogfood conversations.
- Site/app/route: Discord Developer Portal and Discord web app.
- Date/time: 2026-05-20T18:10:29.779Z
- Browser context used: Playwright-controlled Chromium with Discord web session and user-assisted input/authorization.
- Confidence impact of browser context: High for visible portal/server state; limited where current tool cannot type or handle secrets.
- Session/auth state: Authenticated Discord web session was available after initial redirect.
- Viewport/device: Desktop browser.
- Location sensitivity:
- Permissions used: Discord Developer Portal app creation; OAuth2 bot authorization into `Chef Leads`.
- Action boundary: Created application and installed bot after user completed text-entry/authorization. Did not reveal, copy, store, or request any secret token.
- Run mode: standard
- Evidence folder: .evidence\live-browser\2026-05-20-18-10-29-hermes-discord-setup

## User Need Learned

- User goal: Create an organized Discord place to talk to Hermes about ChefFlow and dogfood the product.
- Audience/persona: David and ChefFlow build agents first.
- Evaluation lens: Useful dogfood hub with safe approval gates.
- Success criteria: Hermes app/bot exists, is installed in Chef Leads, target IDs are captured, and remaining runtime work is queued.
- Output expected: queue-ready and setup proof.
- Assumptions: Hermes should be read-first and approval-gated until queue firing authorizes runtime/code work.
- Questions asked: .evidence\live-browser\2026-05-20-18-10-29-hermes-discord-setup\questions.md
- Clarifying answers: User asked assistant to answer product questions on their behalf and complete setup; user manually completed typed app creation and OAuth authorization when tool input limits required it.

## Method

- Steps planned: Create/verify app, inspect bot page, invite to target server, record IDs and blockers.
- Comparisons planned:
- Stopping point: Stop before token handling or code/runtime implementation.
- Redaction approach: Do not record private messages, passwords, 2FA, bot tokens, or account secrets.

## Step-by-Step Observations

| Step | Action                        | Screenshot                                   | Visible result                                                                        | User-need learning                                                                |
| ---- | ----------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1    | Open Discord Developer Portal | screenshots/hermes-new-application-modal.png | New application modal available.                                                      | App creation required user text entry because current tool cannot type.           |
| 2    | Create Hermes app             | screenshots/hermes-app-information.png       | Hermes app created; application ID visible.                                           | Developer app exists and can become bot runtime anchor.                           |
| 3    | Open bot page                 |                                              | Bot page exists; token requires reset/reveal.                                         | Runtime remains blocked on secret handling.                                       |
| 4    | Authorize bot into Chef Leads | screenshots/hermes-invite-select-server.png  | User completed OAuth authorization; success screen showed Hermes added to Chef Leads. | Discord install succeeded.                                                        |
| 5    | Open Chef Leads server        |                                              | Server URL exposed guild/channel IDs.                                                 | Target server is `1388148643533557831`; current channel is `1481750094028996768`. |

## What Happened

Hermes was created in Discord Developer Portal and authorized into `Chef Leads`. The current server contains `#chef-flow-updates` as the visible text channel. Hermes is installed but not yet a functioning interactive bot because no bot token/runtime has been configured.

## Findings

### User Need Fit

Good fit for the requested direction: Discord can host the persistent Hermes dogfood loop, and the existing server is now connected to the Hermes application.

### Trust And Proof

Proof includes visible Developer Portal app state, OAuth authorization success, and the live Chef Leads server URL.

### Friction And Failure Points

Current tool cannot type into Discord fields, so the user had to type the app name and approve OAuth. Token handling is intentionally blocked from chat; it must be stored locally as an environment variable or secret.

### Actionability

Next action is to fire the queued implementation item and configure the bot token locally, then build the Hermes runtime and slash commands.

### Personalization Or Context Signals

The target server is `Chef Leads`; the visible current text channel is `#chef-flow-updates`.

### Missing Affordances

No dedicated Hermes category/channels exist yet. No slash commands exist yet. No runtime is online yet.

## Evaluation Scores

| Dimension            | Score | Evidence                                                                 |
| -------------------- | ----- | ------------------------------------------------------------------------ |
| Relevance            | 8     | Hermes app installed into the intended ChefFlow Discord server.          |
| Personalization      |       |                                                                          |
| Trust                | 7     | App/server IDs recorded; token not exposed.                              |
| Friction             | 5     | User-assisted input and token setup still required.                      |
| Actionability        | 8     | Queue item exists with scope/acceptance and concrete remaining blockers. |
| Local/context fit    |       |                                                                          |
| Conversion pressure  |       |                                                                          |
| Missing affordances  |       |                                                                          |
| ChefFlow opportunity |       |                                                                          |
| Evidence confidence  |       |                                                                          |

## Product Lessons

- What to copy: Discord as a persistent dogfood room with slash-command entry points.
- What to avoid: Giving Hermes broad mutation power before approval-gated queue workflows exist.
- What to adapt: Existing Hermes night-shift reports into Discord `/hermes morning`, `/hermes alerts`, and `/hermes status`.
- What to investigate next: Whether to run Hermes as a local Node service, Pi service, or existing automation host.

## ChefFlow Implications

- Relevant surface: Hermes, build queue, Discord operations.
- Build/spec candidate: Hermes Discord dogfood workspace and bot integration.
- Queue candidate: BQ-20260520T181127Z-hermes-discord-dogfood-workspace-and-bot-integration.
- Acceptance signal: Bot responds in `Chef Leads` and can summarize Hermes reports without leaking secrets.
- Risks/dependencies: Bot token handling, Discord permissions, queue mutation guardrails, private message redaction.
- Verification idea: Slash-command screenshots, no secrets in git status, command output for `/hermes status`, `/hermes morning`, `/hermes idea`, `/hermes queue-draft`.

## Evidence Pack

- Screenshots: .evidence\live-browser\2026-05-20-18-10-29-hermes-discord-setup\screenshots
- Notes: .evidence\live-browser\2026-05-20-18-10-29-hermes-discord-setup\notes.md
- URLs:
  - https://discord.com/developers/applications/1506721689306665131/information
  - https://discord.com/developers/applications/1506721689306665131/bot
  - https://discord.com/channels/1388148643533557831/1481750094028996768
- Console/network/server findings:
- Redactions: .evidence\live-browser\2026-05-20-18-10-29-hermes-discord-setup\redactions.md

## Limitations

- Browser-context limits: Playwright toolset can click/screenshot/snapshot but cannot type into fields.
- Personalization/session limits:
- Location/time limits:
- A/B test/ads variability:
- Tooling limits: Cannot handle secrets in chat; cannot control native Discord desktop app.

## What Not To Conclude

- Do not generalize: This proves app creation and server install, not a working bot runtime.
- Do not infer: Do not infer token availability, slash command registration, or channel setup.
- Needs another run: Yes, after token/runtime setup.

## Open Questions

1. Where should the bot runtime live: local Windows/WSL, Pi, or another always-on host?
2. Should Hermes create Discord categories/channels by API, or should channel structure be manually approved first?
3. Should queue mutation remain draft-only, or may Hermes run `build-queue.mjs add` after explicit Discord confirmation?

## Recommended Next Run

- Suggested mode: ChefFlow implementation/fire run.
- Suggested browser context: Discord web plus local shell.
- Suggested comparison: None; proceed with queued implementation once fired.

## Architecture Completion Update - 2026-05-20 18:54 ET

Discord server architecture was created and verified in the live Discord web session after the build/agent history report was supplied.

Final server name: `Hermes : Chef Flow`.

Final verified category/channel map:

- `00-HERMES-COMMAND`: `#hermes-command`, `#daily-brief`, `#alerts`, `#decision-log`
- `01-BUILDS`: `#build-intake`, `#queue-ready`, `#in-flight`, `#proof-packs`, `#blocked`
- `02-PRODUCT-DOGFOOD`: `#dogfood-observations`, `#feature-ideas`, `#bugs-regressions`, `#ux-friction`, `#customer-simulation`
- `03-CHEFFLOW-SYSTEMS`: `#page-xray`, `#wiring-audit`, `#universal-rail`, `#client-intelligence`, `#menu-intelligence`, `#pie-pricing`, `#remy-automation`, `#cil-signals`
- `04-OPERATIONS`: `#dev-server`, `#hermes-night-shift`, `#openclaw`, `#database-health`, `#deploys-incidents`
- `05-ARCHIVE`: `#closed-decisions`, `#completed-builds`, `#old-dogfood`

Proof:

- Final Discord structure snapshot: `.evidence/live-browser/2026-05-20-18-10-29-hermes-discord-setup/channels-final-architecture-after-rename.md`
- Queue progress log: `.agents/build-queue/active/BQ-20260520T181127Z-hermes-discord-dogfood-workspace-and-bot-integration.md`

Remaining blocker:

- Hermes is installed as a Discord bot/application, but the live bot runtime and slash-command behavior are not complete until a Discord bot token is generated and stored locally outside git. The token was not copied, pasted, exposed, or committed.

## Second-Brain Context Update - 2026-05-20 19:02 ET

Added a low-noise second-brain layer so Hermes has durable context without flooding every channel:

- `06-HERMES-BRAIN`
  - `#context-index`
  - `#repo-ledger`
  - `#rules-guardrails`
  - `#working-memory`

Seeded anchor posts in seven channels:

- `#hermes-command`: command-center purpose and expected runtime commands.
- `#daily-brief`: compact daily brief contract and source docs.
- `#build-intake`: intake/spec/thread policy.
- `#context-index`: authoritative local sources and routing map.
- `#repo-ledger`: build-history and queue-state snapshot.
- `#rules-guardrails`: safety, queue, dirty-workspace, and finish-gate rules.
- `#working-memory`: current server/app IDs, runtime blocker, and memory policy.

Proof:

- Final second-brain snapshot: `.evidence/live-browser/2026-05-20-18-10-29-hermes-discord-setup/discord-second-brain-final-visible.md`

## Conversation History Memory Update - 2026-05-20 19:06 ET

Added the supplied local conversation-history report as a dedicated second-brain source, without posting raw transcripts or overloading every channel.

Created:

- `#conversation-history` under `06-HERMES-BRAIN`

Seeded:

- Conversation-memory map with the 2,519 imported ChatGPT conversations, 58,129 messages, 1,083 retained/promoted transcript files, 1,175 unresolved REVIEW items, 261 discarded conversations, repo session logs, handoffs, dispatch artifacts, and build-run memory surfaces.
- Source route list for Hermes to inspect local memory artifacts.
- PII caution: raw staged ChatGPT files may contain unredacted PII; summarize and redact before promoting anything into Discord.
- `#context-index` update pointing Hermes to `#conversation-history` and local conversation-memory source paths.

Proof:

- `.evidence/live-browser/2026-05-20-18-10-29-hermes-discord-setup/discord-conversation-history-posted-final.md`
- `.evidence/live-browser/2026-05-20-18-10-29-hermes-discord-setup/discord-context-index-after-native-enter.md`

## Claude-Aware Conversation Ledger Correction - 2026-05-20 19:08 ET

Posted a corrected addendum in `#conversation-history` because the Claude Code project cache materially changes the memory inventory.

Added to Discord:

- Claude Code CFv1 cache path: `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1`
- Total Claude JSONL transcript files: 9,379
- Main Claude session JSONL files: 962
- Claude subagent JSONL files: 8,417
- Total Claude transcript bytes: 4,023,767,723 bytes, about 4.0 GB
- Corrected headline: at least 11,898 conversation/session transcript records from `2,519 + 962 + 8,417`.

Proof:

- `.evidence/live-browser/2026-05-20-18-10-29-hermes-discord-setup/discord-claude-ledger-posted.md`
