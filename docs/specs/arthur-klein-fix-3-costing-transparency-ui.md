# Spec: Costing Transparency UI (Confidence Tooltip + Formula Toggle)

> **Status:** ready
> **Priority:** P2 (quality-of-life from Arthur Klein stress test)
> **Estimated effort:** 1-2 hours
> **Risk level:** VERY LOW (cosmetic UI changes only, no data changes)

## What This Does (Plain English)

Two small UI improvements that help precision-focused chefs trust ChefFlow's numbers:

1. **Confidence decay tooltip:** When a chef hovers on the confidence dots in a price badge, they see the decay schedule (e.g., "75% because price is 22 days old. Schedule: 0-3d=100%, 3-14d=90%, ...").

2. **Formula toggle on menu cost breakdown:** A "Show formulas" checkbox on the menu breakdown view that renders "2.5 lb x $4.29/lb = $10.73" next to each ingredient cost instead of just "$10.73".

---

## Part A: Confidence Decay Tooltip

### File: `components/pricing/price-badge.tsx`

**Find the `ConfidenceDots` component** (the function that renders the dots using `confidenceDots()`). It currently renders dots with a simple numeric tooltip like "90% confidence".

**Change:** Enhance the tooltip to include the decay schedule. Find where the confidence tooltip is rendered and replace the tooltip text.

Look for any `title=` attribute or tooltip component near the confidence dots rendering. The current tooltip likely says something like `${Math.round(confidence * 100)}% confidence`.

**Replace with a function call:**

```typescript
function confidenceTooltipText(confidence: number, freshnessDays?: number): string {
  const pct = Math.round(confidence * 100)
  const schedule = 'Decay: 0-3d=100%, 3-14d=90%, 14-30d=75%, 30-60d=50%, 60-90d=30%, 90d+=15%'
  if (freshnessDays != null) {
    return `${pct}% confidence (price is ${freshnessDays}d old). ${schedule}`
  }
  return `${pct}% confidence. ${schedule}`
}
```

**Rules:**

- The `freshnessDays` value should come from the `ResolvedPrice` object if available. Check what props the component receives. If `freshnessDays` or `effectiveDate` or similar is available, compute days from it. If not available, just show the schedule without the age.
- Do NOT change the visual appearance of the dots themselves
- Do NOT change the `confidenceDots()` function
- Do NOT change `tierTooltipText()` or any other tooltip
- Only change the confidence dots tooltip text

---

## Part B: Formula Toggle on Menu Cost Breakdown

### File: `components/culinary/menu-breakdown-view.tsx`

**What exists now:** A collapsible tree showing Menu > Course > Dish > Component > Recipe > Ingredient. Each ingredient row shows: name, scaled quantity + unit, scaled cost in dollars. The component is approximately 263 lines.

**What to add:** A checkbox at the top of the breakdown that toggles formula visibility.

### B1. Add state

At the top of the component function, add:

```typescript
const [showFormulas, setShowFormulas] = useState(false)
```

Import `useState` from React if not already imported.

### B2. Add toggle UI

Right before the breakdown tree renders (after any header/summary bar, before the first course), add:

```tsx
<label className="flex items-center gap-2 text-sm text-stone-400 mb-3 cursor-pointer">
  <input
    type="checkbox"
    checked={showFormulas}
    onChange={(e) => setShowFormulas(e.target.checked)}
    className="rounded border-stone-600"
  />
  Show calculation formulas
</label>
```

### B3. Add formula display per ingredient row

Find where each ingredient row renders its cost. It currently shows something like the scaled cost formatted as dollars. After (or instead of) just the dollar amount, conditionally show the formula:

```tsx
{
  showFormulas && scaledQty && unitPrice ? (
    <span className="text-xs text-stone-500 ml-2">
      {scaledQty} {unit} x ${(unitPrice / 100).toFixed(2)}/{unit}
      {scaleFactor !== 1 ? ` x ${scaleFactor}x` : ''}
      {' = '}
    </span>
  ) : null
}
;<span>{formattedCost}</span>
```

**IMPORTANT:** The exact variable names (`scaledQty`, `unitPrice`, `scaleFactor`, `formattedCost`) will differ from what is written here. Read the component to find the actual variable names used for:

- The ingredient's scaled quantity (might be `qty`, `scaledQuantity`, `amount`, etc.)
- The unit price in cents (might be `priceCents`, `unitCostCents`, `pricePerUnit`, etc.)
- The scale factor (might be `scale`, `scaleFactor`, `factor`, etc.)
- The formatted dollar cost (might be `cost`, `formattedCost`, `displayCost`, etc.)

Use whatever variable names actually exist in the component. Do NOT introduce new data fetching or calculations.

### B4. If variables are not available

If the ingredient row does NOT have access to the individual unit price or scale factor (it may only have the final `cost_cents`), then show a simpler formula:

```tsx
{
  showFormulas && (
    <span className="text-xs text-stone-500 ml-2">
      ({qty} {unit} at resolved price)
    </span>
  )
}
```

This is less ideal but still better than nothing. Do NOT add new data fetching to make the full formula work.

---

## Files Changed (Complete List)

| File                                          | Change                                            |
| --------------------------------------------- | ------------------------------------------------- |
| `components/pricing/price-badge.tsx`          | MODIFY confidence tooltip text                    |
| `components/culinary/menu-breakdown-view.tsx` | ADD showFormulas state + toggle + per-row formula |

## Files NOT Changed (Do Not Touch)

- `lib/pricing/resolve-price.ts` -- do not change the confidence calculation
- `components/culinary/menu-cost-sidebar.tsx` -- leave as-is
- `components/culinary/menu-whatif-panel.tsx` -- leave as-is
- `lib/costing/knowledge.ts` -- help content stays as-is
- Any server actions or data fetching

## Verification

1. Go to `/culinary/price-catalog`, find any ingredient with a price
2. Hover over the confidence dots -- tooltip should show decay schedule
3. Go to `/menus/[any-menu-id]`, scroll to cost breakdown
4. Check "Show calculation formulas" checkbox
5. Each ingredient row should now show its quantity x unit price formula
6. Uncheck -- formulas disappear, just dollar amounts remain

## DO NOT

- Change any data fetching or server actions
- Add new imports beyond useState (if needed)
- Change the visual design of existing elements
- Add any AI features
- Modify any other component files
- Rewrite or restructure the menu-breakdown-view component
