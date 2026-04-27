---
name: seam
description: '"Inside-out and backwards" refinement lens inspired by Adam Savage. Examines ChefFlow surfaces as planar forms meeting under rules and conditions. Finds seam failures, reversed assumptions, and order-of-operations violations. Repeatable - run until dry.'
user-invocable: true
---

# Seam Analysis

"Inside-out and backwards" refinement lens inspired by Adam Savage's fabrication philosophy.

Every UI surface, data flow, and user workflow is a set of **planar forms meeting under rules and conditions**. Where two planes meet is a **seam**. Seams fail when assumptions reverse, order-of-operations breaks, or edge cases create gaps.

## Procedure

### 1. Select Surface

User provides a surface (page, flow, feature) or say "full sweep" for the whole app.

For a full sweep, work through `docs/app-complete-audit.md` surface by surface.

### 2. Identify Seams

For each surface, map every point where two systems meet:

- **Data seams:** where DB -> server action -> UI component boundaries exist
- **Auth seams:** where role checks gate content or actions
- **State seams:** where optimistic UI meets server reality
- **Flow seams:** where user path A meets user path B (e.g., new vs returning)
- **Time seams:** where stale data meets fresh data (cache, SSE, polling)
- **Money seams:** where amounts cross calculation boundaries

### 3. Test Each Seam "Inside-Out and Backwards"

For each seam, ask:

1. **Reverse it.** What if the assumption is wrong? (User has no events. User has 1000 events. Amount is negative. Date is in the past.)
2. **Flip the order.** What if step 2 happens before step 1? (Payment before quote. Cancel before confirm. Edit during save.)
3. **Remove a plane.** What if one side of the seam is missing? (No recipe on the menu. No menu on the event. No client on the event.)
4. **Double it.** What if both sides fire twice? (Double-click submit. Two tabs open. SSE reconnect replays.)

### 4. Score Findings

For each seam failure:

| Severity | Definition                                     |
| -------- | ---------------------------------------------- |
| **P0**   | Data loss, financial error, or security bypass |
| **P1**   | Broken flow (user gets stuck, sees wrong data) |
| **P2**   | Cosmetic or confusing but recoverable          |

### 5. Output Format

```
## Seam Analysis: [Surface Name]

### Seams Found: [count]
### Failures: [count] (P0: X, P1: X, P2: X)

---

#### Seam: [Name] ([type]: [plane A] meets [plane B])

**Test:** [which test found it - reverse/flip/remove/double]
**Finding:** [what breaks]
**Severity:** P0/P1/P2
**Fix:** [exact change needed]
**File:** [path:line]

---
```

## Rules

- Repeatable. Run again after fixes. Keep running until zero new findings ("run until dry").
- Every finding must cite a file path and line number. No vague claims.
- P0 findings get fixed immediately. Don't just report them.
- This is a refinement tool, not an architecture tool. It finds where existing work has seam gaps, not where new work is needed.
- Pair with `/audit` for comprehensive coverage. Seam analysis goes deeper on fewer surfaces.
