# Hermes vs OpenClaw, ChefFlow V1 Decision Memo

Date: 2026-04-23

## Scope

This memo answers whether Hermes adds enough real value beyond the current OpenClaw stack to justify another autonomous runtime in ChefFlow V1.

Repo evidence is primary. Official docs are secondary and were checked on 2026-04-23.

## Facts

- ChefFlow already treats OpenClaw as a separate Raspberry Pi data system that does all collection while ChefFlow does the UI and sync consumption. ChefFlow does zero scraping directly. `docs/product-blueprint.md:307-316`, `project-map/infrastructure/openclaw.md:3-23`
- OpenClaw is internal only and must not appear on user-facing surfaces. `CLAUDE.md:75-77`, `docs/product-blueprint.md:262`, `project-map/infrastructure/openclaw.md:35-36`
- The repo already has OpenClaw sync orchestration, price sync, admin health surfaces, quarantine review, sync audit visibility, and a shared runtime health contract. `scripts/openclaw-pull/sync-all.mjs:4-13`, `scripts/openclaw-pull/sync-all.mjs:376-479`, `scripts/run-openclaw-sync.mjs:1-8`, `scripts/run-openclaw-sync.mjs:305-323`, `app/(admin)/admin/openclaw/health/page.tsx:18-27`, `app/(admin)/admin/openclaw/health/page.tsx:95-99`, `app/(admin)/admin/openclaw/health/page.tsx:217-218`, `lib/admin/openclaw-health-actions.ts:118-146`, `lib/admin/openclaw-health-actions.ts:203-352`, `lib/admin/openclaw-health-actions.ts:383-537`, `lib/openclaw/health-contract.ts:388-569`, `app/api/openclaw/status/route.ts:7-55`
- ChefFlow safety posture is narrow: all AI routes through one Ollama-compatible endpoint, AI never owns truth, AI never mutates canonical state, and nothing important should depend on unsafe autonomy. `CLAUDE.md:61-63`, `docs/AI_POLICY.md:5-10`, `docs/AI_POLICY.md:49-65`, `docs/AI_POLICY.md:83-110`, `docs/AI_POLICY.md:124-175`
- The Pi has room for more software on paper: Raspberry Pi 5, 8GB RAM, 117GB total disk, 34GB used, 78GB free, 1.6GB RAM used out of 7.9GB, 6.2GB available, load average 0.00. `docs/research/raspberry-pi-full-audit.md:15-24`
- The Pi also already hosts two OpenClaw stacks: price intelligence and an OpenClaw AI swarm. That swarm already has a gateway, 4 sandbox containers, and zero shipped projects. `docs/research/raspberry-pi-full-audit.md:9`, `docs/research/raspberry-pi-full-audit.md:30-39`, `docs/research/raspberry-pi-full-audit.md:61-68`, `docs/research/raspberry-pi-full-audit.md:235-248`, `docs/research/raspberry-pi-full-audit.md:284-286`
- The Pi is not fully clean today: exposed API key in `.bashrc`, functional Instacart session cookies, logged-out Tailscale, dead Cloudflare tunnel target, and unnecessary desktop services running. `docs/research/raspberry-pi-full-audit.md:367-390`, `docs/research/raspberry-pi-full-audit.md:304-327`, `docs/research/raspberry-pi-full-audit.md:428-431`

## What Hermes Adds, Exactly

Hermes does add a few real things. The list is shorter than the marketing implies.

### 1. Built-in learning loop and persistent agent memory

Hermes explicitly documents a built-in learning loop, agent-created skills, self-improving skills, persistent memory, and a user model that deepens across sessions. It also persists config, memories, skills, cron jobs, sessions, and logs under `~/.hermes/`. That is a real capability delta. I did not find an equivalent OpenClaw claim in the official OpenClaw docs checked; OpenClaw documents hooks, task flows, session-memory, and plugins, but not a built-in self-improving memory loop.

Official docs:

- Hermes home: <https://hermes-agent.nousresearch.com/docs/>
- Hermes config: <https://hermes-agent.nousresearch.com/docs/user-guide/configuration>
- OpenClaw hooks: <https://docs.openclaw.ai/automation/hooks>

### 2. A broader execution-backend matrix

Hermes explicitly supports six terminal backends: local, Docker, SSH, Modal, Daytona, and Singularity. That is broader than the OpenClaw execution model documented in the official pages checked, which focus on gateway sandboxing, ACP, and remote gateway patterns rather than a terminal-backend matrix.

Official docs:

- Hermes config, terminal backends: <https://hermes-agent.nousresearch.com/docs/user-guide/configuration>
- OpenClaw Docker and sandboxing docs: <https://docs.openclaw.ai/install/docker>, <https://docs.openclaw.ai/gateway/sandboxing>

### 3. A documented OpenAI-compatible API server and jobs API

Hermes explicitly ships an OpenAI-compatible HTTP API, health endpoints, a runs event stream, and a jobs API for scheduled/background work. In the official OpenClaw pages checked, I found gateway WS protocol, cron, sub-agents, MCP, hooks, and webhooks, but not an equivalent stable operator-facing API server in the same category.

Official docs:

- Hermes API server: <https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server>
- OpenClaw gateway protocol: <https://docs.openclaw.ai/gateway/protocol>

## What Hermes Does Not Add, Because OpenClaw Already Has It

Hermes does not justify itself on the basics. OpenClaw already has these, officially and in this repo:

- Messaging gateway / always-on agent surface.
  - OpenClaw official docs say one gateway spans Discord, Slack, Telegram, WhatsApp, and more.
  - Hermes official docs say the same class of gateway exists there too.
  - Repo reality: ChefFlow does not use OpenClaw for customer-facing chat today, it uses OpenClaw as an internal data engine. `docs/product-blueprint.md:307-316`
- Cron / scheduled automation.
  - OpenClaw has built-in cron with delivery and webhooks.
  - Hermes has built-in cron too.
  - That is parity, not new value.
- Sub-agents / detached background runs.
  - OpenClaw has sub-agents, background tasks, queue routing, and completion delivery.
  - Hermes also has subagents.
  - Again, parity.
- MCP.
  - OpenClaw can act as an MCP server and keeps an outbound MCP registry.
  - Hermes can consume MCP servers and can also serve MCP.
  - This is parity, not a differentiator.
- Hooks and webhooks.
  - OpenClaw has hooks plus authenticated webhook surfaces.
  - Hermes has gateway hooks plus webhook routes.
  - This is parity.
- Health and status surfaces.
  - OpenClaw has health/status commands and this repo already wraps OpenClaw health into admin and API surfaces.
  - Hermes also has `/health` and `/health/detailed`.
  - Not new value for ChefFlow V1.
- Sandboxing and basic hardening.
  - Both runtimes document isolation and guardrails. The question is not whether Hermes can be sandboxed. The question is whether another runtime is worth supervising.

Official docs checked:

- OpenClaw overview: <https://docs.openclaw.ai/index>
- OpenClaw cron: <https://docs.openclaw.ai/automation/cron-jobs>
- OpenClaw sub-agents: <https://docs.openclaw.ai/tools/subagents>
- OpenClaw hooks: <https://docs.openclaw.ai/automation/hooks>
- OpenClaw webhooks plugin: <https://docs.openclaw.ai/plugins/webhooks>
- OpenClaw MCP: <https://docs.openclaw.ai/cli/mcp>
- OpenClaw health: <https://docs.openclaw.ai/gateway/health>
- Hermes hooks: <https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks/>
- Hermes cron: <https://hermes-agent.nousresearch.com/docs/user-guide/features/cron/>
- Hermes webhooks: <https://hermes-agent.nousresearch.com/docs/user-guide/messaging/webhooks/>
- Hermes MCP: <https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp>

## Blunt Recommendation

Do not deploy Hermes for ChefFlow V1.

Reason: the only clearly material deltas are Hermes' learning loop, wider execution backends, and API surface. None of those improve ChefFlow's current bottleneck, which is trustworthy internal data flow and safe review, not missing agent-runtime primitives. OpenClaw already covers the primitives ChefFlow would actually use, and the repo already has the OpenClaw health, sync, quarantine, and admin surfaces needed to supervise that data engine. `project-map/infrastructure/openclaw.md:25-39`, `app/(admin)/admin/openclaw/health/page.tsx:21-27`, `lib/admin/openclaw-health-actions.ts:383-537`

Adding Hermes now mostly adds:

- a second autonomous runtime to supervise
- a second persistent memory store
- another place for secrets, sessions, and logs
- another path to unsafe drift away from ChefFlow's single-endpoint, human-commit AI policy

That is not enough value.

## Should Hermes Run On The Daily PC

No.

Hermes local mode inherits the same filesystem access as the user account, and Hermes docs explicitly say to use Docker or another isolated backend when you need sandboxing. OpenClaw's own security docs say a shared agent should run on a dedicated machine, VM, or container, with a dedicated OS user and without personal browser or account profiles. That matches the repo's safety posture. `CLAUDE.md:61-63`, `docs/AI_POLICY.md:5-10`, `docs/AI_POLICY.md:124-175`

If Hermes is ever tested, it should not live on the daily PC as a resident local-backend runtime. The minimum acceptable shape would be an isolated container or remote backend with a dedicated account, a dedicated workspace, and no access to personal browser profiles or canonical ChefFlow state.

Official docs:

- Hermes config, local vs Docker vs SSH: <https://hermes-agent.nousresearch.com/docs/user-guide/configuration>
- OpenClaw security: <https://docs.openclaw.ai/gateway/security>

## Can The Raspberry Pi Safely Host Both

Capacity: yes.

Safety today: no.

The Pi has enough headroom on CPU, RAM, and disk. `docs/research/raspberry-pi-full-audit.md:15-24`

But the Pi is already carrying:

- OpenClaw price intelligence
- an existing OpenClaw AI swarm
- Docker sandboxes
- Ollama
- several unresolved security and hygiene issues

`docs/research/raspberry-pi-full-audit.md:9`, `docs/research/raspberry-pi-full-audit.md:30-39`, `docs/research/raspberry-pi-full-audit.md:61-68`, `docs/research/raspberry-pi-full-audit.md:367-390`

So the correct answer is:

- The Pi can physically host both.
- It should not host both under the current posture.
- If Hermes is ever piloted on the Pi, it must be isolated as its own container or backend, use a separate OS user and secret set, avoid personal identities, and stay read-only against ChefFlow and OpenClaw canonical state.

## Can Hermes And OpenClaw Interact Directly

Yes, but only some paths are worth using.

### MCP

Yes.

- Hermes can consume local stdio and remote HTTP MCP servers.
- Hermes can also serve as an MCP server.
- OpenClaw can serve as an MCP server and also keeps outbound MCP server definitions for runtimes that consume MCP later.

That means MCP can work Hermes -> OpenClaw, and likely OpenClaw -> Hermes, if you deliberately configure it.

Official docs:

- Hermes MCP: <https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp>
- OpenClaw MCP: <https://docs.openclaw.ai/cli/mcp>

### Webhooks

Yes.

- Hermes webhook routes receive external events and expose a webhook `/health` endpoint.
- OpenClaw has cron webhook hooks under `/hooks/*` and a Webhooks plugin with authenticated `/plugins/webhooks/*` routes.

Official docs:

- Hermes webhooks: <https://hermes-agent.nousresearch.com/docs/user-guide/messaging/webhooks/>
- OpenClaw cron hooks: <https://docs.openclaw.ai/automation/cron-jobs>
- OpenClaw Webhooks plugin: <https://docs.openclaw.ai/plugins/webhooks>

### API

Yes, asymmetrically.

- Hermes explicitly exposes an OpenAI-compatible API, runs API, jobs API, and health endpoints.
- OpenClaw explicitly exposes a gateway protocol and operator/plugin HTTP surfaces. The local ChefFlow repo also already talks to Pi HTTP endpoints for price sync and status. `docs/openclaw-price-intelligence.md:106-122`, `app/api/openclaw/status/route.ts:14-55`

### Local scripts

Yes.

Both runtimes support hook/script execution. The repo already has local sync scripts and Pi pull scripts around OpenClaw. `scripts/openclaw-pull/sync-all.mjs:376-479`, `scripts/run-openclaw-sync.mjs:95-329`

### Queues

Not as a shared built-in primitive.

OpenClaw has TaskFlow/background-task queues. Hermes has jobs/cron. There is no documented shared cross-runtime queue between them out of the box. If you want a common queue, you would need to add one deliberately. Do not assume one exists.

### Files

Yes, technically.

Both runtimes persist local files. Hermes documents `~/.hermes/` memory, skills, sessions, cron, and logs. OpenClaw persists workspace, memory, and cron/task state. But file-based coupling is the wrong default for ChefFlow V1 because it creates opaque state spread and brittle repair paths. Use only for human-readable exports, not for canonical cross-runtime coordination.

### Health endpoints

Yes, for observation only.

- Hermes exposes `/health` and `/health/detailed`.
- OpenClaw exposes health/status surfaces, and the repo already projects OpenClaw runtime health into `/api/openclaw/status` plus `/admin/openclaw/health`. `app/api/openclaw/status/route.ts:14-55`, `lib/openclaw/health-contract.ts:388-569`

## Should They Know About Each Other And Repair Each Other

No, not as peers, and not with two-way repair.

Safe pattern if Hermes is ever piloted:

- OpenClaw exposes read-only health, sync, and event surfaces.
- Hermes may read those surfaces and draft an ops summary, incident note, or suggested runbook step.
- A human uses the existing OpenClaw admin surfaces or scripts to perform the repair.

Unsafe pattern, reject it:

- Hermes writes directly into ChefFlow DB tables.
- Hermes writes directly into OpenClaw canonical tables.
- OpenClaw spawns or steers Hermes to self-repair Hermes, or vice versa.
- Either runtime auto-restarts or mutates the other based on LLM judgment alone.

That violates both the repo AI policy and the "AI never owns truth / canonical state" boundary. `docs/AI_POLICY.md:5-10`, `docs/AI_POLICY.md:49-65`, `docs/AI_POLICY.md:83-110`, `docs/AI_POLICY.md:124-175`

## Recommended Target Architecture For ChefFlow V1

### OpenClaw stays responsible for

- collection, scraping, crawling, ingestion
- source normalization and catalog mirroring
- price enrichment and anomaly/quarantine production
- Pi-side runtime health, sync wrapper state, and cartridge feeds

Repo proof:

- `docs/product-blueprint.md:307-316`
- `docs/openclaw-price-intelligence.md:7-9`
- `scripts/openclaw-pull/sync-all.mjs:4-13`

### ChefFlow stays responsible for

- all public and chef-facing UI
- admin review of quarantined price facts
- canonical DB writes
- pricing resolution, cost propagation, and downstream business logic
- truthful health presentation inside ChefFlow

Repo proof:

- `project-map/infrastructure/openclaw.md:17-31`
- `lib/admin/openclaw-health-actions.ts:203-352`
- `scripts/run-openclaw-sync.mjs:202-323`

### Hermes, if ever adopted later, should be limited to

- read-only ops intelligence over OpenClaw status and logs
- incident summarization
- runbook drafting
- optional non-canonical maintenance notes written to markdown or chat

Hermes should not own:

- scraping
- source-of-truth pricing rows
- ChefFlow DB mutation
- financial, lifecycle, or identity state
- any public or chef-facing product surface

## Single Best First Hermes Pilot

Do not deploy Hermes yet.

If this decision is revisited later, the only pilot worth testing is:

- a read-only OpenClaw ops analyst that consumes runtime health, sync audit, and Pi status, then writes a markdown incident summary or posts an internal operator alert

Anything broader is unjustified today.

## Risks And Kill Criteria

Kill the idea immediately if any pilot needs one of these:

- write access to ChefFlow canonical tables
- write access to OpenClaw canonical tables
- customer-facing or chef-facing surface area
- the daily PC local backend
- personal browser/profile/account reuse
- a second model/provider path outside the single Ollama-compatible endpoint expected by ChefFlow policy
- autonomous repair loops instead of draft-only ops help
- a new queue or state store that operators will not actively supervise

Operational kill criteria:

- Pi security hygiene remains unresolved
- Hermes causes measurable Pi contention or instability
- Hermes produces advice that operators do not act on
- Hermes duplicates existing OpenClaw cron, hooks, or sub-agent behavior without materially reducing toil

## Exact Repo Changes To Make First

1. Create `docs/research/2026-04-23-hermes-vs-openclaw-decision-memo.md`
2. Update `project-map/infrastructure/openclaw.md` with the V1 Hermes posture and a pointer to this memo
3. Do not touch `docs/product-blueprint.md` in this change set because it is already dirty in the worktree and the decision is better captured first as infrastructure policy plus research evidence

## Official Docs Checked On 2026-04-23

- Hermes home: <https://hermes-agent.nousresearch.com/docs/>
- Hermes quickstart: <https://hermes-agent.nousresearch.com/docs/getting-started/quickstart/>
- Hermes configuration: <https://hermes-agent.nousresearch.com/docs/user-guide/configuration>
- Hermes MCP: <https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp>
- Hermes hooks: <https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks/>
- Hermes cron: <https://hermes-agent.nousresearch.com/docs/user-guide/features/cron/>
- Hermes webhooks: <https://hermes-agent.nousresearch.com/docs/user-guide/messaging/webhooks/>
- Hermes API server: <https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server>
- OpenClaw overview: <https://docs.openclaw.ai/index>
- OpenClaw MCP: <https://docs.openclaw.ai/cli/mcp>
- OpenClaw hooks: <https://docs.openclaw.ai/automation/hooks>
- OpenClaw cron: <https://docs.openclaw.ai/automation/cron-jobs>
- OpenClaw sub-agents: <https://docs.openclaw.ai/tools/subagents>
- OpenClaw Webhooks plugin: <https://docs.openclaw.ai/plugins/webhooks>
- OpenClaw security: <https://docs.openclaw.ai/gateway/security>
- OpenClaw health: <https://docs.openclaw.ai/gateway/health>
