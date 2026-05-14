# Spec: Homepage Planning State Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after planning shortlist contracts are stable
> **Scope:** planning state discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

Planning state bridges discovery into conversion. It must reuse existing planning/HUB/Dinner Circle primitives and avoid creating a separate social system.

Intent:

- Let users continue saved ideas, shortlists, shared planning, and ready-to-inquire flows.
- Do not automatically create records from homepage browsing.
- Keep planning state separate from generic category discovery.

---

## What This Does

Create a rail for planning state:

- start a shortlist
- continue planning
- saved ideas
- shared with friends
- ready to inquire
- finish your brief
- recently saved chefs
- planning group draft

---

## Planning State Classes

- **No plan yet:** start a shortlist, browse ideas.
- **Saved:** saved chefs, saved discovery items, pinned items.
- **Drafting:** planning brief started, missing date/headcount/budget.
- **Shared:** group planning or friend collaboration.
- **Ready:** enough context to inquire or book.
- **Recovery:** abandoned planning flow, recent shortlist.

---

## Homepage Modules

### Start

Examples:

- Start a shortlist
- Save ideas
- Plan with friends

### Continue

Examples:

- Continue planning
- Finish your brief
- Recently saved

### Share / Collaborate

Examples:

- Shared with friends
- Planning group
- Vote on ideas

### Convert

Examples:

- Ready to inquire
- Review your plan
- Choose a chef

---

## Metadata

Recommended fields:

- `id`
- `planningStateClass`
- `shortlistId`
- `groupToken`
- `savedItemCount`
- `missingFields`
- `readyToInquire`
- `lastActivityAt`
- `publicSafeSummary`
- `defaultRoute`
- `defaultQuery`

---

## Slot Model

Example:

- Start a Shortlist
- Continue Planning
- Saved Chefs
- Finish Your Brief
- Shared With Friends
- Ready to Inquire

Rules:

- Show planning recovery only when real state exists.
- Do not expose private group data on public homepage.
- Do not create planning records from passive exposure.
- Use existing Hub/Dinner Circle planning primitives where possible.

---

## Routing Rules

- Route to existing planning, hub, `/eat`, `/chefs`, or public profile paths only.
- No automatic booking, inquiry, event, group, or planning creation from a rail impression/click unless the user explicitly starts a flow.
- Respect auth and token access boundaries.
- No private data leakage.

---

## Acceptance Criteria

- Rail supports start, saved, drafting, shared, ready, and recovery planning states.
- Planning state is shown only when backed by real user/session state.
- Tests cover auth/anonymous boundaries, token privacy, no automatic record creation, routing, dedupe, and hidden/dismissed behavior.

---

## Out Of Scope

- New social system.
- Full shortlist implementation if not already scoped elsewhere.
- Booking/inquiry write-path changes.
