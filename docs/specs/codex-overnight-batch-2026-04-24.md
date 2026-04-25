# Codex Overnight Batch: 2026-04-24

> Senior engineer recommendation. 7 tasks across 5 Codex agents. All parallelizable. Zero DB migrations. Zero regression risk.

## Strategy

Build is green (tsc + next build passed 2026-04-24). 200+ dirty files on main but baseline is stable. This batch targets the highest-value, lowest-risk work that Codex can execute reliably overnight.

**Selection criteria:**

- Exact find/replace specs with complete code provided
- No database migrations (schema sync gap is separately tracked)
- No multi-file reasoning chains
- Independent files (no two tasks touch the same file)
- Each task verifiable by `npx tsc --noEmit --skipLibCheck`

**Deliberately excluded:**

- `live-service-execution-tracker.md`: Requires DB migration + substantial component authoring from behavioral descriptions. Codex would need to write a live timer, course-grouping logic, and thread props through event detail. Hold for Opus session.
- Palace audit Agent 1 (memory cleanup): Memory file editing, not code. Better done in an interactive Claude Code session where context is live.
- Completion Contract, Ticketed Events: Too complex. 10+ files, recursive resolution, Stripe wiring. Opus-tier work.

---

## Task 1: Three Trivial UI Text Fixes

**Files:** 3 files, 0 new, 3 edits
**Risk:** Negligible. Text-only and CSS-only changes in completely separate files.
**Specs:** `codex-fix-chat-empty-state.md`, `codex-fix-dev-note-circles.md`, `codex-fix-quote-phantom-terms.md`

| Fix                                                               | File                                                              | Change                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| Chat empty state wrong copy for clients                           | `components/chat/chat-inbox.tsx`                                  | Add `basePath` conditional for role-aware empty message   |
| Dev note leaked to public circles page                            | `app/(public)/hub/circles/page.tsx`                               | Delete one internal sentence                              |
| Phantom "terms" in quote acceptance modal + dark-on-dark contrast | `quote-response-buttons.tsx` + `page.tsx` under `my-quotes/[id]/` | Change string literal + swap `text-*-800` to `text-*-200` |

---

## Task 2: Auto-Join Consent Guard

**Files:** 1 file, 0 new, 1 edit
**Risk:** Low. Single logic guard. Spec provides 3 fallback approaches.
**Spec:** `codex-fix-auto-join-consent.md`

Hub group page silently calls `joinHubGroup()` on every page load. Fix: check membership first, skip auto-join for non-members.

---

## Task 3: Rebooking Prefill

**Files:** 2 files, 0 new, 2 edits
**Risk:** Low-medium. Adds optional prop to shared form component. Spec provides full file replacement for page and step-by-step for form.
**Spec:** `codex-fix-rebooking-prefill.md`

Returning clients re-enter all personal info on re-booking. Fix: fetch client profile server-side, pass as `defaultValues` to form.

---

## Task 4: Price Flag Resolution UI

**Files:** 3 files, 2 new, 1 edit
**Risk:** Low. Purely additive. Complete component code provided. Backend already built.
**Spec:** `price-flag-resolution-ui.md`

Flagged ingredient prices are invisible. Fix: banner on ingredients page with Accept/Reject per item.

---

## Task 5: Purchase Feedback Panel

**Files:** 2 files, 1 new, 1 edit
**Risk:** Low. Purely additive. Complete component code provided. Server function already built.
**Spec:** `purchase-feedback-panel.md`

Recipe over-buy analysis is computed but never displayed. Fix: read-only panel on recipe detail page.

---

## Verification Matrix

Every task must pass this before completion:

```
npx tsc --noEmit --skipLibCheck    # must exit 0
```

Tasks 4 and 5 should also pass:

```
npx next build --no-lint           # must exit 0 (only if machine can handle it)
```

## Post-Merge Checklist (for developer)

After reviewing all branches:

1. Run `node devtools/codex-review.mjs` to get summary
2. Merge passing branches to main
3. Run full `npx tsc --noEmit --skipLibCheck` on merged result
4. Update `docs/build-state.md`
