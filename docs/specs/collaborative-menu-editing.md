# Spec: Collaborative Menu Editing

> **Status:** SPEC-READY
> **Priority:** P2
> **Depends on:** client-provided-menus.md, menu-fork-lineage.md
> **Estimated complexity:** large (15-20 files)
> **Created:** 2026-05-16
> **Built by:** not started

---

## What This Does (Plain English)

Turns menu creation from a one-way approval flow into a turn-based conversation between chef and client. The client can suggest dish swaps, add requests, comment on individual courses, or fork a showcase menu and customize it. The chef always has final say, but the client becomes a co-creator rather than a yes/no gatekeeper.

Think of it like passing a napkin back and forth at a tasting: "What about this instead?" "Great idea, but let me do it this way." Each pass is preserved so you can always look back.

---

## Why It Matters

1. **Menus built through dialogue close faster.** A client who helped shape the menu feels ownership; they approve on the spot instead of ghosting for a week.
2. **Reduces revision ping-pong.** Today the client writes "change the dessert" in a text box, chef guesses what they mean, sends again, still wrong. With proposals, the client shows exactly what they want.
3. **Unlocks client-initiated menus.** Clients with Pinterest boards or specific dishes in mind can contribute directly instead of describing things over email.
4. **Co-hosted events need shared editing.** Farm dinners, corporate retreats with event planners: multiple people need to touch the menu.
5. **Preserves the chef's authority.** Everything is a proposal until the chef accepts. No surprises on event day.

---

## The Problem Today

- `menu_approval_requests` is binary: sent -> approved or revision_requested.
- Revision notes are a single text blob. No structure, no per-dish feedback.
- Client cannot suggest specific dishes, only describe changes in words.
- No concept of "whose turn is it" so both sides wonder if the other saw their changes.
- No history of what was proposed and rejected; only the final snapshot survives.
- Co-hosts have zero editing access; they get a read-only share link.

---

## How It Works

### Core Flow

```
Chef builds menu (existing)
    |
    v
Chef sends for collaboration (new: extends existing "send for approval")
    |
    v
Client enters EDIT MODE on their portal
    - Swaps dishes (from chef's suggestion pool or free-text requests)
    - Removes courses
    - Adds dish requests with notes
    - Comments on individual items
    |
    v
Client SUBMITS changes (creates a menu_edit_session with status: 'submitted')
    |
    v
Turn passes to CHEF
    - Chef sees diff view: original vs client proposal
    - Per-change: accept / reject (with reason) / counter-propose
    |
    v
Chef resolves all changes -> new menu version is committed
    - If counter-proposals exist -> turn passes back to client
    - If all accepted/rejected -> menu finalized, standard approval flow resumes
```

### Self-Fork Flow

```
Client browses showcase menus or past event menus
    |
    v
Clicks "Customize This" -> creates a fork (uses fork lineage system)
    |
    v
Client edits the fork freely (add/remove/swap dishes, add notes)
    |
    v
Client submits fork to chef for review
    |
    v
Chef sees it as a new edit session with editor_type: 'client'
    - Can adopt the fork as-is, modify, or reject with alternative
```

### Co-Host Flow

```
Chef invites co-host to an event (hub_groups membership)
    |
    v
Co-host gets edit access (editor_type: 'co_host')
    |
    v
Same proposal/review cycle as client flow
    - Co-host changes are proposals, not direct edits
    - Chef always has final authority
```

### Turn Tracking

At any moment, a menu is in one of:

- **Chef's turn:** chef is editing or reviewing proposals
- **Client's turn:** client has been invited to suggest changes
- **Awaiting response:** proposals submitted, waiting for the other party

Visual indicator on both chef dashboard and client portal: "Waiting on you" or "Waiting on [name]".

### Inline Comments

- Any party can comment on a specific dish or course
- Comments are threaded (parent_comment_id)
- Comments don't change the menu; they're discussion alongside the proposals
- Unresolved comments block finalization (chef can dismiss)

### Dinner Circle Integration

- If event has a `dinner_circle_group_id`, circle members can:
  - Vote on dish options (thumbs up/down)
  - Add comments visible to chef and host
  - NOT submit edit proposals (only host/client can)
- Circle votes surface as social proof: "4 of 6 guests prefer the tart"

---

## Files to Create

| File                                                                | Purpose                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------- |
| `database/migrations/20260517000001_collaborative_menu_editing.sql` | Schema: tables, indexes, enums, RLS                           |
| `lib/menus/collaborative-edit-actions.ts`                           | Server actions: create session, submit changes, accept/reject |
| `lib/menus/collaborative-edit-queries.ts`                           | Read queries: get sessions, diffs, comments, turn state       |
| `lib/menus/collaborative-diff.ts`                                   | Pure function: compute diff between menu versions             |
| `lib/menus/collaborative-types.ts`                                  | Shared types for edit sessions, changes, comments             |
| `app/(client)/my-events/[id]/edit-menu/page.tsx`                    | Client edit mode entry point                                  |
| `app/(client)/my-events/[id]/edit-menu/edit-menu-client.tsx`        | Client-side edit UI                                           |
| `app/(client)/my-events/[id]/edit-menu/dish-swap-picker.tsx`        | Dish suggestion/swap component                                |
| `app/(chef)/events/[id]/menu-review/page.tsx`                       | Chef proposal review page                                     |
| `app/(chef)/events/[id]/menu-review/diff-view.tsx`                  | Side-by-side diff component                                   |
| `app/(chef)/events/[id]/menu-review/change-resolution.tsx`          | Accept/reject/counter per change                              |
| `components/menus/turn-indicator.tsx`                               | "Whose turn" badge component                                  |
| `components/menus/inline-comment.tsx`                               | Comment thread on a dish/course                               |
| `components/menus/circle-vote-bar.tsx`                              | Dinner circle vote display                                    |
| `lib/menus/menu-collaboration-notifications.ts`                     | Email/notification triggers for turn changes                  |

---

## Files to Modify

| File                                                                | Change                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `lib/events/menu-approval-actions.ts`                               | Extend `sendMenuForApproval` to optionally open collaboration mode |
| `lib/menus/foh-menu-client-actions.ts`                              | Add `getEditableMenuForClient` query                               |
| `app/(client)/my-events/[id]/approve-menu/menu-approval-client.tsx` | Add "Suggest Changes" button that enters edit mode                 |
| `app/(client)/my-events/[id]/approve-menu/page.tsx`                 | Route to edit mode when session is active                          |
| `lib/db/schema/schema.ts`                                           | Add new table exports (after migration)                            |
| `lib/notifications/channel-router.ts`                               | Add collaboration turn-change notification routing                 |
| `app/(chef)/events/[id]/page.tsx`                                   | Show turn indicator and pending proposals count                    |
| `lib/email/templates/`                                              | New email template: "Your client suggested menu changes"           |
| `app/(client)/my-events/[id]/choose-menu/page.tsx`                  | Add "Customize This" fork button for showcase menus                |

---

## Database Changes

### New Enum

```sql
CREATE TYPE menu_edit_session_status AS ENUM (
  'draft',        -- editor is still working
  'submitted',    -- sent to other party for review
  'accepted',     -- all changes resolved positively
  'rejected',     -- session rejected wholesale
  'superseded'    -- newer session replaced this one
);

CREATE TYPE menu_change_type AS ENUM (
  'swap_dish',       -- replace one dish with another
  'remove_dish',     -- remove a dish/course
  'add_dish',        -- request a new dish
  'reorder',         -- change course order
  'modify_details',  -- change description/notes on existing dish
  'add_course',      -- add an entire new course
  'remove_course'    -- remove an entire course
);

CREATE TYPE menu_change_resolution AS ENUM (
  'pending',         -- not yet reviewed
  'accepted',        -- chef accepted this change
  'rejected',        -- chef rejected with reason
  'counter_proposed' -- chef offered alternative
);

CREATE TYPE menu_editor_type AS ENUM (
  'chef',
  'client',
  'co_host'
);
```

### New Table: `menu_edit_sessions`

```sql
CREATE TABLE menu_edit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Who is editing
  editor_type menu_editor_type NOT NULL,
  editor_id UUID NOT NULL,  -- client_id, chef_id, or hub_guest_profile_id

  -- Fork reference (if this session started from a fork)
  forked_from_menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,

  -- Versioning
  version_number INTEGER NOT NULL DEFAULT 1,
  base_snapshot JSONB NOT NULL,       -- menu state when session started
  proposed_snapshot JSONB,            -- menu state after all changes applied

  -- Turn tracking
  current_turn menu_editor_type NOT NULL DEFAULT 'client',
  turn_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Status
  status menu_edit_session_status NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_edit_sessions_menu ON menu_edit_sessions(menu_id);
CREATE INDEX idx_menu_edit_sessions_event ON menu_edit_sessions(event_id);
CREATE INDEX idx_menu_edit_sessions_tenant ON menu_edit_sessions(tenant_id, status);
CREATE INDEX idx_menu_edit_sessions_editor ON menu_edit_sessions(editor_type, editor_id);
CREATE INDEX idx_menu_edit_sessions_turn ON menu_edit_sessions(current_turn, status)
  WHERE status IN ('draft', 'submitted');
```

### New Table: `menu_edit_changes`

```sql
CREATE TABLE menu_edit_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES menu_edit_sessions(id) ON DELETE CASCADE,

  -- What changed
  change_type menu_change_type NOT NULL,
  target_dish_id UUID,              -- existing dish being modified/removed
  target_course_name TEXT,          -- course context
  target_course_number INTEGER,

  -- The change payload
  change_data JSONB NOT NULL DEFAULT '{}',
  /*
    swap_dish:       { original_dish: {...}, proposed_dish: { name, description, notes } }
    remove_dish:     { dish: {...}, reason: "..." }
    add_dish:        { name, description, course_name, notes }
    reorder:         { dish_id, from_position, to_position }
    modify_details:  { field, old_value, new_value }
    add_course:      { course_name, course_number, dishes: [...] }
    remove_course:   { course_name, course_number, reason }
  */

  -- Resolution (filled by chef)
  resolution menu_change_resolution NOT NULL DEFAULT 'pending',
  resolution_notes TEXT,
  counter_proposal JSONB,           -- chef's alternative if counter_proposed

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_menu_edit_changes_session ON menu_edit_changes(session_id, sort_order);
CREATE INDEX idx_menu_edit_changes_pending ON menu_edit_changes(session_id)
  WHERE resolution = 'pending';
```

### New Table: `menu_comments`

```sql
CREATE TABLE menu_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES menu_edit_sessions(id) ON DELETE SET NULL,

  -- What it's attached to
  target_dish_id UUID,
  target_course_name TEXT,
  -- If both null, it's a general menu comment

  -- Who commented
  author_type menu_editor_type NOT NULL,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,         -- denormalized for display

  -- Threading
  parent_comment_id UUID REFERENCES menu_comments(id) ON DELETE CASCADE,

  -- Content
  body TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_comments_menu ON menu_comments(menu_id, created_at);
CREATE INDEX idx_menu_comments_dish ON menu_comments(target_dish_id)
  WHERE target_dish_id IS NOT NULL;
CREATE INDEX idx_menu_comments_session ON menu_comments(session_id)
  WHERE session_id IS NOT NULL;
CREATE INDEX idx_menu_comments_unresolved ON menu_comments(menu_id)
  WHERE is_resolved = false;
```

### New Table: `menu_circle_votes`

```sql
CREATE TABLE menu_circle_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  dish_id UUID,                      -- specific dish, or null for course-level
  course_name TEXT,

  -- Voter (dinner circle member)
  voter_profile_id UUID NOT NULL,    -- hub_guest_profiles.id
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),  -- thumbs down / up

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(menu_id, dish_id, voter_profile_id)
);

CREATE INDEX idx_menu_circle_votes_menu ON menu_circle_votes(menu_id);
CREATE INDEX idx_menu_circle_votes_dish ON menu_circle_votes(dish_id)
  WHERE dish_id IS NOT NULL;
```

### New Table: `menu_edit_history`

```sql
CREATE TABLE menu_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  session_id UUID REFERENCES menu_edit_sessions(id) ON DELETE SET NULL,

  -- Version snapshot
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,              -- human-readable: "Client swapped dessert, added appetizer"

  -- Who created this version
  author_type menu_editor_type NOT NULL,
  author_id UUID NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_edit_history_menu ON menu_edit_history(menu_id, version_number);
```

### RLS Policies

```sql
-- menu_edit_sessions: chef sees all for their tenant, client sees their own
ALTER TABLE menu_edit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY mes_chef_all ON menu_edit_sessions
  FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id() AND get_current_user_role() = 'chef');

CREATE POLICY mes_client_select ON menu_edit_sessions
  FOR SELECT TO authenticated
  USING (editor_type = 'client' AND editor_id = get_current_entity_id());

CREATE POLICY mes_client_insert ON menu_edit_sessions
  FOR INSERT TO authenticated
  WITH CHECK (editor_type = 'client' AND editor_id = get_current_entity_id());

CREATE POLICY mes_client_update ON menu_edit_sessions
  FOR UPDATE TO authenticated
  USING (editor_type = 'client' AND editor_id = get_current_entity_id() AND status = 'draft');

-- menu_edit_changes: follows session access
ALTER TABLE menu_edit_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY mec_via_session ON menu_edit_changes
  FOR ALL TO authenticated
  USING (session_id IN (SELECT id FROM menu_edit_sessions));

-- menu_comments: visible to all event participants
ALTER TABLE menu_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY mc_chef ON menu_comments
  FOR ALL TO authenticated
  USING (event_id IN (SELECT id FROM events WHERE tenant_id = get_current_tenant_id()));

CREATE POLICY mc_client ON menu_comments
  FOR SELECT TO authenticated
  USING (author_type = 'client' AND author_id = get_current_entity_id()
    OR event_id IN (SELECT event_id FROM menu_edit_sessions WHERE editor_id = get_current_entity_id()));

-- menu_circle_votes: circle members can vote, chef can read
ALTER TABLE menu_circle_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcv_voter ON menu_circle_votes
  FOR ALL TO authenticated
  USING (voter_profile_id IN (SELECT id FROM hub_guest_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY mcv_chef_read ON menu_circle_votes
  FOR SELECT TO authenticated
  USING (menu_id IN (SELECT id FROM menus WHERE tenant_id = get_current_tenant_id()));
```

---

## State Machine / Rules

### Session Status Transitions

```
draft -> submitted       (client/co_host submits their changes)
submitted -> accepted    (chef accepts all changes)
submitted -> rejected    (chef rejects the session)
submitted -> draft       (chef counter-proposes, turn passes back)
draft -> superseded      (new session created, old one auto-superseded)
any -> superseded        (menu finalized via other path)
```

### Turn Rules

| Action                              | Turn passes to          |
| ----------------------------------- | ----------------------- |
| Chef sends menu for collaboration   | client                  |
| Client submits changes              | chef                    |
| Chef accepts all                    | session closes, no turn |
| Chef rejects all                    | session closes, no turn |
| Chef counter-proposes on any change | client                  |
| Client accepts counter-proposals    | chef (for final commit) |

### Constraints

1. **One active session per menu.** Creating a new session supersedes any existing draft/submitted session.
2. **Chef cannot edit while client has an active draft.** Must wait for submission or cancel the session.
3. **Client edits are never applied directly.** Always stored as proposals in `menu_edit_changes`.
4. **Session expires after 14 days of inactivity.** Status -> superseded, notification sent.
5. **Rate limiting:** Client can create max 3 sessions per menu per 24 hours (prevents spam).
6. **Version monotonicity:** `version_number` on `menu_edit_history` only increments. No gaps.
7. **Snapshot immutability:** Once a `menu_edit_history` row is created, its `snapshot` column is never updated.

### Integration with Existing Approval Flow

The collaborative editing layer sits BEFORE the formal approval:

```
Menu created (draft)
    -> Collaboration phase (0 or more edit sessions)
    -> Chef finalizes menu
    -> Send for formal approval (existing menu_approval_requests flow)
    -> Client approves or requests revision
```

If a client requests revision via the existing flow AND collaboration is enabled, the system auto-creates a new edit session instead of just storing revision_notes.

---

## Edge Cases

1. **Client submits changes, then chef edits menu directly before reviewing.** The session's `base_snapshot` no longer matches current menu. Solution: detect drift, show chef a 3-way merge view (base, current, proposed). Chef resolves conflicts.

2. **Multiple co-hosts submit simultaneously.** Only one active session per menu. Second co-host gets "Menu is being edited by [name], you'll be notified when it's your turn."

3. **Client removes a dish that the chef already prepped for.** Chef sees this as a proposal with a warning: "This dish has associated prep work." Rejection reason auto-populated.

4. **Self-fork of a menu that gets updated after forking.** Fork is independent. Chef can see "forked from v3, current is v5" but no auto-merge. Client's fork stands as submitted.

5. **Session expires mid-edit.** Client's draft changes preserved in `changes_json` but session marked superseded. Client can view their old suggestions but must start a new session.

6. **Circle votes after menu is finalized.** Votes are informational only and never block finalization. Late votes still recorded for chef reference on future events.

7. **Client adds a dish the chef has never heard of.** That's fine; `add_dish` change type stores free-text. Chef can reject, accept (and create the dish), or counter-propose something similar.

8. **Co-host and client both want to edit.** Turn-based: one at a time. Chef can invite either. If both need access, chef creates separate sessions sequentially.

9. **Menu has no dishes yet (blank slate collaboration).** Valid. Client can use `add_dish` and `add_course` change types on an empty menu. Chef reviews the entire proposed structure.

10. **Client tries to edit after formal approval.** Blocked. Once `menu_approval_requests.status = 'approved'`, no new edit sessions can be created without chef explicitly reopening.

---

## Definition of Done

- [ ] Migration runs clean on production without data loss
- [ ] Client can enter edit mode from their event portal and submit dish change proposals
- [ ] Chef sees pending proposals on their event page with a clear turn indicator
- [ ] Chef can accept, reject (with reason), or counter-propose each individual change
- [ ] Counter-proposals pass turn back to client for review
- [ ] Every resolved session produces a new entry in `menu_edit_history`
- [ ] Self-fork flow: client can fork a showcase menu and submit it as a proposal
- [ ] Inline comments work on dishes and courses, with threading
- [ ] Dinner circle members can vote on dishes; vote counts visible to chef
- [ ] Turn-change triggers email notification to the waiting party
- [ ] Session auto-expires after 14 days of inactivity
- [ ] Rate limiting: max 3 sessions per menu per 24 hours per client
- [ ] Existing approval flow still works unchanged for chefs who don't use collaboration
- [ ] "Suggest Changes" on the approval page creates a new edit session (bridges old and new)
- [ ] Version history page shows all snapshots with ability to revert
- [ ] RLS policies pass: client cannot see other clients' sessions, chef sees all for their tenant
- [ ] Mobile-responsive: edit mode works on phone (clients often respond from mobile)
- [ ] No direct menu mutations from client actions; all changes are proposals
- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] `npx next build --no-lint` passes
