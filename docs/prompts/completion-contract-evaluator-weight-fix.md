# Fix: Completion Contract Evaluator Weight Bugs

## What This Is

The Completion Contract (`lib/completion/`) evaluates entity readiness across ChefFlow. Each evaluator returns a score from 0-100 based on weighted requirements. The function `deriveStatus()` in `lib/completion/types.ts` line 41 checks `score === 100` to return `'complete'` status.

Three evaluators have broken weights, making correct status impossible.

## Rules

- Read `CLAUDE.md` before making any changes.
- Never use em dashes. Use commas, semicolons, colons, or separate sentences.
- Do NOT modify `lib/completion/types.ts`, `lib/completion/engine.ts`, or `lib/completion/actions.ts`.
- Do NOT modify `lib/completion/evaluators/event.ts` or `lib/completion/evaluators/ingredient.ts`.
- Do NOT change any logic, queries, boolean checks, imports, or types.
- ONLY change `weight:` integer values and add one new requirement object to menu.ts.
- After all changes, every evaluator's weights MUST sum to exactly 100.

---

## Fix 1: Recipe Evaluator (105 -> 100)

**File:** `lib/completion/evaluators/recipe.ts`

The `peak_window` requirement was added (weight 5) without reducing other weights. Current total: 5+20+15+15+15+10+10+5+5+5 = 105.

**Changes (4 lines, reduce by 5 total):**

Line 75, change:

```
      weight: 20,
```

to:

```
      weight: 18,
```

Line 88, change:

```
      weight: 15,
```

to:

```
      weight: 14,
```

Line 98, change:

```
      weight: 15,
```

to:

```
      weight: 14,
```

Line 108, change:

```
      weight: 15,
```

to:

```
      weight: 14,
```

**Verify:** 5+18+14+14+14+10+10+5+5+5 = 100

---

## Fix 2: Client Evaluator (90 -> 100)

**File:** `lib/completion/evaluators/client.ts`

`Math.round(N * 0.9)` applied to each weight individually loses 10 points to rounding. The scaled subtotal is 80, not 90. Plus 5+5 for new fields = 90 total.

**Fix:** Delete the `scale` variable. Replace every `Math.round(N * scale)` with a hardcoded integer. Increase `has_event` and `valid_contact` weights from 5 to 10 each.

Delete line 27:

```
  const scale = 0.9
```

Then replace every `weight:` value in the requirements array:

| Requirement key       | Old weight expression         | New weight |
| --------------------- | ----------------------------- | ---------- |
| `allergies`           | `Math.round(15 * scale)` = 14 | `14`       |
| `dietary`             | `Math.round(12 * scale)` = 11 | `11`       |
| `contact`             | `Math.round(8 * scale)` = 7   | `7`        |
| `kitchen_constraints` | `Math.round(8 * scale)` = 7   | `7`        |
| `cuisines`            | `Math.round(6 * scale)` = 5   | `5`        |
| `dislikes`            | `Math.round(6 * scale)` = 5   | `5`        |
| `vibe`                | `Math.round(6 * scale)` = 5   | `5`        |
| `remaining_profile`   | `Math.round(29 * scale)` = 26 | `26`       |
| `has_event`           | `5`                           | `10`       |
| `valid_contact`       | `5`                           | `10`       |

**Verify:** 14+11+7+7+5+5+5+26+10+10 = 100

Here is the exact replacement for the full requirements array (lines 28-134). Replace everything from `const reqs:` through the closing `]` with:

```typescript
const reqs: CompletionRequirement[] = [
  {
    key: 'allergies',
    label: 'Allergies confirmed',
    met: Array.isArray(client.allergies) && client.allergies.length > 0,
    blocking: true,
    weight: 14,
    category: 'safety',
    actionUrl: clientUrl,
    actionLabel: 'Confirm allergies',
  },
  {
    key: 'dietary',
    label: 'Dietary restrictions',
    met: Array.isArray(client.dietary_restrictions) && client.dietary_restrictions.length > 0,
    blocking: false,
    weight: 11,
    category: 'safety',
    actionUrl: clientUrl,
    actionLabel: 'Add dietary info',
  },
  {
    key: 'contact',
    label: 'Contact info (phone or email)',
    met:
      (typeof client.phone === 'string' && client.phone.trim().length > 0) ||
      (typeof client.email === 'string' && client.email.trim().length > 0),
    blocking: true,
    weight: 7,
    category: 'profile',
    actionUrl: clientUrl,
    actionLabel: 'Add contact info',
  },
  {
    key: 'kitchen_constraints',
    label: 'Kitchen constraints',
    met:
      typeof client.kitchen_constraints === 'string' &&
      client.kitchen_constraints.trim().length > 0,
    blocking: false,
    weight: 7,
    category: 'logistics',
    actionUrl: clientUrl,
    actionLabel: 'Document kitchen',
  },
  {
    key: 'cuisines',
    label: 'Preferred cuisines',
    met: Array.isArray(client.favorite_cuisines) && client.favorite_cuisines.length > 0,
    blocking: false,
    weight: 5,
    category: 'profile',
    actionUrl: clientUrl,
    actionLabel: 'Set cuisine prefs',
  },
  {
    key: 'dislikes',
    label: 'Dislikes documented',
    met: Array.isArray(client.dislikes) && client.dislikes.length > 0,
    blocking: false,
    weight: 5,
    category: 'safety',
    actionUrl: clientUrl,
    actionLabel: 'Add dislikes',
  },
  {
    key: 'vibe',
    label: 'Vibe notes',
    met: typeof client.vibe_notes === 'string' && client.vibe_notes.trim().length > 0,
    blocking: false,
    weight: 5,
    category: 'profile',
    actionUrl: clientUrl,
    actionLabel: 'Add vibe notes',
  },
  {
    key: 'remaining_profile',
    label: 'Extended profile fields',
    met: profile.score >= 60,
    blocking: false,
    weight: 26,
    category: 'profile',
    actionUrl: clientUrl,
    actionLabel: 'Complete profile',
  },
  {
    key: 'has_event',
    label: 'Has at least 1 event',
    met: Number(client.total_events_count || 0) > 0,
    blocking: false,
    weight: 10,
    category: 'profile',
  },
  {
    key: 'valid_contact',
    label: 'Has verified contact method',
    met:
      (typeof client.email === 'string' && client.email.includes('@')) ||
      (typeof client.phone === 'string' && client.phone.replace(/\D/g, '').length >= 10),
    blocking: false,
    weight: 10,
    category: 'communication',
    actionUrl: clientUrl,
    actionLabel: 'Verify contact',
  },
]
```

---

## Fix 3: Menu Evaluator (missing requirement + rebalance)

**File:** `lib/completion/evaluators/menu.ts`

The spec requires 9 menu requirements. Implementation has 8. Missing: "All dishes have components" (weight 15). To compensate, `client_approved` was inflated from 5 to 20. The weights still sum to 100, but the coverage is wrong: a menu with empty dishes (no components) is not flagged.

### Step A: Add a query for dishes without components

After the existing `components` query block (around line 37), add a new query. Insert this code after line 39 (`const allHaveRecipes = totalComponents > 0 && withRecipes.length === totalComponents`):

```typescript
// Check for dishes with zero components
const [emptyDishCheck] = await pgClient<{ empty_count: string }[]>`
    SELECT COUNT(*)::text AS empty_count
    FROM dishes d
    WHERE d.menu_id = ${menuId}
      AND NOT EXISTS (
        SELECT 1 FROM components c WHERE c.dish_id = d.id
      )
  `
const allDishesHaveComponents =
  health.dishCount > 0 && Number(emptyDishCheck?.empty_count || 0) === 0
```

### Step B: Add the missing requirement to the array

Insert this new requirement object immediately AFTER the `has_dishes` requirement (after line 73, before the `all_components_reciped` entry):

```typescript
    {
      key: 'all_dishes_have_components',
      label: 'All dishes have components',
      met: allDishesHaveComponents,
      blocking: false,
      weight: 10,
      category: 'culinary',
      actionUrl: menuUrl,
      actionLabel: 'Add components to dishes',
    },
```

### Step C: Rebalance weights

Change these existing weights so the total stays at 100:

| Requirement key              | Old weight | New weight |
| ---------------------------- | ---------- | ---------- |
| `has_dishes`                 | 15         | 10         |
| `all_dishes_have_components` | (new)      | 10         |
| `all_components_reciped`     | 15         | 15         |
| `recipes_complete`           | 15         | 15         |
| `all_priced`                 | 15         | 15         |
| `allergens_reviewed`         | 10         | 10         |
| `not_draft`                  | 5          | 5          |
| `linked_to_event`            | 5          | 5          |
| `client_approved`            | 20         | 15         |

**Verify:** 10+10+15+15+15+10+5+5+15 = 100

The exact weight changes in the existing requirements:

- `has_dishes` weight: change `15` to `10` (around line 69)
- `client_approved` weight: change `20` to `15` (around line 133)

---

## Verification

Run this command after all changes:

```bash
npx tsc --noEmit --skipLibCheck
```

It must exit with 0 errors.

Then manually verify weight sums. For each evaluator file, add up every `weight:` value:

- `event.ts`: should be 100 (unchanged)
- `menu.ts`: should be 100 (was 100, added 10, reduced 15 from has_dishes and 5 from client_approved)
- `recipe.ts`: should be 100 (was 105, reduced by 5)
- `client.ts`: should be 100 (was 90, increased by 10)
- `ingredient.ts`: should be 100 (unchanged)

## Files Changed

Only these 3 files:

1. `lib/completion/evaluators/recipe.ts` - 4 weight value changes
2. `lib/completion/evaluators/client.ts` - delete `scale` variable, replace `Math.round(N * scale)` with integers, increase 2 weights
3. `lib/completion/evaluators/menu.ts` - add 1 query, add 1 requirement, change 2 weights
