# Service Lifecycle Intelligence - Build Summary

> **Date:** 2026-03-30
> **Spec:** `docs/specs/service-lifecycle-intelligence.md`
> **Status:** built (Components 1-3)

## What Was Built

The Service Lifecycle Intelligence Layer: an auto-detection system that watches all communication streams and maps conversations to the 10-stage Service Lifecycle Blueprint's 200+ checkpoints.

### Files Created

| File                                                                   | Purpose                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `database/migrations/20260401000142_service_lifecycle_checkpoints.sql` | 3 new tables: templates, progress, detection log                       |
| `lib/lifecycle/seed.ts`                                                | ~150 checkpoint definitions from the blueprint, idempotent seeder      |
| `lib/lifecycle/detector.ts`                                            | Detection engine: field presence, regex text matching, Ollama fallback |
| `lib/lifecycle/actions.ts`                                             | Server actions (public + internal variants for pipeline use)           |
| `components/lifecycle/lifecycle-progress-panel.tsx`                    | Chef-facing UI: stage pills, checkpoint lists, draft email button      |
| `components/hub/lifecycle-client-view.tsx`                             | Client-facing UI: simplified status view for Dinner Circle             |

### Files Modified

| File                                                 | Change                                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| `lib/gmail/sync.ts`                                  | Two hooks: new inquiry detection + existing inquiry message detection |
| `lib/inquiries/actions.ts`                           | Three hooks: createInquiry, updateInquiry, transitionInquiry          |
| `app/(chef)/inquiries/[id]/page.tsx`                 | Added lifecycle progress query + panel below CriticalPathCard         |
| `app/(public)/hub/g/[groupToken]/page.tsx`           | Added lifecycle client query                                          |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` | Added lifecycle client view prop + render                             |

## Architecture

### Detection Pipeline (Formula > AI)

1. **Field presence** (instant, 1.0 confidence): checks inquiry/event columns directly
2. **Regex text matching** (instant, 0.85 confidence): 12 pattern groups for dietary, cuisine, service style, etc.
3. **Ollama fallback** (slow, 0.6-0.9 confidence): only for stages 1-3 checkpoints not caught by deterministic methods

If Ollama is offline, steps 1-2 still run. Detection is partial, never zero.

### Auth Split

- **Public actions** (UI-triggered): use `requireChef()`, export from `'use server'` file
- **Internal functions** (pipeline-triggered): accept `chefId` directly, use admin DB client
- Gmail sync runs with admin client (no session), so it calls internal variants

### Integration Points

- Gmail sync: detects on new inquiry creation AND on every new message for existing inquiries
- Inquiry actions: detects on create, update (field changes), and status transitions
- Detection is always non-blocking (wrapped in try/catch, never breaks the main operation)

## What's NOT Built (Deferred)

- **Dashboard integration**: stage indicators on inquiry cards (low priority enhancement)
- **Prediction Engine (Component 4)**: 50+ rules in `docs/research/predictive-lifecycle-engine.md`, needs own spec
- **Email draft auto-send**: drafts are generated, chef sends manually
- **SMS/screenshot detection**: same pipeline, different input source, future spec

## Verification

- `npx tsc --noEmit --skipLibCheck`: passes (0 errors in lifecycle files)
- `npx next build --no-lint`: passes (BUILD_ID: 24c4eda4)
- Migration is additive only (3 new tables, no existing tables modified)
- Seed is idempotent (ON CONFLICT DO NOTHING)
- All detection hooks are non-blocking (try/catch, console.error on failure)
