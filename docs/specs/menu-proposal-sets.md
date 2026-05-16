# Spec: Menu Proposal Sets

> **Status:** SPEC-READY
> **Priority:** P1
> **Depends on:** None
> **Estimated complexity:** medium (10-15 files)
> **Created:** 2026-05-16
> **Built by:** not started

---

## What This Does (Plain English)

When a client inquires about a dinner, you often want to present two or three menu options rather than committing to one. "Here are three menus I think would work for your party. Option A is Mediterranean, Option B is French bistro, Option C is farm-to-table seasonal." The client picks one (or asks for changes), and the winner gets attached to the event. The ones that didn't get picked stay in your library as proven-quality menus you can reuse later.

Menu Proposal Sets give you a way to group competing menus for one event, send the whole set to the client for side-by-side comparison, and track which option won.

## Why It Matters

- **Higher close rate.** Giving clients choices makes them feel in control. "Pick your favorite" converts better than "take it or leave it."
- **Menu library gets richer.** Every unchosen menu is a fully-built, client-grade menu that goes back into your library. Over time you accumulate a deep catalog of proven options.
- **Proposal history builds intelligence.** Knowing which menus win and which lose (and for what kind of client/occasion) helps you get better at reading what people want.
- **Professional presentation.** Side-by-side comparison with courses, pricing, and dietary coverage is what high-end clients expect.

## The Problem Today

- One menu gets attached to one event. `events.menu_id` is a single FK, and `menus.event_id` links one menu to one event.
- The approval workflow (`sendMenuForApproval`, `approveMenu`, `requestRevision`) assumes a single menu per event.
- There is no way to group multiple menus as competing options for one event.
- There is no way to track which menu was chosen vs. rejected.
- Unchosen menus just sit orphaned with no metadata about why they exist.
- The client portal (`/my-events/[id]/approve-menu`) shows one menu snapshot, not a comparison view.
- The existing `choose-menu` page (`/my-events/[id]/choose-menu`) lets clients browse showcase menus or submit preferences, but that is a different flow (menu discovery, not proposal review).

## How It Works

### Chef Flow

1. Chef navigates to an event and clicks "Send Menu Options" (or similar).
2. Chef picks 2-4 menus from their library (existing menus, templates, or menus built for this event).
3. System creates a `menu_proposal_set` with entries for each menu, ordered by the chef's preferred position.
4. Chef optionally adds a note per menu ("This one is lighter, good for summer") and a set-level note ("Let me know which direction appeals to you").
5. Chef sends the proposal set. Each menu in the set gets snapshotted (like existing approval flow). Client receives an email with a link to the comparison view.

### Client Flow

1. Client clicks the link and sees a side-by-side comparison: menu names, descriptions, courses listed, pricing (if shown), dietary coverage summary, chef notes per option.
2. Client picks one option, optionally leaving a note ("I love Option B but can we swap the appetizer?").
3. On selection:
   - The chosen menu gets attached to the event via existing `attachMenuToEvent()`.
   - The proposal set status moves to `decided`.
   - The chosen entry gets `is_selected = true`.
   - Unchosen menus get tagged with fate `proposed_not_selected` (new column on `menus` table).
   - If the client left a note requesting changes, a revision request is created on the selected menu (reuses existing `requestRevision` flow).
4. If the client wants none of them, they can request revision on the whole set ("None of these, but I liked the appetizer from Option A"). This keeps the set `open` and notifies the chef.

### Dashboard Integration

- Chef dashboard shows a badge: "3 proposals pending client decision" for open sets.
- Event detail page shows proposal set history: which menus were proposed, which was chosen, client notes.
- Menu detail page shows proposal history: "This menu was proposed for 4 events, selected 2 times (50% hit rate)."

### Recycling Unchosen Menus

- Unchosen menus are NOT deleted or archived. They remain `draft` or `shared` in the chef's library.
- A new `fate` column on `menus` tracks provenance: `null` (normal), `proposed_not_selected`, `template_derived`, etc.
- The menu library can filter by fate to find "menus that were built for real events but not chosen" as a rich starting point for future events.

## Files to Create

| File                                                        | Purpose                                                        |
| ----------------------------------------------------------- | -------------------------------------------------------------- |
| `database/migrations/20260517000001_menu_proposal_sets.sql` | New tables + indexes                                           |
| `lib/menus/proposal-set-actions.ts`                         | Server actions: create, send, select, reject, list             |
| `lib/menus/proposal-set-queries.ts`                         | Read queries: get set for event, get proposal history for menu |
| `components/menus/proposal-set-builder.tsx`                 | Chef UI: pick menus, order them, add notes, send               |
| `components/menus/proposal-set-comparison.tsx`              | Client UI: side-by-side comparison view                        |
| `components/menus/proposal-set-status-badge.tsx`            | Badge component for dashboard/event detail                     |
| `app/(client)/my-events/[id]/proposals/page.tsx`            | Client-facing proposal comparison page                         |
| `app/(chef)/events/[id]/proposal-set/page.tsx`              | Chef-facing proposal set builder page                          |
| `lib/email/templates/menu-proposal-set.tsx`                 | Email template for "Your chef sent menu options"               |

## Files to Modify

| File                                   | Change                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `lib/db/schema/schema.ts`              | Add `menuProposalSets`, `menuProposalEntries` tables, add `fate` column to `menus`                             |
| `lib/db/schema/relations.ts`           | Add relations for new tables                                                                                   |
| `lib/events/menu-approval-actions.ts`  | Wire proposal selection into existing approval flow; `approveMenu` must check if menu came from a proposal set |
| `lib/menus/actions.ts`                 | `attachMenuToEvent()` should mark other entries in any active proposal set as not-selected                     |
| `lib/menus/menu-lifecycle.ts`          | Add `proposed` as a valid source context for transitions                                                       |
| `app/(chef)/events/[id]/page.tsx`      | Show proposal set status and link to builder                                                                   |
| `app/(chef)/dashboard/page.tsx`        | Add "proposals pending" badge to dashboard                                                                     |
| `app/(client)/my-events/[id]/page.tsx` | Show "Review menu options" CTA when a proposal set is open                                                     |
| `lib/notifications/channel-router.ts`  | Route proposal-related notifications                                                                           |
| `lib/analytics/culinary-analytics.ts`  | Add proposal hit-rate analytics                                                                                |
| `types/database.ts`                    | Add generated types for new tables                                                                             |

## Database Changes

### New enum

```sql
CREATE TYPE menu_proposal_set_status AS ENUM ('open', 'decided', 'expired', 'revision_requested');
```

### New table: `menu_proposal_sets`

```sql
CREATE TABLE menu_proposal_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT,  -- optional label: "Menu options for Sarah's birthday"
  chef_notes TEXT,  -- set-level note to client
  status menu_proposal_set_status NOT NULL DEFAULT 'open',
  sent_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  snapshot_json JSONB NOT NULL DEFAULT '[]',  -- frozen menu snapshots at send time
  client_feedback TEXT,  -- client note when rejecting all or requesting revision
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_proposal_sets_tenant ON menu_proposal_sets(tenant_id);
CREATE INDEX idx_proposal_sets_event ON menu_proposal_sets(event_id);
CREATE INDEX idx_proposal_sets_status ON menu_proposal_sets(status) WHERE status = 'open';
```

### New table: `menu_proposal_entries`

```sql
CREATE TABLE menu_proposal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_set_id UUID NOT NULL REFERENCES menu_proposal_sets(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL DEFAULT 0,  -- display order (0-indexed)
  chef_note TEXT,  -- per-menu note: "This one is lighter, great for summer"
  is_selected BOOLEAN NOT NULL DEFAULT false,
  client_notes TEXT,  -- client note on this specific option
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (proposal_set_id, menu_id),
  UNIQUE (proposal_set_id, position)
);

CREATE INDEX idx_proposal_entries_set ON menu_proposal_entries(proposal_set_id);
CREATE INDEX idx_proposal_entries_menu ON menu_proposal_entries(menu_id);
```

### Alter existing table: `menus`

```sql
ALTER TABLE menus ADD COLUMN fate TEXT;
-- Values: NULL (normal), 'proposed_not_selected', 'template_derived'
-- Not an enum; extensible text field for future fates.

COMMENT ON COLUMN menus.fate IS 'Provenance tag: null=normal, proposed_not_selected=was in a proposal set but client chose another, template_derived=cloned from a template';
```

### Constraint: one decided set per event

```sql
-- At most one proposal set can be in 'decided' status per event.
-- Multiple 'open' sets allowed (chef iterates).
CREATE UNIQUE INDEX idx_one_decided_set_per_event
  ON menu_proposal_sets(event_id)
  WHERE status = 'decided';
```

### Constraint: one selected entry per set

```sql
-- At most one entry can be selected per proposal set.
CREATE UNIQUE INDEX idx_one_selected_per_set
  ON menu_proposal_entries(proposal_set_id)
  WHERE is_selected = true;
```

## State Machine / Rules

### Proposal Set Status

```
open ──────────────> decided          (client selects a menu)
open ──────────────> revision_requested (client wants changes to set)
open ──────────────> expired          (event cancelled, or chef expires manually)
revision_requested > open             (chef updates set and re-sends)
revision_requested > expired          (chef gives up / event cancelled)
decided ───────────> (terminal)       (cannot revert; detach menu from event to start over)
expired ───────────> (terminal)
```

### Menu Selection Rules

1. **Max 4 menus per set.** More than 4 is decision paralysis. Enforced in server action.
2. **Min 2 menus per set.** A single menu is not a proposal, it is the normal approval flow.
3. **Menus must belong to same tenant.** Enforced by tenant scoping.
4. **Menus can appear in multiple proposal sets** (same menu proposed for different events). The `menu_proposal_entries` junction handles this.
5. **A menu already attached to another event cannot be added to a proposal set.** It must be detached or duplicated first.
6. **Selecting a menu from a set calls `attachMenuToEvent()` internally.** All side effects (allergen check, grocery draft, cache invalidation) fire normally.
7. **Selecting a menu transitions the menu status to `shared` if it was `draft`.** The approval flow expects `shared` status.
8. **Unchosen menus get `fate = 'proposed_not_selected'`** but their status remains unchanged (`draft` or `shared`). They are not archived automatically.

### Integration with Existing Approval

- If the client selects a menu from a proposal set AND leaves a note, the system creates a `menu_approval_request` with status `revision_requested` for that specific menu. The existing revision flow handles it from there.
- If the client selects a menu with no notes, the system creates a `menu_approval_request` with status `approved`. This counts as menu approval for the event lifecycle.
- The `events.menu_approval_status` column updates to `approved` or `revision_requested` based on the selection.

### Notification Rules

- **On send:** Client gets email + in-app notification with link to comparison view.
- **On selection:** Chef gets email + in-app notification ("Sarah chose Option B for her birthday dinner").
- **On revision request (whole set):** Chef gets notification ("Sarah wants changes to the menu options").
- **On expiry:** No notification (chef-initiated).

## Edge Cases

1. **Chef sends a proposal set, then edits one of the menus before client decides.** The snapshot_json preserves the version sent. The live comparison view shows current state with a "Updated since sent" indicator if the menu changed.
2. **Client tries to select a menu that was deleted after sending.** Soft-deleted menus are filtered out of the comparison view. If only one menu remains, show it with a note that other options are no longer available.
3. **Two proposal sets open for the same event.** Allowed. When client selects from one, the other is NOT auto-expired (chef may want to keep it for reference). Dashboard shows both.
4. **Chef attaches a menu to the event manually (bypassing proposal flow).** Any open proposal sets for that event should auto-transition to `expired` with a system note: "Menu was attached directly."
5. **Event gets cancelled with an open proposal set.** Proposal set should transition to `expired` via the event cancellation side effects.
6. **Menu in a proposal set is also a template (`is_template = true`).** Allowed. On selection, the template should be duplicated (not attached directly), preserving the template for future use. Use existing `duplicateMenuForEvent` logic.
7. **Client refreshes the comparison page after selecting.** Show the decided state: "You chose Option B" with a summary. Do not allow re-selection.
8. **Chef wants to add a menu to an already-sent proposal set.** Not allowed once sent. Chef must create a new proposal set (keeps audit trail clean).
9. **All menus in a proposal set are identical except for one dish.** Valid use case (A/B testing a single course). The comparison view highlights differences.
10. **Proposal set with pricing hidden vs. shown.** Respect the existing `price_per_person_cents` visibility rules. If the chef hasn't set pricing, the comparison view omits the price column entirely rather than showing $0.

## Definition of Done

- [ ] Migration applied, tables exist, constraints enforced
- [ ] Chef can create a proposal set from the event detail page, selecting 2-4 menus
- [ ] Chef can add per-menu notes and a set-level note
- [ ] Chef can send the proposal set (snapshots created, email sent, notification created)
- [ ] Client sees side-by-side comparison at `/my-events/[id]/proposals`
- [ ] Client can select one menu (triggers `attachMenuToEvent`, creates approval record, updates set status)
- [ ] Client can request revision on the whole set (set goes to `revision_requested`, chef notified)
- [ ] Unchosen menus get `fate = 'proposed_not_selected'`
- [ ] Dashboard shows "N proposals pending" for open sets
- [ ] Event detail page shows proposal set history
- [ ] Menu detail page shows "proposed N times, selected M times" stats
- [ ] Template menus are duplicated on selection (not attached directly)
- [ ] Manual menu attachment expires open proposal sets for that event
- [ ] Event cancellation expires open proposal sets
- [ ] Snapshot_json preserves menu state at send time
- [ ] All server actions have: auth gate, tenant scoping, input validation, error propagation, cache busting
- [ ] No regressions in existing single-menu approval flow
- [ ] Playwright test: chef creates proposal set, client selects, menu attached, unchosen menus tagged
