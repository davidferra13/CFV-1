# Spec: [Feature Name]

> **Status:** draft | ready | in-progress | built | verified
> **Priority:** P0 (blocking) | P1 (next up) | P2 (queued) | P3 (backlog)
> **Depends on:** [list spec filenames this depends on, or "none"]
> **Estimated complexity:** small (1-2 files) | medium (3-8 files) | large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date             | Agent/Session     | Commit |
| --------------------- | ---------------- | ----------------- | ------ |
| Created               | YYYY-MM-DD HH:MM | [planner session] |        |
| Status: ready         | YYYY-MM-DD HH:MM | [planner session] | [hash] |
| Claimed (in-progress) |                  |                   |        |
| Spike completed       |                  |                   |        |
| Pre-flight passed     |                  |                   |        |
| Build completed       |                  |                   |        |
| Type check passed     |                  |                   |        |
| Build check passed    |                  |                   |        |
| Playwright verified   |                  |                   |        |
| Status: verified      |                  |                   |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

_The developer's actual words, cleaned up for readability but faithful to what they said. Remove filler and repetition, keep the passion and reasoning. This is the "why behind the why." If the developer was on a voice-to-text rant, capture the gold._

[Developer's words go here]

### Developer Intent

_Translate the raw signal into clear system-level requirements. What were they actually trying to achieve beneath what they said? Preserve reasoning, not just outcomes._

- **Core goal:** [one sentence]
- **Key constraints:** [what must not happen, what must be preserved]
- **Motivation:** [why this matters to the developer right now]
- **Success from the developer's perspective:** [what "done" looks like in their mind]

---

## What This Does (Plain English)

_One paragraph. What does the user see or experience after this is built? Write it so a builder agent with zero prior context understands the goal._

---

## Why It Matters

_One to two sentences. Why are we building this now? What problem does it solve?_

---

## Files to Create

_List every NEW file with its full path and a one-line description._

| File                          | Purpose              |
| ----------------------------- | -------------------- |
| `app/(chef)/example/page.tsx` | Page component for X |
| `lib/example/actions.ts`      | Server actions for X |

---

## Files to Modify

_List every EXISTING file that needs changes. Be specific about what changes._

| File                            | What to Change                         |
| ------------------------------- | -------------------------------------- |
| `components/nav/nav-config.tsx` | Add nav entry for X under Y section    |
| `lib/db/schema/example.ts`      | Will be auto-generated after migration |

---

## Database Changes

_If no DB changes, write "None" and skip the subsections._

### New Tables

```sql
-- Paste the full CREATE TABLE SQL here
```

### New Columns on Existing Tables

```sql
-- Paste the full ALTER TABLE SQL here
```

### Migration Notes

- Migration filename must be checked against existing files in `database/migrations/` (timestamp collision rule)
- Reminder: all migrations are additive. No DROP/DELETE without explicit developer approval.

---

## Data Model

_Describe the key entities and relationships. What fields matter? What are the constraints?_

---

## Server Actions

_List every server action with its signature, auth requirement, and behavior._

| Action               | Auth            | Input                   | Output                                              | Side Effects          |
| -------------------- | --------------- | ----------------------- | --------------------------------------------------- | --------------------- |
| `createThing(input)` | `requireChef()` | `{ name: string, ... }` | `{ success: boolean, id?: string, error?: string }` | Revalidates `/things` |

---

## UI / Component Spec

_Describe what the user sees. Be specific: layout, components, states._

### Page Layout

_Describe the page structure. Reference existing components where possible._

### States

- **Loading:** _what shows while data loads_
- **Empty:** _what shows when there's no data yet_
- **Error:** _what shows when the fetch fails (never show fake zeros)_
- **Populated:** _what shows with real data_

### Interactions

_What happens when the user clicks, submits, drags, etc. Be specific about optimistic updates, error handling, and rollback._

---

## Edge Cases and Error Handling

_List anything that could go wrong and what the correct behavior is._

| Scenario             | Correct Behavior                             |
| -------------------- | -------------------------------------------- |
| Server action fails  | Rollback optimistic update, show toast error |
| User has no data yet | Show empty state with guidance, not zeros    |
| Concurrent edits     | Last-write-wins with timestamp check         |

---

## Verification Steps

_How does the builder agent confirm this works? Be specific._

1. Sign in with agent account
2. Navigate to `/example`
3. Verify: page loads without errors
4. Create a new item, verify it appears in the list
5. Refresh the page, verify persistence
6. Screenshot the final result

---

## Out of Scope

_What does this spec explicitly NOT cover? Prevents scope creep._

- Not building X (that's a separate spec)
- Not changing Y (out of scope for this feature)

---

## Notes for Builder Agent

_Anything else the builder needs to know: gotchas, patterns to follow, files to reference for similar implementations._
