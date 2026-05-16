# Spec: Waiting State Radar

> **Status:** draft
> **Priority:** P1
> **Depends on:** `docs/specs/chef-operating-loop-external-memory.md`, `docs/superpowers/specs/2026-05-04-the-current-unified-feed-design.md`
> **Estimated complexity:** medium (3-8 files)

## Developer Notes

### Raw Signal

The research says waiting is a valid status. Some things are active, scheduled, delegated, waiting on someone else, waiting on time, or waiting on a decision. The organized person does not keep waiting items in their head. If waiting for a reply, it has a follow-up date. If waiting for payment, it is in the budget system. If waiting for a meeting, the agenda is attached.

### Developer Intent

- **Core goal:** Make waiting work visible and actionable so chefs stop mentally tracking pending replies, decisions, payments, vendor answers, and background jobs.
- **Key constraints:** Waiting is not failure. It should be calm, explicit, and tied to a follow-up path.
- **Success from the developer's perspective:** A chef can open one surface and know what is waiting, who or what it is waiting on, when to follow up, and what proof exists.

## What This Does

Adds a Waiting Radar that aggregates pending/waiting states across inquiries, quotes, contracts, payments, tasks, reminders, vendors, imports, client replies, and system jobs.

## Existing Grounding

- `lib/action-center/feed.ts` already normalizes notifications, reminders, and tasks.
- `lib/current` already ranks and suppresses mixed source units.
- Universal Rail specs already include lifecycle states such as snoozed, dismissed, resolved, expired, and suppressed.
- Many domain models already use `awaiting_*`, `pending`, `snoozed`, `follow_up_due_at`, or overdue concepts.

## Files To Create

| File                                               | Purpose                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `lib/waiting-radar/types.ts`                       | Waiting reason, source, owner, due/follow-up state, proof link.                |
| `lib/waiting-radar/collect.ts`                     | Collect waiting items from existing sources.                                   |
| `lib/waiting-radar/rank.ts`                        | Sort by overdue, revenue risk, event proximity, relationship risk, and effort. |
| `components/waiting-radar/waiting-radar-panel.tsx` | Dashboard panel.                                                               |
| `app/(chef)/waiting/page.tsx`                      | Full waiting radar route.                                                      |

## Files To Modify

| File                                                | What To Change                                               |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `app/(chef)/dashboard/page.tsx`                     | Add compact waiting panel or link from operating-loop panel. |
| `lib/current/collect.ts`                            | Optionally include top waiting radar items in Current feed.  |
| `lib/action-center/feed.ts`                         | Preserve waiting reason and follow-up date where available.  |
| `lib/auth/route-policy.ts`                          | Register `/waiting` as chef-protected if needed.             |
| `docs/specs/chef-operating-loop-external-memory.md` | Link this as the dedicated waiting slice.                    |

## Database Changes

None for V1. Derive from existing source tables. Add persistence only if snooze/follow-up state cannot be written back to the source object.

## Data Model

| Field           | Meaning                                                                |
| --------------- | ---------------------------------------------------------------------- |
| `id`            | Stable derived ID.                                                     |
| `sourceKind`    | Inquiry, quote, task, payment, vendor, import, client, event, system.  |
| `waitingOn`     | Client, chef, vendor, staff, system, time, decision, payment, unknown. |
| `waitingReason` | Short human-readable reason.                                           |
| `followUpAt`    | Date/time when action becomes appropriate.                             |
| `proofHref`     | Route to source record or evidence.                                    |
| `riskLevel`     | low, medium, high, critical.                                           |

## UI Spec

### Dashboard Panel

- Counts: overdue, due soon, waiting on client, waiting on system.
- Top 5 waiting items.
- Each item shows waiting-on, age, follow-up date, and route.

### Full Route

- Segmented filters: Client, Vendor, Payment, System, Staff, All.
- Columns: Waiting on, Since, Follow up, Risk, Source.
- Bulk actions only if source supports them.

## Acceptance Criteria

- Waiting items are derived from at least three source systems in V1.
- Overdue follow-ups are clearly separated from normal waiting.
- Items route to their canonical source.
- Empty state says nothing is waiting, not that the business has no work.
- Tenant scoping is preserved for every collector.

## Edge Cases

| Scenario                                | Correct Behavior                                                 |
| --------------------------------------- | ---------------------------------------------------------------- |
| Waiting item has no date                | Show "no follow-up set" and allow route to source.               |
| Source record deleted                   | Suppress item or show stale source error, never crash dashboard. |
| Same item appears from multiple sources | Dedup and preserve strongest source route.                       |
| Payment waiting item                    | Do not expose payment details outside authorized chef surfaces.  |

## Verification Steps

1. Seed or identify one task/reminder, one quote/client follow-up, and one payment/vendor/system pending item.
2. Verify `/waiting` shows all categories.
3. Verify each item deep-links to canonical source.
4. Verify dashboard panel remains compact.
5. Run focused unit tests for collectors/ranking.
6. Capture screenshot proof.

## Out Of Scope

- New workflow engines.
- Automatic client/vendor outreach.
- Replacing the Current feed.

## Queue-Ready Draft

- **Raw request / source:** "Waiting is a valid status."
- **Goal:** Build a dedicated waiting-state radar.
- **Scope:** Collectors, ranking, dashboard panel, `/waiting` route.
- **Acceptance criteria:** At least three source categories, canonical links, truthful empty state, tenant scoped.
- **Risks:** Duplicate Current feed; incomplete source coverage.
- **Verification:** focused tests, route proof, screenshot.
