# Builder Docket Runtime Ownership Map

Date: 2026-04-03
Status: builder-facing supplemental docket
Purpose: give future builder work one clear way to sort the backlog by ownership before implementation starts, so unrelated tasks do not get mixed together just because they live near each other in the repo

Tags: `#builder-handoff` `#planning` `#openclaw` `#raspberry-pi` `#website` `#ownership`

---

## Why This Exists

The current planning stack already answers:

- what the active builder-start entrypoint is
- what the next verified spec is
- what the website thread should read
- what OpenClaw must never become

What it does **not** answer in one place is the simpler operational question:

> when the builder takes on a task, which machine and which ownership boundary does that task actually belong to?

That gap matters because the backlog is not one pile.

It is at least three different piles:

1. ChefFlow website and repo work on the local PC
2. OpenClaw runtime and data-pipeline work
3. Raspberry Pi host and ops work

And some tasks are not purely one of those. They are bridge tasks between them.

This document is the sorter.

It is **not** a replacement for:

- `docs/build-state.md`
- `docs/research/current-builder-start-handoff-2026-04-02.md`
- `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`
- `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`
- `docs/specs/openclaw-canonical-scope-and-sequence.md`

---

## Core Clarification

The three categories are real, but two of them overlap physically.

### 1. OpenClaw

OpenClaw is a **logical runtime and data system**.

It owns things like:

- capture
- normalization
- enrichment
- sync preparation
- coverage/freshness logic
- internal intelligence jobs

It mostly lives on the Raspberry Pi today, but it is not the same thing as the Raspberry Pi.

### 2. Raspberry Pi

The Raspberry Pi is the **host and operations surface**.

It owns things like:

- process supervision
- cron
- service startup
- disk and RAM constraints
- Playwright sentinel scheduling
- SSH deployment and health checks

The Pi hosts OpenClaw, but also hosts non-OpenClaw operational jobs such as sentinel QA.

### 3. Local PC / ChefFlow Repo / Website

The local PC and this repo are the **product, application, and planning surface**.

They own things like:

- Next.js routes
- UI and copy
- database migrations
- product logic
- docs/specs/research
- local dev, beta, and prod deployment scripts

This is the place where ChefFlow presents outcomes to users.

---

## The Four Lanes

The cleanest way to hand work to a builder is to treat the backlog as four lanes, not three.

| Lane            | Primary ownership               | Where the work mostly happens                 | Typical files/surfaces                                                                                                                                     | What belongs here                                                                         | What does **not** belong here                                                             |
| --------------- | ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `website-owned` | ChefFlow product                | local PC / repo                               | `app/*`, `components/*`, `lib/*`, `docs/specs/*`                                                                                                           | UX, product flows, copy, routes, schema, tests, docs, website truth                       | Pi process changes, cron wiring, raw runtime scraping logic                               |
| `runtime-owned` | OpenClaw                        | mostly Pi runtime, sometimes mirrored locally | `lib/openclaw/*`, `scripts/openclaw-*`, `scripts/openclaw-pull/*`, `.openclaw-build/*`                                                                     | data capture, normalization, sync logic, coverage/freshness, price intelligence internals | public UI promises, chef-facing branding, host-level ops                                  |
| `host-owned`    | Raspberry Pi ops                | Pi machine / SSH / cron / services            | `scripts/sentinel/*`, Pi cron, systemd, watchdog, env, logs                                                                                                | service management, health, automation schedules, deploy/setup, resource stability        | product copy, schema design, chef-facing UX                                               |
| `bridge-owned`  | ChefFlow <-> OpenClaw handshake | both                                          | `app/api/cron/openclaw-sync/route.ts`, `app/api/cron/price-sync/route.ts`, `app/api/sentinel/*`, `lib/openclaw/sync.ts`, `app/api/openclaw/image/route.ts` | contracts, secret-gated syncs, mirror reads, safe presentation boundaries                 | new standalone product surfaces without a website spec, or Pi changes without a host plan |

If a task cannot be assigned to one of those lanes, it is still underspecified.

---

## Current Docket Snapshot

This is the practical builder-facing split right now.

### Lane 1: `website-owned`

This is the active lane today.

Current repo truth:

- the active builder-start handoff now routes builders through the build-state -> builder-start -> control-tower chain
- absent explicit reassignment, the default current execution chain is now built-verification debt first, then the narrow production-hardening specs, then the control-tower continuity queue
- the recorded repo-wide baseline is green, but tied to a dirty checkout
- the website/public-product side already has a canonical execution map

Current work in this lane:

- built-but-unverified verification queue work
- automated database backup hardening
- request correlation and observability wiring
- public trust and continuity work
- dietary trust alignment
- cost propagation and vendor-facing continuity on ChefFlow surfaces
- dead-zone gating, surface honesty, and route consolidation
- demo continuity and portal proof when explicitly prioritized

Primary documents:

- `docs/build-state.md`
- `docs/research/current-builder-start-handoff-2026-04-02.md`
- `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`
- `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`
- `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`

Do not let this lane:

- rebuild OpenClaw itself
- mutate Pi ops casually
- expose OpenClaw branding in public or chef-facing product surfaces

### Lane 2: `runtime-owned`

This is OpenClaw's actual mission lane.

Current repo truth:

- OpenClaw is internal infrastructure, not a public product
- the current P0 mission is still grocery, ingredient, store, and price-data foundation
- runtime expansion is allowed only inside strict boundary and honesty rules

Current work in this lane:

- capture and ingestion
- cleanup, normalization, deduplication
- price intelligence quality
- sync preparation
- coverage and freshness truth
- image and metadata enrichment
- directory and pricing data support where the website consumes the result safely

Known runtime-shaped open issues already visible in repo docs:

- price unit inconsistency
- wholesale distortion in "best price"
- unscheduled direct scrapers
- stale or non-canonical refresh cadence assumptions
- coverage and completeness gaps

Primary documents:

- `docs/specs/openclaw-canonical-scope-and-sequence.md`
- `docs/specs/openclaw-non-goals-and-never-do-rules.md`
- `docs/specs/openclaw-internal-only-boundary-and-debranding.md`
- `docs/openclaw-data-pipeline.md`
- `lib/openclaw/developer-usage-map.ts`

Do not let this lane:

- become a public feature roadmap
- own ChefFlow workflow UX
- drift into host-level ops without explicitly classifying the task as `host-owned`

### Lane 3: `host-owned`

This is the Raspberry Pi operations lane.

Current repo truth:

- the Pi hosts the OpenClaw runtime
- the Pi also hosts sentinel-style operational QA
- some important host concerns are still operational debt rather than product work

Current work in this lane:

- cron schedules
- service restarts and watchdog behavior
- systemd adoption where appropriate
- Playwright sentinel setup and deployment
- health checks
- resource limits, logs, and resilience
- dependency install on ARM64 where scrapers or browsers require it

Concrete examples already in repo:

- `scripts/sentinel/setup-pi.sh`
- `scripts/sentinel/deploy-to-pi.sh`
- `docs/sentinel-testing.md`
- sync-api startup mode versus systemd
- watchdog freshness checks

Do not let this lane:

- rewrite product behavior
- ship chef-facing copy changes
- quietly change runtime ownership rules

### Lane 4: `bridge-owned`

This is the lane that will create the most confusion if it is not called out explicitly.

A bridge task is any task where:

- OpenClaw produces something
- ChefFlow consumes or presents it
- the Pi hosts or schedules the exchange

Current bridge work includes:

- price sync contracts
- catalog mirror reads
- refresh status surfacing
- sentinel status endpoints
- image proxying
- vendor import handoffs
- any chef-safe or admin-safe representation of runtime outputs

Primary code surfaces:

- `app/api/cron/openclaw-sync/route.ts`
- `app/api/cron/price-sync/route.ts`
- `app/api/cron/openclaw-polish/route.ts`
- `app/api/sentinel/auth/route.ts`
- `app/api/sentinel/sync-status/route.ts`
- `lib/openclaw/sync.ts`
- `app/api/openclaw/image/route.ts`

Bridge rule:

If a task changes both the producer and the consumer, split it into two sub-tasks whenever possible:

1. producer/runtime change
2. consumer/website or consumer/admin change

That keeps verification and rollback sane.

---

## Simple Admission Rollup

This is the shortest current answer when someone asks:

> what actually gets into the current builder docket, and what does not?

Use this as an admission filter, not as a replacement for sequencing.

- `gets in now` means the item belongs in the current builder-admissible execution set
- `does not get in now` means the item should not be pulled into the default active queue without prerequisite closure or explicit reassignment
- this does **not** replace queue sequencing from the current builder-start handoff; verification debt still comes first unless the developer explicitly redirects the builder elsewhere

### Gets In Now (10)

1. `Built-but-unverified implementation debt` - `default next step`; verification work belongs in the current docket because already-built code is still active product risk until checked.
2. `Production resilience and observability hardening` - `ready-spec`; the database-backup and request-correlation specs are current builder-ready work that improve the whole system without widening product surface area.
3. `Public website trust and discovery baseline` - `verified-foundation`; current website work may compose with this baseline now, but should not restart it.
4. `Public intake and source-to-close routing truth` - `verified-foundation`; intake, booking, inquiry, and trust-loop work belongs in the active queue only if it preserves the real funnel map.
5. `Inquiry safety and dietary continuity` - `ready-spec`; this is a current trust-and-safety build lane with a clear narrow spec.
6. `Costing truth, vendor propagation, and profitability loop` - `ready-spec`; this is a current continuity lane with real implementation packets already written.
7. `Dead zones and non-functional surfaces` - `ready-spec`; deceptive or degraded routes belong in the current cleanup docket because they distort product truth now.
8. `Redundant entry points and system sprawl` - `redundant-needs-consolidation`; already-specced consolidation slices may enter the queue now when the assigned problem matches them.
9. `Demo continuity and public-to-portal proof` - `ready-spec`; this is a legitimate current builder slice when the control tower reaches the proof/showcase phase or the developer explicitly redirects into it.
10. `Survey deploy verification` - `validation lane`; still admissible when explicitly assigned, but no longer the universal default queue owner.

### Does Not Get In Now (9)

1. `Survey public hardening and results scale` - blocked until deploy verification passes; it is next-after, not now.
2. `Build posture and builder-start constraints` - `verified-foundation`; this governs work selection, but is not itself an implementation target.
3. `Hidden, orphaned, and duplicate surfaces` - `validation-required`; this still needs candidate-by-candidate intent decisions rather than a broad cleanup pass.
4. `Chef shell calmness and guided hierarchy` - `verified-foundation`; protect it as baseline and only touch it when a specific follow-up slice is explicitly assigned.
5. `Assumption debt and user validation` - `validation-required`; this is evidence work, not default build execution.
6. `Platform intelligence and source-aware capture` - `long-horizon-in-progress`; keep it behind nearer trust, reliability, and validation obligations unless explicitly promoted.
7. `Competitor authenticated and support gap closure` - `blocked-on-evidence`; it stays out until real authenticated and support-behavior evidence exists.
8. `OpenClaw runtime/data lane` - separate execution lane; do not pull it into the default current builder lane unless explicitly assigned as `runtime-owned`.
9. `Raspberry Pi host/ops lane` - separate execution lane; do not pull it into the default current builder lane unless explicitly assigned as `host-owned`.
10. `ChefFlow/OpenClaw bridge lane` - separate execution lane; only admit it when a mixed producer-consumer contract change is explicitly assigned and classified as `bridge-owned`.

The count is intentional:

- `gets in now`: 10
- `does not get in now`: 9
- `total`: 19

---

## Builder Intake Rule

Before the builder starts, every task should be tagged like this:

```text
Task:
Primary lane: website-owned | runtime-owned | host-owned | bridge-owned
Secondary lane: optional
Runs on: local PC | Raspberry Pi | both
Primary truth source:
Verification surface:
No-touch boundary:
```

If any of those fields are missing, the task is not ready.

---

## Recommended Read Order By Lane

### For `website-owned`

1. `docs/build-state.md`
2. `docs/research/current-builder-start-handoff-2026-04-02.md`
3. `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`
4. `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`
5. the narrow implementation spec for the assigned slice

### For `runtime-owned`

1. `docs/build-state.md`
2. `docs/research/current-builder-start-handoff-2026-04-02.md`
3. `docs/research/current-openclaw-builder-start-handoff-2026-04-03.md`
4. `docs/research/openclaw-runtime-builder-handoff-2026-04-02.md`
5. `docs/specs/openclaw-canonical-scope-and-sequence.md`
6. `docs/specs/openclaw-non-goals-and-never-do-rules.md`
7. `docs/specs/openclaw-goal-governor-and-kpi-contract.md`
8. `docs/openclaw-data-pipeline.md`
9. the narrow runtime spec for the assigned slice

### For `host-owned`

1. `docs/openclaw-data-pipeline.md`
2. `docs/sentinel-testing.md`
3. `scripts/sentinel/setup-pi.sh`
4. `scripts/sentinel/deploy-to-pi.sh`
5. the narrow host or monitoring spec if one exists

### For `bridge-owned`

1. the runtime read stack
2. the website read stack
3. the exact contract files on both sides
4. the outward-facing presentation spec, if users will see any result

---

## Practical Sequencing Rule

When the backlog feels overwhelming, sort it in this order:

1. Is this the default current `website-owned` task named by the builder-start handoff, or an explicitly assigned website slice sequenced by the control tower?
2. If not, is it a `runtime-owned` data-foundation task that improves OpenClaw truth without expanding public promises?
3. If not, is it a `host-owned` stability task needed to keep the Pi reliable?
4. If not, is it a `bridge-owned` handshake task that should be split before implementation?

That keeps the builder from treating all backlog items as equal just because they are all "in the project."

---

## The Important Mental Model

The right builder model is not:

- one giant backlog

The right builder model is:

- one active product lane
- one internal runtime lane
- one host/ops lane
- one handshake lane between them

OpenClaw and Raspberry Pi are related, but they are not the same category.

ChefFlow website work depends on both of them, but it should not absorb both of them.

That distinction is the docket.
