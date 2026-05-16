# Spec: Menu Fate Tracking

> **Status:** SPEC-READY
> **Priority:** P1
> **Depends on:** menu-proposal-sets.md, menu-fork-lineage.md
> **Estimated complexity:** small (6-8 files)
> **Created:** 2026-05-16
> **Built by:** not started

---

## What This Does (Plain English)

Every menu gets a `fate` column that tracks its business outcome, separate from its document `status`. Status says "is this menu a draft or locked?" Fate says "did this menu actually get cooked and served, or did the client reject it, or did the chef abandon it halfway through?" Fate is computed automatically from events happening elsewhere in the system (event completion, client approval responses, inactivity, forking). Chefs can also manually override fate when the system can't infer it. The dashboard lets you filter by fate so you can mine abandoned menus for ideas, see your hit rate, and understand where your creative effort actually lands.

---

## Why It Matters

A chef who has been on ChefFlow for a year might have 200 menus. Right now, 180 of them say "draft" or "archived," which tells you nothing. The chef can't answer basic questions:

- "How many of my menus actually got served?" (success rate)
- "Show me menus clients rejected." (learn what doesn't land)
- "Show me menus I abandoned." (goldmine of half-built ideas)
- "Which menus were good enough to propose but got beat by another option?" (proven quality, ready to reuse)

Fate turns the menu archive from a graveyard into a searchable library of creative history. It also feeds analytics: a chef serving 40% of proposed menus has a very different business than one serving 80%.

---

## The Problem Today

The `menus.status` field tracks document lifecycle only:

| status     | meaning                       |
| ---------- | ----------------------------- |
| `draft`    | being edited                  |
| `shared`   | sent to client for viewing    |
| `locked`   | finalized, no more edits      |
| `archived` | put away, no longer displayed |

A menu that was served at a completed event and a menu that was abandoned mid-build both end up as `archived`. A menu the client rejected and a menu the client loved but the event got cancelled both look identical. There is no way to query "show me menus that actually made it to the table" without manually joining against `events.status = 'completed'` and even that misses menus with no event attached.

The `menu_approval_status` on `events` (`not_sent`, `sent`, `approved`, `revision_requested`) tracks the approval handshake but not the final business outcome. A menu can be `approved` and still never get served (event cancelled). A menu can be `not_sent` and still get served (chef just cooked it without formal approval).

---

## How It Works

### Fate as a Derived + Overridable Column

Fate is stored on the `menus` table as a nullable enum. When NULL, the menu is considered `active` (still in play, no outcome yet). The system computes fate automatically via triggers and a periodic scanner, but the chef can manually set fate to override the computed value.

### Auto-Derivation Rules

Fate is updated by these system events, in priority order:

| Trigger                       | Computed Fate           | Condition                                                                                                                                                |
| ----------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event completes               | `served`                | `events.status` transitions to `completed` and menu is linked via `menus.event_id`                                                                       |
| Event cancelled               | `approved_unserved`     | `events.status` transitions to `cancelled` AND `events.menu_approval_status = 'approved'` AND menu linked                                                |
| Event cancelled (no approval) | `abandoned`             | `events.status` transitions to `cancelled` AND menu approval was never sent/approved                                                                     |
| Menu forked into new menu     | `superseded`            | A new menu is created with `forked_from_menu_id` pointing to this menu (requires fork lineage feature)                                                   |
| Forked-from menu gets served  | `recycled`              | This menu's fate was `abandoned`, `client_rejected`, or `proposed_not_selected`, AND a descendant menu (via fork chain) reaches `served`                 |
| Client rejects menu           | `client_rejected`       | `menu_approval_requests.status` transitions to `revision_requested` AND no subsequent approval exists for this event+menu pair                           |
| Proposal set decided          | `proposed_not_selected` | Another menu for the same event reaches `approved` or `served`, and this menu was `shared` but not selected (requires proposal sets feature)             |
| Inactivity timeout            | `abandoned`             | Menu has no event, is not a template, `status` is `draft`, and `updated_at` is older than 30 days. Computed by scheduled scanner, not real-time trigger. |
| Saved as template             | `template_frozen`       | `menus.is_template` set to `true`                                                                                                                        |

### Manual Override

The chef can always set fate manually via a dropdown on the menu detail page. Manual overrides are flagged with `fate_source = 'manual'` so the system knows not to auto-update them. The chef can also clear a manual override to let the system re-derive.

### Fate Timeline

Every fate change (auto or manual) is logged to `menu_fate_transitions`, an immutable audit trail. This powers the fate timeline view: "Created May 1 -> Proposed May 5 -> Not selected May 8 -> Recycled into 'Summer Coastal' May 20 -> Served June 3."

---

## Files to Create

| File                                                        | Purpose                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| `database/migrations/20260517000001_menu_fate_tracking.sql` | New enum, columns, fate transitions table, indexes                       |
| `lib/menus/fate-engine.ts`                                  | Core fate derivation logic: given a menu + context, compute correct fate |
| `lib/menus/fate-scanner.ts`                                 | Scheduled scanner for inactivity-based fate (abandoned detection)        |
| `components/menus/menu-fate-badge.tsx`                      | Visual badge showing fate with color coding                              |
| `components/menus/menu-fate-timeline.tsx`                   | Timeline view of a menu's fate journey                                   |
| `components/menus/menu-fate-override.tsx`                   | Manual fate override dropdown for chef                                   |

---

## Files to Modify

| File                                        | What to Change                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `lib/menus/menu-lifecycle.ts`               | After status transitions, call fate engine to check if fate should update        |
| `lib/menus/actions.ts`                      | Add `updateMenuFate` server action for manual override; add fate to menu queries |
| `lib/events/transitions.ts`                 | On event `completed` or `cancelled`, trigger fate update for linked menus        |
| `lib/db/schema/schema.ts`                   | Will be regenerated after migration to include new enum + columns                |
| `app/(chef)/menus/[id]/page.tsx`            | Render fate badge + timeline + override control                                  |
| `app/(chef)/menus/page.tsx`                 | Add fate filter to menu list (dropdown: all, served, abandoned, etc.)            |
| `app/(chef)/dashboard/page.tsx`             | Add fate distribution widget (pie chart or bar)                                  |
| `lib/api/scheduled/menu-fate-scan/route.ts` | Cron endpoint for abandoned menu detection                                       |

---

## Database Changes

### New Enum

```sql
CREATE TYPE menu_fate AS ENUM (
  'served',
  'approved_unserved',
  'proposed_not_selected',
  'abandoned',
  'superseded',
  'client_rejected',
  'template_frozen',
  'recycled'
);
```

### Alter `menus` Table

```sql
-- Fate column: NULL means 'active' (no outcome yet)
ALTER TABLE menus ADD COLUMN fate menu_fate;

-- Source of the current fate value
-- 'auto' = system-derived, 'manual' = chef override
ALTER TABLE menus ADD COLUMN fate_source TEXT NOT NULL DEFAULT 'auto'
  CHECK (fate_source IN ('auto', 'manual'));

-- When fate was last computed/set
ALTER TABLE menus ADD COLUMN fate_updated_at TIMESTAMPTZ;

-- Index for filtering by fate
CREATE INDEX idx_menus_fate ON menus(fate) WHERE fate IS NOT NULL;

-- Composite index for abandoned detection scanner
CREATE INDEX idx_menus_fate_scanner
  ON menus(tenant_id, status, updated_at)
  WHERE fate IS NULL AND is_template = false AND event_id IS NULL AND deleted_at IS NULL;
```

### New Table: `menu_fate_transitions`

```sql
CREATE TABLE menu_fate_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- What changed
  from_fate menu_fate,        -- NULL = was 'active' (no fate yet)
  to_fate menu_fate NOT NULL,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual', 'scanner')),

  -- Why
  trigger_type TEXT NOT NULL,
  -- e.g. 'event_completed', 'event_cancelled', 'client_rejected',
  --      'inactivity_timeout', 'fork_created', 'descendant_served',
  --      'template_saved', 'proposal_decided', 'manual_override'
  trigger_entity_id UUID,     -- ID of the event/menu/approval that caused the change
  reason TEXT,                 -- optional human-readable note

  -- Audit
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transitioned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_menu_fate_transitions_menu ON menu_fate_transitions(menu_id);
CREATE INDEX idx_menu_fate_transitions_tenant ON menu_fate_transitions(tenant_id);
```

### RLS Policies

```sql
-- menu_fate_transitions: same tenant isolation pattern as menu_state_transitions
ALTER TABLE menu_fate_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select_menu_fate_transitions
  ON menu_fate_transitions FOR SELECT TO public
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_insert_menu_fate_transitions
  ON menu_fate_transitions FOR INSERT TO public
  WITH CHECK (tenant_id = get_current_tenant_id());
```

---

## State Machine / Rules

### Fate Transition Matrix

Not all fate transitions are valid. The system enforces these rules:

```
NULL (active) -> served              (event completed)
NULL (active) -> approved_unserved   (event cancelled after approval)
NULL (active) -> abandoned           (inactivity or event cancelled without approval)
NULL (active) -> superseded          (forked into newer version)
NULL (active) -> client_rejected     (client said no)
NULL (active) -> proposed_not_selected (another menu won)
NULL (active) -> template_frozen     (saved as template)

abandoned          -> recycled       (descendant served)
client_rejected    -> recycled       (descendant served)
proposed_not_selected -> recycled    (descendant served)

superseded         -> recycled       (descendant served)
approved_unserved  -> served         (event rescheduled and completed)

template_frozen    -> NULL (active)  (un-templated, back in play)
abandoned          -> NULL (active)  (chef resumes work on it)

Any fate           -> Any fate       (manual override by chef, always allowed)
```

### Priority Resolution

When multiple triggers fire simultaneously (e.g., event completes AND menu was previously superseded), use this priority:

1. `served` (highest; if it got served, that's the final word)
2. `recycled` (a descendant got served)
3. `approved_unserved`
4. `client_rejected`
5. `proposed_not_selected`
6. `superseded`
7. `template_frozen`
8. `abandoned` (lowest; only if nothing else applies)

### Fate Engine Pseudocode

```typescript
export async function deriveMenuFate(
  db: DbClient,
  menuId: string,
  triggerType: string,
  triggerEntityId?: string
): Promise<MenuFate | null> {
  const menu = await getMenuWithContext(db, menuId)

  // Manual overrides are never auto-updated
  if (menu.fateSource === 'manual') return null

  // Check triggers in priority order
  if (menu.event?.status === 'completed') return 'served'

  if (hasServedDescendant(menu)) return 'recycled'

  if (menu.event?.status === 'cancelled' && menu.event.menuApprovalStatus === 'approved')
    return 'approved_unserved'

  if (wasClientRejected(menu)) return 'client_rejected'

  if (wasProposedButNotSelected(menu)) return 'proposed_not_selected'

  if (hasNewerFork(menu)) return 'superseded'

  if (menu.isTemplate) return 'template_frozen'

  // Abandoned is only set by the scanner, not real-time
  return null
}
```

---

## Edge Cases

### Menu linked to multiple events

A menu can only have one `event_id`. If it's reused across events via forking, each fork is a separate menu with its own fate. The original's fate reflects its own event (or lack thereof).

### Event rescheduled after cancellation

If an event is cancelled (menu fate becomes `approved_unserved`) and then a new event is created reusing the same menu, the fate reverts to `active` (NULL) when the menu is re-linked to the new event, then to `served` when that event completes.

### Menu approved then revised

If a client approves, then requests revisions, the latest `menu_approval_requests` status wins. If the latest is `revision_requested` with no subsequent `approved`, fate = `client_rejected`. If the chef sends a new version and it gets approved, the old menu's fate = `superseded`, new menu's fate follows its own path.

### Template that gets un-templated

Setting `is_template = false` clears the `template_frozen` fate back to NULL (active). The fate engine re-derives from current state.

### Abandoned menu edited again

If the scanner sets fate to `abandoned` and the chef later edits the menu (updating `updated_at`), the next scanner run should clear the fate back to NULL since it no longer meets the 30-day inactivity threshold. The fate engine checks `updated_at` freshness, not just current fate.

### Fork chain depth

A menu forked from a forked menu: if the grandchild gets served, both parent and grandparent can become `recycled`. The engine walks up the full fork chain. Cap chain depth at 10 to prevent infinite loops from corrupted data.

### Soft-deleted menus

Menus with `deleted_at IS NOT NULL` are excluded from the fate scanner. Their fate at time of deletion is preserved. If un-deleted, the scanner picks them up on the next run.

### Manual override then system event

If the chef manually sets fate to `abandoned` and later the linked event completes, the system does NOT override. Manual = sticky. The chef must clear the override first. This prevents surprises.

### Menu with no event and no approval history

A menu that was never linked to an event and never went through approval has no business context to derive fate from. It stays NULL (active) unless the inactivity scanner flags it as `abandoned` or the chef manually sets fate.

### Concurrent fate updates

Two events triggering fate changes on the same menu simultaneously (unlikely but possible): the fate engine uses optimistic locking on `fate_updated_at`. If the timestamp changed between read and write, re-derive from scratch.

---

## Definition of Done

- [ ] Migration applied: `menu_fate` enum, `fate`/`fate_source`/`fate_updated_at` columns on `menus`, `menu_fate_transitions` table with RLS
- [ ] `fate-engine.ts` computes correct fate for all 9 trigger types with priority resolution
- [ ] Event completion triggers fate update on linked menu(s)
- [ ] Event cancellation triggers appropriate fate (`approved_unserved` or `abandoned`) based on approval status
- [ ] Fate scanner cron job detects abandoned menus (30+ day inactivity, no event, not template)
- [ ] `template_frozen` fate set/cleared when `is_template` toggled
- [ ] Manual override via UI sets `fate_source = 'manual'` and prevents auto-updates
- [ ] Manual override clearable (reverts to auto-derivation)
- [ ] All fate changes logged to `menu_fate_transitions` with trigger type and entity
- [ ] Fate badge renders on menu list and detail pages with color coding
- [ ] Fate timeline renders chronological journey on menu detail page
- [ ] Menu list page has fate filter dropdown
- [ ] Dashboard shows fate distribution analytics (count per fate, served %)
- [ ] `recycled` fate propagates up fork chain when descendant is served (requires fork lineage feature; can stub until available)
- [ ] `proposed_not_selected` triggers when sibling menu is chosen (requires proposal sets feature; can stub until available)
- [ ] Existing menus backfilled: migration runs a one-time scan to set fate for menus with completed/cancelled events
- [ ] Health check: `tsc --noEmit` and `next build` pass
- [ ] No regressions in `menu-lifecycle.ts` state machine
