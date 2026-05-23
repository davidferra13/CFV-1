---
name: cohesion-closure-audit
description: Audits whether a ChefFlow domain, feature family, route cluster, workflow, or product graph has every meaningful node discovered, defined, classified, connected, pingable, permissioned, observable, and actionable. Use when the user asks whether all nodes exist, whether the graph is fully cohesive, whether no stones are left unturned, what a feature unlocks, what remains undefined, or whether a system has complete capability graph closure regardless of build status.
---

# Cohesion Closure Audit

## Mission

Find graph closure, not feature completion.

This skill asks:

> For the selected ChefFlow domain or product graph, does every meaningful node exist in the map, have a definition, have a status, have classified relationships, have a way to be reached or tested, and have a next action if incomplete?

A node does not need to be built. It must be known, classified, connected, and actionable.

## When To Use

Use this when the user asks about:

- Whether all nodes exist, are defined, are connected, or are pingable.
- Full cohesiveness, no stone left unturned, graph closure, or capability compounding.
- What one feature unlocks in adjacent domains.
- Whether a product area has orphaned surfaces, dangling edges, duplicated concepts, or undefined opportunities.
- Turning a broad feature family into queue-ready missing-node work.

Do not use this for narrow closeout of an already-defined implementation scope; use `completion-gate` for that. Do not use it for ordinary wiring checks on built surfaces; use `wiring-audit` or `cohesion-control-loop`.

## Hard Terms

`meaningful node`: anything inside the selected scope that can change a product decision, user outcome, system state, permission boundary, data contract, proof requirement, workflow path, automation, or future build option.

Include a node when at least one is true:

- A user, agent, route, action, job, API, query, test, document, or automation can interact with it.
- It stores, derives, exposes, hides, protects, transforms, or deletes information.
- It creates a status, lifecycle state, failure state, recovery path, handoff, or decision point.
- It is promised by a UI, spec, queue item, proof pack, domain contract, navigation entry, rail, dashboard, command surface, Remy behavior, or CIL signal.
- It unlocks, blocks, duplicates, contradicts, or deprecates another node.
- If it is undefined, the team could build the wrong thing, leak data, miss a required action, strand a user, or keep re-asking the same question.

Exclude a node when all are true:

- It is decorative, incidental implementation detail, temporary wording, or local code structure with no product, data, security, workflow, proof, or future-build consequence.
- It has no independent owner, state, decision, edge, proof requirement, or user/system behavior.
- Removing it from the graph would not change what gets built, queued, rejected, tested, permissioned, documented, or verified.

`pingable`: a node has at least one concrete, repeatable way for an agent, user, test, or system to touch it and determine its current state without relying on memory.

Valid ping paths include:

- Browser route, page check, modal/action check, command palette entry, nav entry, rail item, dashboard card, or lifecycle surface.
- Unit, integration, e2e, smoke, contract, auth, tenant-scope, or migration test.
- API call, server action invocation, database query, script, job trigger, webhook event, queue operation, or log/audit lookup.
- Proof pack, screenshot, runtime trace, analytics event, fixture, seed record, or documented manual verification step tied to a concrete surface.

Pingability is not satisfied by a vague plan, visual presence alone, stale proof, unreachable code, undocumented memory, or a route/action that cannot verify state, permissions, or behavior.

## Closure Standard

For every meaningful node in scope, classify:

- `exists`: built, documented, queued, inferred, missing, duplicate, obsolete, rejected, or unknown.
- `definition`: purpose, user, owner, source of truth, inputs, outputs, success condition.
- `status`: built, partial, stub, missing, blocked, deferred, rejected, duplicate, obsolete, unknown.
- `edges`: upstream dependencies, downstream consumers, adjacent features, data relationships, UI entry points, automation hooks, intelligence links.
- `edge status`: required, optional, future, rejected, risky, blocked, duplicate, unknown.
- `pingability`: route, test, API call, server action, query, event, script, browser check, proof pack, or manual inspection that can touch it.
- `discoverability`: nav, command palette, dashboard, rail, search, route map, queue, docs, index, or agent handoff.
- `permissions`: role, tenant, privacy, PII, chef/client/admin/staff/partner boundary, and data visibility.
- `observability`: logs, errors, runtime proof, tests, screenshots, telemetry, proof packs, audit trails, or known lack of proof.
- `composability`: what this node unlocks, what it consumes, what can consume it, and which future nodes are now possible.
- `lifecycle`: create, read, update, complete, fail, recover, archive, re-open, delete, or intentionally not applicable.
- `next action`: build, wire, document, test, queue, split, merge, retire, defer, reject, or investigate.

Unknown is allowed during discovery. Lingering unknown is not closure.

## Node Types

Include any node type relevant to the scope:

- Page routes, API routes, server actions, background jobs, scripts, tests, components, command surfaces, nav entries, rail entries, dashboard widgets, modals, settings, notifications, automations, Remy behaviors, CIL signals, database tables, domain contracts, proof packs, queue items, docs, lifecycle states, failure states, privacy boundaries, and user decisions.

## Practical Question Bank

Use these questions to keep discovering practical nodes and edges that have not been asked about yet.

Existence:

- What nodes are implied by this feature but not named yet?
- What user states does this feature create?
- What failure states does this feature create?
- What in-between states exist between start and done?
- What hidden objects does the system need to remember?

Definition:

- Who owns this node: chef, client, staff, admin, Remy, or system?
- What is the source of truth?
- What does this node accept as input?
- What does it output?
- What would make this node obsolete?

Connection:

- What should this node feed into automatically?
- What should feed into this node automatically?
- What other surfaces should know this happened?
- What happens if the adjacent node is missing?
- Is this connection required, optional, future, or rejected?

Pingability:

- Can an agent open it, query it, test it, trigger it, or see proof that it changed state?
- Can an agent find it without human memory?
- What is the smallest route, action, query, script, or test that proves this node is alive?

Discoverability:

- Where would a chef naturally look for this?
- Where would a client naturally look for this?
- Should it appear in nav, rail, dashboard, search, command palette, lifecycle, docs, or queue?
- Is it buried behind one route only?
- Can it be reached from both problem and opportunity contexts?

Composability:

- Now that this exists, what becomes possible?
- What becomes easier?
- What becomes dangerous?
- What becomes redundant?
- What future node should be explicitly rejected so it stops lingering as ambiguous scope?

Privacy and permission:

- Who is allowed to know this exists?
- Who can read it, change it, or act on it?
- What private context should never leak into a shared surface?
- Does Remy see more than the user sees?

Lifecycle:

- How is it created, updated, failed, recovered, archived, re-opened, or deleted?
- What happens when the related event, client, menu, quote, payment, message, or task is deleted?
- Does this node need history, audit trail, undo, retention, or expiry?

Cohesion:

- Does the same thing have the same name and status everywhere?
- Does one surface promise an action that another surface cannot fulfill?
- Is anything visually present but behaviorally fake?
- Is there a built node with no reason to exist?

Next action:

- Is the correct next move build, wire, document, test, queue, reject, defer, split, merge, or investigate?
- What is the smallest proof that would settle this node?
- What is the smallest closure batch?
- What can be safely ignored because it is now defined as not required?

Meta-question:

> If this node is real, what must the rest of ChefFlow now know, remember, protect, expose, trigger, or intentionally refuse to do because of it?

## Audit Flow

1. Define the scope boundary and the product promise.
2. Read `AGENTS.md` and route through `.claude/skills/omninet/SKILL.md` when present.
3. Run `git status --short` before implementation or durable file edits.
4. Gather only directly relevant code, docs, queue items, proof packs, routes, tests, and prior audits.
5. Build the node inventory from explicit artifacts first, then infer likely missing nodes from domain logic.
6. Classify every node and edge using the closure standard.
7. Flag orphan nodes, dangling edges, hidden duplicates, undefined lifecycle states, privacy gaps, proof gaps, and dead-end opportunities.
8. Separate mandatory closure gaps from optional expansion.
9. Convert unresolved mandatory gaps into queue-ready work unless the user explicitly authorized direct implementation.

## Mandatory Gap Rules

Treat a gap as mandatory when the graph cannot honestly be called closed without it:

- A meaningful node is missing from the map.
- A node exists but has no definition, owner, source of truth, or status.
- A required edge is unknown, broken, fake, one-sided, or undocumented.
- A node is not pingable by route, test, API, script, query, proof, or explicit manual check.
- A node exposes or depends on tenant, role, privacy, or PII behavior without a documented boundary.
- A built surface has no discoverable entry point, consumer, lifecycle, or reason to exist.
- Two nodes represent the same concept with conflicting names, status, ownership, or behavior.
- A future opportunity is implied by current work but has not been accepted, rejected, deferred, or queued.

Optional expansion belongs under `Defined But Not Required`, not in the mandatory batch.

## Output Format

```md
**Scope**
Domain, feature family, workflow, route cluster, or product graph being audited.

**Closure Verdict**
closed | mostly closed | mapped but not closed | fragmented | cannot prove

**Node Inventory**
Known nodes with type, status, definition quality, owner/source, and pingability.

**Edge Inventory**
Required, optional, future, rejected, blocked, duplicate, and unknown edges.

**Closure Gaps**
Missing, undefined, unpingable, undiscoverable, unpermissioned, unobservable, orphaned, dangling, duplicate, or lifecycle-incomplete nodes.

**Composability Map**
What existing nodes now unlock, what should consume them, what they can consume, and what opportunities are explicitly rejected or deferred.

**Privacy And Permission Gaps**
Tenant, role, auth, PII, visibility, and sensitive-boundary issues.

**Proof Gaps**
Runtime, test, route, script, browser, log, screenshot, or proof-pack evidence still missing.

**Defined But Not Required**
Useful opportunities that are now known but are not mandatory for closure.

**Smallest Closure Batch**
Queue-ready mandatory work with acceptance criteria and verification.
```

## Hard Stops

- Do not mark a graph closed while live nodes or required edges remain `unknown`.
- Do not require every possible opportunity to be built.
- Do not confuse a defined rejection with a missing node.
- Do not edit app code unless the user explicitly authorizes implementation under ChefFlow queue rules.
- Do not treat a visual UI surface as pingable unless an action, route, query, test, or runtime check can prove it works.
