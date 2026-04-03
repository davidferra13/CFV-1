# Spec: OpenClaw Canonical Scope and Sequence

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** small (1-2 files)

## Timeline

| Event         | Date                 | Agent/Session | Commit |
| ------------- | -------------------- | ------------- | ------ |
| Created       | 2026-04-01 00:20 EDT | Codex         |        |
| Status: ready | 2026-04-01 00:20 EDT | Codex         |        |

---

## Developer Notes

### Raw Signal

The developer clarified that OpenClaw is a developer tool on the Raspberry Pi, not something that should be in the public product. They explicitly said a public user should never be able to talk to OpenClaw, and that there should be no mention of OpenClaw on the website from the user standpoint.

They also made the current priority clear: OpenClaw is stuck to one main task right now because there is only one place to run it. That task is the grocery, ingredient, store, and pricing database ChefFlow needs to work. They do not want bloat, and they do not want a second machine or a public-facing OpenClaw role right now.

They gave full authority to split work into separate specs if that makes builder execution easier.

### Developer Intent

- **Core goal:** Lock a single canonical source of truth for what OpenClaw is, what it is not, and the order in which future work should happen.
- **Key constraints:** Spec-only in this phase. Do not touch product code. Do not touch Raspberry Pi runtime. Do not let older specs push builders toward public-facing or chef-facing OpenClaw exposure.
- **Motivation:** Without a scope lock, the repo already contains conflicting guidance that would leak OpenClaw into the product and dilute the current data-foundation priority.
- **Success from the developer's perspective:** Builders can follow one correct order, without bloat, without public exposure, and without inventing extra OpenClaw jobs.

---

## What This Does (Plain English)

This spec becomes the canonical policy for OpenClaw. It defines OpenClaw as internal-only infrastructure, makes the nationwide grocery and price-data foundation the current top priority, bans chef/public product exposure, and sets the build order for every related spec that follows.

---

## Why It Matters

Right now the repo contains specs pointing in different directions. Without a canonical order and boundary, a builder could easily implement the wrong thing next.

---

## Core Decisions

1. OpenClaw is internal infrastructure, not a product feature.
2. The Raspberry Pi setup remains untouched in this planning phase.
3. The current P0 OpenClaw mission is the grocery, ingredient, store, and price-data foundation ChefFlow needs to function.
4. Founder-only and internal admin surfaces may mention OpenClaw when operationally necessary.
5. Chef-facing and public-facing product surfaces must not mention OpenClaw by name.
6. Public users and ordinary product users must never talk directly to OpenClaw.
7. Raw OpenClaw outputs are not chef-facing product features.
8. Chef-facing price-data products are allowed when they are presented as ChefFlow outcomes rather than OpenClaw tooling.
9. A ChefFlow-branded market or price catalog is allowed if it is productized, neutral in language, and does not expose internal tool identity or raw-source review mechanics.
10. Raw OpenClaw lead browsing and import review are not part of the chef-facing prospecting product. They are deferred or moved to founder/admin-only internal surfaces later.
11. No second OpenClaw machine is justified right now.
12. Prospecting remains secondary until the data foundation and its reliability surfaces are stable.

---

## Current Priority Stack

This is the correct order.

### Phase 1: Scope Lock

- Lock internal-only boundary
- Lock naming and disclosure policy
- Reconcile conflicting specs

### Phase 2: Product Debranding

- Remove chef/public product references to OpenClaw
- Remove product routes and labels that expose OpenClaw by name
- Keep ChefFlow language outcome-focused

### Phase 3: Boundary Verification

- Verify there is no browser or public path that can directly talk to OpenClaw
- Keep cron and sync routes secret-gated
- Keep OpenClaw behind ChefFlow-owned storage and rules

### Phase 4: Data-Lane Reliability

- Improve data sync truth surfaces
- Improve coverage, freshness, normalization, and gap visibility
- Keep the focus on the grocery/ingredient/store/price system

### Phase 5: Optional Internal Expansion

- Internal-only lead review, if still useful later
- Internal-only operational dashboards
- Anything else only after the core data lane is stable

---

## What Is Required vs Noise

### Required Now

1. OpenClaw scope lock
2. OpenClaw internal-only boundary
3. Product debranding
4. Direct-access audit
5. Price-data foundation and its reliability

### Explicitly Not Required Now

1. A public or chef-facing OpenClaw lead browser
2. A second machine for OpenClaw
3. Outreach automation
4. More public research into Moltbook or hype-driven AI communities
5. A rename of every internal `openclaw` module or file
6. New dashboards that do not directly improve trust in the data lane

---

## Files to Create

None.

This is a canonical policy and sequencing spec.

---

## Files to Modify

| File                                                           | What to Change                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `docs/specs/openclaw-non-goals-and-never-do-rules.md`          | Add and maintain the explicit guardrail list for what OpenClaw must never do |
| `docs/specs/openclaw-internal-only-boundary-and-debranding.md` | Update the lead-flow decision so raw-source review is not kept chef-facing   |
| `docs/specs/lead-engine-cartridge.md`                          | Add a policy override so older chef-facing guidance is not followed          |
| `docs/specs/openclaw-data-completeness-engine.md`              | Ensure example user-facing copy follows the new no-OpenClaw naming rule      |
| `docs/specs/openclaw-developer-usage-page.md`                  | Point the internal usage-map spec at this canonical policy                   |

---

## Database Changes

None.

This spec does not authorize schema work.

---

## Data Model

The important model is operational, not relational:

- **Internal OpenClaw layer:** Pi runtime, scrapers, cartridges, sync internals, internal admin knowledge
- **ChefFlow system layer:** storage, rules, application logic, vetted product behavior
- **User-facing layer:** ChefFlow outcomes only, with no OpenClaw naming or direct access

---

## Server Actions

None.

This spec does not authorize or require any code-path changes directly. It only defines what later implementation specs are allowed to do.

---

## UI / Component Spec

This spec defines policy for future UI work:

1. Founder-only internal surfaces may say `OpenClaw`.
2. Chef-facing and public-facing surfaces may not say `OpenClaw`.
3. Productized price-data experiences, including a market or price catalog, are allowed on chef-facing surfaces if they are ChefFlow-branded and outcome-focused.
4. Raw-source review interfaces belong off the chef-facing product surface.
5. Product copy must explain outcomes such as price coverage, freshness, store data, and synced market data without exposing tool names.

---

## Edge Cases and Error Handling

| Scenario                                                                               | Correct Behavior                    |
| -------------------------------------------------------------------------------------- | ----------------------------------- |
| Older spec tells builder to expose OpenClaw in chef-facing UI                          | This spec overrides it              |
| Builder wants to create a neutral chef-facing replacement for raw OpenClaw lead review | Do not do that under this policy    |
| Founder-only internal page needs to explain OpenClaw                                   | Allowed                             |
| Internal modules still use `openclaw` in filenames or symbols                          | Allowed for now if not user-visible |
| Product needs to communicate missing data or sync lag                                  | Use neutral ChefFlow language only  |

---

## Verification Steps

1. Read this spec first before any OpenClaw-related implementation work.
2. Confirm the current highest-priority OpenClaw mission is the price-data foundation.
3. Confirm founder-only/internal surfaces are the only allowed places for OpenClaw naming.
4. Confirm chef-facing raw-source lead browsing is not part of the approved product scope.
5. Confirm the boundary and debranding spec reflects this same decision.
6. Confirm any older conflicting specs carry an override note or updated guidance.

---

## Out of Scope

- Product code changes
- Raspberry Pi changes
- Database migrations
- Network/infrastructure redesign
- Public-facing OpenClaw features
- A second OpenClaw machine

---

## Notes for Builder Agent

1. This is the first spec to read before using any other OpenClaw-related spec.
2. If a more detailed spec conflicts with this one, this one wins.
3. The current mission is narrow on purpose. Do not expand OpenClaw because a feature seems possible.
4. The right next implementation work, when implementation is allowed, is debranding and boundary cleanup, not more exposure.
5. Read `openclaw-non-goals-and-never-do-rules.md` immediately after this file when the task is runtime expansion or boundary-sensitive design.
