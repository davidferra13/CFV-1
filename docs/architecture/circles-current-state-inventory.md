# Circles Current State Inventory

> **Status:** draft
> **Created:** 2026-05-15
> **Purpose:** Ground the Circles primitive build in existing code before firing app-code work.
> **Related queue item:** `BQ-20260515T173051Z-circles-current-state-inventory`

## Executive Summary

ChefFlow already has a substantial Circle substrate. The right next move is not to invent a new collaboration system. The next move is to consolidate the existing Hub/Dinner Circle/Crew Circle implementation around a universal Circle primitive: portals own private/canonical work; Circles own shared relationship coordination.

The implementation is strong but fragmented. `hub_groups` is already the shared container, `/hub/g/[groupToken]` is already a token-access shared workspace, `/circles` is already a chef control surface, and `lib/hub/circle-access-policy.ts` is already a seed for permissions. The main risks are taxonomy drift, public token overreach, portal/Circle naming confusion, and duplicated source-of-truth logic.

The policy target for fixing taxonomy and access drift is `docs/architecture/circles-policy-matrix.md`.

## Built Primitives

### Data And Identity

| Primitive           | Current location                     | Notes                                                                                                                                      |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Circle container    | `hub_groups`                         | Stores `group_type`, `event_id`, `inquiry_id`, `tenant_id`, `group_token`, `visibility`, open-table metadata, denormalized message fields. |
| Membership          | `hub_group_members`                  | Stores member role, post/invite/pin permissions, notification prefs, read state, co-host state.                                            |
| Profile identity    | `hub_guest_profiles`                 | Token/profile identity plus dietary, allergies, dislikes, favorites, client linkage.                                                       |
| Messages            | `hub_messages`                       | Shared message store with source, message type, lifecycle notification type, action URL/label, threading.                                  |
| Event Circle config | `event_share_settings.circle_config` | Event-specific Dinner Circle projection via `DinnerCircleConfig`. This is not the Circle identity table.                                   |

### Core Modules

| Module                               | Current role                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `lib/hub/types.ts`                   | Hub/Circle types. Current `group_type` union does not include every live value such as `crew`.      |
| `lib/hub/group-actions.ts`           | Low-level group creation, token lookup, join, member actions.                                       |
| `lib/hub/circle-access-policy.ts`    | Central permission logic seed. Should become policy source for type/linked-object capability rules. |
| `lib/hub/chef-circle-actions.ts`     | Chef `/circles` data, pipeline enrichment, unread/member counts.                                    |
| `lib/hub/circle-detail-actions.ts`   | Chef Circle detail data.                                                                            |
| `lib/hub/inquiry-circle-actions.ts`  | Inquiry Circle creation/token lookup.                                                               |
| `lib/hub/circle-first-notify.ts`     | Circle-first business notifications with email fallback/bridging.                                   |
| `lib/hub/circle-lifecycle-hooks.ts`  | Event lifecycle Circle messages.                                                                    |
| `lib/hub/email-to-circle.ts`         | Inbound email-to-Circle message bridge.                                                             |
| `lib/hub/crew-circle-actions.ts`     | Crew Circle creation/membership for event staff. Inserts `group_type = 'crew'` directly.            |
| `lib/dinner-circles/event-circle.ts` | Dinner Circle event snapshot/readiness computation.                                                 |
| `lib/dinner-circles/types.ts`        | `DinnerCircleConfig` and `DinnerCircleSnapshot`.                                                    |

### Routes

| Route                         | Role/access                          | Current purpose                                                                                                 |
| ----------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `/circles`                    | Chef protected                       | Chef Circles dashboard/command surface.                                                                         |
| `/circles/[id]`               | Chef protected                       | Chef Circle detail.                                                                                             |
| `/circles/admin`              | Chef/admin-adjacent historical route | Needs policy review against current route policy.                                                               |
| `/hub/g/[groupToken]`         | Public token                         | Shared Circle workspace. Token grants guest-level view; profile token grants member identity/write permissions. |
| `/hub/join/[groupToken]`      | Public token                         | Join flow.                                                                                                      |
| `/hub/circles`                | Public                               | Community/open Circle discovery.                                                                                |
| `/admin/hub`                  | Admin protected                      | Dinner Circle compliance and hub admin.                                                                         |
| `/admin/hub/groups/[groupId]` | Admin protected                      | Group transcript/detail inspection.                                                                             |

### User-Facing Components

| Component/path                                       | Current purpose                                                                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` | Dense shared workspace: dashboard, chat, private, meals, members, photos, plan, events, schedule, notes, search, settings. |
| `components/hub/circles-page-tabs.tsx`               | Chef Circles dashboard tabs.                                                                                               |
| `components/hub/circles-command-briefing.tsx`        | Chef command briefing for Circles.                                                                                         |
| `components/hub/circles-pipeline-header.tsx`         | Pipeline summary.                                                                                                          |
| `components/hub/circles-momentum-strip.tsx`          | Momentum/activity summary.                                                                                                 |
| `components/hub/circles-workload-bar.tsx`            | Workload summary.                                                                                                          |
| `components/hub/circles-unread-badge.tsx`            | Nav unread count.                                                                                                          |
| `components/events/crew-circle-card.tsx`             | Crew Circle event ops entry.                                                                                               |
| `components/menus/dinner-circle-toggle.tsx`          | Menu visibility to Circle.                                                                                                 |

## Existing Tests And Verification Assets

| Test/file                                                        | What it covers                        |
| ---------------------------------------------------------------- | ------------------------------------- |
| `tests/unit/circle-access-policy.test.ts`                        | Permission policy coverage seed.      |
| `tests/unit/hub-host-circle-permissions.test.ts`                 | Host/member permission behavior.      |
| `tests/unit/hub-invite-links.test.ts`                            | Invite link behavior.                 |
| `tests/unit/hub-member-role-contract.test.ts`                    | Role contract behavior.               |
| `tests/unit/dinner-circle-invariant.test.ts`                     | Dinner Circle invariant coverage.     |
| `tests/unit/dinner-circle-event-layer.test.ts`                   | Dinner Circle event layer.            |
| `tests/unit/menu-lifecycle-dinner-circle.test.ts`                | Menu lifecycle Circle integration.    |
| `tests/unit/circle-consensus-contracts.test.ts`                  | Consensus contracts.                  |
| `tests/unit/circle-discovery-contracts.test.ts`                  | Discovery contracts.                  |
| `tests/unit/circle-fast-decision-contracts.test.ts`              | Fast decision contracts.              |
| `tests/unit/circle-memory-contracts.test.ts`                     | Circle memory contracts.              |
| `tests/unit/circle-relationship-layer.test.ts`                   | Relationship layer contracts.         |
| `tests/unit/circle-transparency-events.test.ts`                  | Transparency/event contracts.         |
| `tests/system-integrity/q28-hub-token-security.spec.ts`          | Hub token security assumptions.       |
| `tests/system-integrity/q74-hub-message-tenant-boundary.spec.ts` | Message tenant boundary assumptions.  |
| `tests/e2e/19-dinner-circle-invites.spec.ts`                     | Dinner Circle invite journey.         |
| `tests/qa/circles-pipeline.spec.ts`                              | Chef Circles pipeline UI.             |
| `tests/smoke/critical-path-e2e.spec.ts`                          | Critical path and Dinner Circle flow. |

## Mismatches With The Improved Domain

### 1. `Hub` Is Overloaded

`lib/hub` means Circle substrate. Other docs use "hub" for role/workspace hubs such as People, Events, Money, and platform hubs. Future work should use "Circle" for the relationship workspace and "portal" for role-owned surfaces.

### 2. Public Route Doubles As Workspace And Portal

`/hub/g/[groupToken]` is both the public/token shell and the Circle workspace. This works but blurs the model that users live in role portals and shared work happens in Circles. Future client/staff portal work should be able to embed or deep-link into Circle work without treating the public token route as the only Circle UI.

### 3. `group_type` Drift

Current type/schema expectations and live inserts are inconsistent:

- `lib/hub/types.ts` models `circle`, `dinner_club`, `planning`, `bridge`, `community`.
- `lib/hub/group-actions.ts` creation schema accepts those values.
- `lib/hub/crew-circle-actions.ts` inserts `crew` directly because the shared schema rejects it.
- Specs mention `chef_collab` and `event_collab`.

This needs a canonical taxonomy and compatibility mapping before feature expansion.

### 4. Circle Membership Is Not Linked-Object Access

Membership lets a person participate in a shared workspace. It must not automatically grant all linked Event, Client, Quote, Ledger, Staff, Vendor, or Partner data. Linked-object visibility needs explicit policy.

### 5. Component Boundaries Are Mixed

`components/hub` contains public token UI, chef controls, event planning, meal boards, member lists, proof, private chat, community cards, and staff-ish reuse. That is expected from organic growth but should be treated carefully during parallel work to avoid same-file conflicts.

## Security Notes

- Public token access is intentional. `group_token` is a bearer credential for low-friction guest access.
- `profile_token` identifies member/profile actions and must be verified with group membership before writes.
- Public routes must sanitize profile tokens, notification preferences, chef-only notes, financial state, internal scoring, and private household detail.
- Chef-side Circle routes/actions must call `requireChef()` and scope queries by `tenant_id`.
- Admin Circle routes must call `requireAdmin()` at runtime, not rely on middleware alone.
- Dynamic route params must never be sole tenant data filters.
- Public/community discovery queries must require public/open/active state and avoid tenant PII.

## Recommended Fire Order

1. Docs/contract: `BQ-20260515T173051Z-canonical-circle-primitive-contract`.
2. Inventory: `BQ-20260515T173051Z-circles-current-state-inventory`.
3. Serial foundation: `BQ-20260515T173051Z-circle-access-policy-and-type-taxonomy`.
4. Serial lifecycle helpers: `BQ-20260515T173051Z-circle-lifecycle-helper-contract`.
5. Parallel bridges only after foundation: event/inquiry/client, collaborator/staff/partner, tickets.
6. Product surfaces after foundation and preferably after bridge truth is stable.
7. Engagement/notification intelligence.
8. Regression/security harness.

## Dirty Workspace Warning

As of the 2026-05-15 planning pass, the workspace had many unrelated modified app files, including dashboard, client, menu, recipe, admin, auth, middleware, search, vendor, and public files. Any app-code Circle run should use isolated worktrees or wait for the dirty work to settle before touching shared app modules.
