# Spec: Passive Capture Triage Dock

> **Status:** draft
> **Priority:** P1
> **Depends on:** `docs/specs/chef-operating-loop-external-memory.md`, `docs/specs/android-home-screen-widgets.md`
> **Estimated complexity:** medium (3-8 files)

## Developer Notes

### Raw Signal

The research says the organized person is not organized because they remember everything. They are organized because their life has been externalized into trusted systems. Notes move fragile working memory into external storage. The point is not to inspect every signal all day. The point is to let the system catch what matters and surface anomalies, unresolved decisions, and things needing human attention.

### Developer Intent

- **Core goal:** Give chefs a low-friction place to capture raw thoughts and quickly turn them into tasks, reminders, client notes, events, menu ideas, recipe ideas, or dismissal.
- **Key constraints:** Capture must be faster than organizing. Triage must preserve the original raw note. AI suggestions may assist, but the chef decides.
- **Success from the developer's perspective:** A chef can dump a thought in seconds, return later, and ChefFlow has enough context to help route it without losing the original wording.

## What This Does

Adds a compact triage dock to the chef dashboard and a fuller quick-capture page. Raw notes enter as unstructured fragments, then get triaged into first-class ChefFlow objects or dismissed recoverably.

## Existing Grounding

- `docs/specs/android-home-screen-widgets.md` already specifies `chef_quick_notes`, widget capture, triage, and dashboard display.
- Generated schema includes `chef_quick_notes` in `lib/db/migrations/schema.ts`, so builders must verify whether the migration has actually been applied before adding any DB work.
- Existing notes, tasks, reminders, recipes dump, and client note surfaces should be reused instead of creating another note silo.

## Files To Create

| File                                                | Purpose                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `lib/quick-notes/actions.ts`                        | Chef-authenticated create, list, triage, dismiss, and restore actions. |
| `lib/quick-notes/triage.ts`                         | Deterministic routing helpers and optional Remy suggestion bridge.     |
| `components/quick-notes/passive-capture-dock.tsx`   | Dashboard dock for fast capture and top untriaged notes.               |
| `components/quick-notes/quick-note-triage-card.tsx` | Per-note triage UI.                                                    |
| `app/(chef)/quick-log/page.tsx`                     | Full quick-capture and triage page.                                    |

## Files To Modify

| File                               | What To Change                                                            |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `app/(chef)/dashboard/page.tsx`    | Mount the compact passive capture dock.                                   |
| `lib/auth/route-policy.ts`         | Register `/quick-log` under chef-protected routes if not already covered. |
| `lib/current/collect.ts`           | Optionally surface stale untriaged notes as Current units.                |
| `app/(chef)/recipes/dump/page.tsx` | Cross-link recipe-dump capture when triage detects recipe content.        |
| `lib/tasks/*`                      | Reuse existing task creation path for task triage.                        |

## Database Changes

Verify before adding anything. If `chef_quick_notes` is already migrated, reuse it. If not, add an additive migration:

```sql
CREATE TABLE chef_quick_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  text text NOT NULL,
  status text NOT NULL DEFAULT 'raw' CHECK (status IN ('raw', 'triaged', 'dismissed')),
  triaged_to_type text,
  triaged_to_id uuid,
  triaged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quick_notes_chef ON chef_quick_notes(chef_id, status, created_at DESC);
```

RLS must enforce `chef_id = current tenant`.

## Server Actions

| Action                   | Auth            | Behavior                                                       |
| ------------------------ | --------------- | -------------------------------------------------------------- |
| `createQuickNote(input)` | `requireChef()` | Creates raw note scoped to chef tenant.                        |
| `getQuickNotes(status?)` | `requireChef()` | Lists tenant notes by status.                                  |
| `triageQuickNote(input)` | `requireChef()` | Creates linked object or records a link to an existing object. |
| `dismissQuickNote(id)`   | `requireChef()` | Marks note dismissed, never deletes.                           |
| `restoreQuickNote(id)`   | `requireChef()` | Restores dismissed note to raw.                                |

## UI Spec

### Dashboard Dock

- One-line input with submit.
- Top 3 raw notes.
- Each note has route buttons: Task, Reminder, Client Note, Recipe, Event, Menu Idea, Dismiss.
- Show count of remaining raw notes.

### Full Page

- Left: raw notes.
- Center: selected note and suggested routes.
- Right: created/linked object preview and original source note.

## Acceptance Criteria

- Raw note capture works in under one visible interaction after page load.
- The original note is preserved after triage.
- Triage creates or links to real ChefFlow objects.
- Dismissed notes are recoverable.
- Empty, loading, and error states are truthful.
- All reads and writes are tenant-scoped.

## Edge Cases

| Scenario                     | Correct Behavior                                        |
| ---------------------------- | ------------------------------------------------------- |
| Empty note                   | Do not create; keep input focused.                      |
| AI suggestion low confidence | Label as suggestion and require manual route selection. |
| Linked object creation fails | Keep note raw and show error.                           |
| Duplicate note               | Allow it; do not silently merge.                        |

## Verification Steps

1. Sign in as chef.
2. Open `/dashboard`; create a raw quick note.
3. Open `/quick-log`; triage note into a task.
4. Verify task exists and quick note preserves source text.
5. Dismiss and restore a note.
6. Check console, server logs, tenant scoping, and route protection.
7. Capture dashboard and `/quick-log` screenshots.

## Out Of Scope

- Native Android widgets.
- Fully automatic AI triage.
- Voice transcription beyond device/browser native input.

## Queue-Ready Draft

- **Raw request / source:** Research on external memory, passive capture, notes, and organized human systems.
- **Goal:** Build a web quick-capture and triage dock.
- **Scope:** Dashboard dock, `/quick-log`, server actions, quick note persistence if missing.
- **Acceptance criteria:** Capture, triage, preserve original, recover dismissal, tenant scoped.
- **Risks:** Creating another note silo; AI overreach.
- **Verification:** route checks, screenshots, focused tests, auth review.
