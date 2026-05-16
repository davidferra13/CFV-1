# Spec: Clean Stop Resume Trails

> **Status:** draft
> **Priority:** P1
> **Depends on:** `docs/specs/chef-operating-loop-external-memory.md`
> **Estimated complexity:** medium (3-8 files)

## Developer Notes

### Raw Signal

The research says organized people save progress perfectly. They never trust memory alone. If they stop midway, they write the next step before walking away. A clean stop means save the work, write the next action, close the loop, schedule the return, reset the workspace, and take the break fully.

### Developer Intent

- **Core goal:** Let ChefFlow preserve enough context that a chef can resume interrupted work without asking "where was I?"
- **Key constraints:** Do not force users to fill out a form every time. Capture resume context opportunistically from existing activity, drafts, saves, and page actions.
- **Success from the developer's perspective:** Unfinished work has a restart point, next action, and proof of last change.

## What This Does

Adds resume trails for interrupted work on high-value surfaces: event setup, quote drafting, menu editing, recipe editing, client profile completion, vendor document review, and quick-note triage.

## Existing Grounding

- `lib/activity/resume.ts` already appears to collect resumable events, menus, inquiries, quotes, and notes.
- Activity logs and entity timelines already exist.
- Current feed can surface resumable units.
- The operating-loop spec already defines `resumeContext`.

## Files To Create

| File                                             | Purpose                                                     |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `lib/resume-trails/types.ts`                     | Resume trail type, next action type, and source metadata.   |
| `lib/resume-trails/derive.ts`                    | Derive trails from activity/resume/current sources.         |
| `components/resume-trails/resume-trail-card.tsx` | Compact card with last action and next step.                |
| `components/resume-trails/clean-stop-footer.tsx` | Optional footer for explicit next-step notes on edit pages. |
| `tests/unit/resume-trails.test.ts`               | Derivation and ranking coverage.                            |

## Files To Modify

| File                                               | What To Change                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `lib/activity/resume.ts`                           | Reuse or extend existing resume collection instead of duplicating it.     |
| `lib/current/collect.ts`                           | Include top resume trails as Current units if appropriate.                |
| `app/(chef)/dashboard/page.tsx`                    | Surface recent resume cards in operating-loop panel or dashboard section. |
| `app/(chef)/menus/[id]/menu-detail-client.tsx`     | Add explicit clean-stop next-step note if menu editing is interrupted.    |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx` | Add resume footer or derive last editing context.                         |
| `app/(chef)/clients/[id]/page.tsx`                 | Add resume context for incomplete profile work.                           |

## Database Changes

None for V1 if trails can be derived. If explicit clean-stop notes are needed, prefer attaching them to existing task/note/activity tables before creating new persistence.

## UI Spec

### Resume Card

- Title: entity and interrupted workflow.
- Last action: what changed and when.
- Next action: one concrete step.
- Route: continue button.
- Evidence: source activity or draft timestamp.

### Clean Stop Footer

- Small footer on edit-heavy pages.
- Lets the chef write "Next: ..." before leaving.
- Saves to existing notes/activity if possible.

## Acceptance Criteria

- Dashboard shows at least three types of resumable work when available.
- Each resume card has a last action, next action, and canonical route.
- If no resume items exist, empty state stays quiet.
- Derived trails do not create false certainty; weak trails are labeled.
- Unit tests cover ranking and missing-data behavior.

## Edge Cases

| Scenario                        | Correct Behavior                                                   |
| ------------------------------- | ------------------------------------------------------------------ |
| Draft was deleted               | Suppress or show source unavailable, never route to 404 knowingly. |
| Last action unknown             | Show "last saved" if timestamp exists; otherwise do not surface.   |
| Multiple trails for same entity | Dedup and keep the most actionable.                                |
| User completes work             | Trail disappears or moves to done/proof state.                     |

## Verification Steps

1. Create or identify interrupted menu, recipe, client profile, and inquiry/quote work.
2. Open dashboard and verify resume cards.
3. Continue from a card and verify route/context.
4. Complete the work and verify trail clears.
5. Run focused tests.
6. Capture screenshot proof.

## Out Of Scope

- Browser session replay.
- Autosaving every form in the app.
- New global draft engine.

## Queue-Ready Draft

- **Raw request / source:** Research on saving progress, writing next steps, and restarting without shame or confusion.
- **Goal:** Build resume trails for interrupted work.
- **Scope:** Derivation layer, dashboard cards, initial clean-stop footer on selected surfaces.
- **Acceptance criteria:** Last action, next action, route, evidence, deduping, truthful empty states.
- **Risks:** False resume suggestions; too much dashboard noise.
- **Verification:** route proof, unit tests, screenshots.
