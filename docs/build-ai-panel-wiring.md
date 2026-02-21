# AI Panel Wiring — Four Page Files

## What Changed

Four existing page files had AI assistant panels wired in as non-blocking UI additions. No server actions, database queries, or business logic were altered.

---

## Files Modified

### 1. `app/(chef)/culinary/recipes/[id]/page.tsx`

- **Import added:** `RecipeScalingPanel` from `@/components/ai/recipe-scaling-panel`
- **Panel added:** `<RecipeScalingPanel recipeId={params.id} defaultServings={r.default_servings ?? r.servings ?? 4} />`
- **Position:** After the existing `<NutritionLookupPanel>`, before the closing `</div>` of the `space-y-6` wrapper
- **Why:** Recipe detail is the natural home for AI-assisted scaling suggestions. The panel receives the recipe ID and a sensible default serving count derived from the recipe's own fields.

---

### 2. `app/(chef)/finance/tax/depreciation/page.tsx`

- **Import added:** `EquipmentDepreciationPanel` from `@/components/ai/equipment-depreciation-panel`
- **Panel added:** `<EquipmentDepreciationPanel />`
- **Position:** After the existing `<DepreciationSchedulePanel>`, before the closing `</div>`
- **Why:** The depreciation page presents Section 179 / straight-line numbers but provides no plain-language guidance. The AI panel gives chefs a plain-English explanation of the deduction rules without cluttering the schedule table.

---

### 3. `app/(chef)/settings/compliance/page.tsx`

- **Import added:** `PermitChecklistPanel` from `@/components/ai/permit-checklist-panel`
- **Panel added:** `<PermitChecklistPanel />`
- **Position:** After the "Add Certification" Card, before the closing `</div>` of the `space-y-6` wrapper
- **Why:** The compliance page tracks existing certs but gives no guidance on what to renew or what permits may be missing. The AI panel surfaces a contextual permit renewal checklist.

---

### 4. `app/(chef)/marketing/page.tsx`

- **Import added:** `TestimonialPanel` from `@/components/ai/testimonial-panel`
- **Panel added:** `<TestimonialPanel />`
- **Position:** After the "New Campaign" Card block, before the final closing `</div>` of the outer `space-y-6` wrapper
- **Why:** The marketing hub is where chefs think about outreach. Adding a testimonial-request AI panel here connects the campaign workflow to reputation-building in one place.

---

## Implementation Notes

- Python was not available in the shell environment; Node.js (`v24.12.0`) was used for all file transformations.
- Files used Windows line endings (`\r\n`). All replacements preserved the native line endings to avoid diffs that touch every line.
- Each replacement was validated to match exactly once before writing — the script exits non-zero if a pattern is missing or matches multiple times.
- All eight expected strings (4 imports + 4 usages) were confirmed present after patching.
- No migrations, server actions, or database changes were made.
- No new npm packages were added — all panels were already built and listed in `components/ai/`.

---

## Connection to System

These panels follow the AI Policy (`docs/AI_POLICY.md`) — they surface suggestions and drafts only. No panel writes to canonical state. Each is a read-only assistant surface sitting alongside existing data-driven UI.
