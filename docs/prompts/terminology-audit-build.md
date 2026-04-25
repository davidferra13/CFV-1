# Terminology & Labels - Full Build Prompt

> Paste this entire prompt into a fresh Claude Code context window.
> Read CLAUDE.md first. Caveman mode active. Sonnet ban: use `model: "haiku"` on all Agent calls.

---

## Mission

Execute ALL 53 terminology fixes from the Culinary School Quality Audit. Every user-facing label, term, and abbreviation listed below must be corrected. Do NOT skip any item. Do NOT add features, refactor code, or make improvements beyond what is listed. Pure label/string changes unless otherwise noted.

**Rules:**

- Read each file before editing
- Make the minimum change to fix the term
- Do not change variable names, prop names, or internal identifiers unless explicitly listed
- Do not change database column names
- Phase 4 (DB migrations) requires explicit user approval before writing migration files
- Run `npx tsc --noEmit --skipLibCheck` after all changes to verify no type errors introduced
- Commit with: `fix(terminology): culinary school quality audit - 53 label corrections`

---

## Phase 1: Pure UI String Replacements (Zero Risk)

These are all direct string replacements in user-facing text. No logic changes.

### 1.1 - "Tips Received" -> "Gratuity Received"

**File:** `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx`
**Line 277:** `<h2 className="text-xl font-semibold mb-4">Tips Received</h2>`
**Change to:** `<h2 className="text-xl font-semibold mb-4">Gratuity Received</h2>`

### 1.2 - "Tip / gratuity" -> "Gratuity"

**File:** `components/events/financial-summary-view.tsx`
**Line 145:** `label="Tip / gratuity"`
**Change to:** `label="Gratuity"`

### 1.3 - "Tip" -> "Gratuity" in close-out wizard step name

**File:** `components/events/close-out-wizard.tsx`
**Line 31:** `const STEPS = ['Tip', 'Receipts', 'Mileage', 'Reflection', 'Leftovers', 'Close Out']`
**Change to:** `const STEPS = ['Gratuity', 'Receipts', 'Mileage', 'Reflection', 'Leftovers', 'Close Out']`

### 1.4 - "Tip amount" -> "Gratuity amount" in close-out wizard

**File:** `components/events/close-out-wizard.tsx`
**Line 228:** `label="Tip amount"`
**Change to:** `label="Gratuity amount"`

### 1.5 - "Tip" -> "Gratuity" in payment import

**File:** `components/import/payment-import.tsx`
**Line 48:** `{ value: 'tip', label: 'Tip' },`
**Change to:** `{ value: 'tip', label: 'Gratuity' },`
_Note: keep `value: 'tip'` (matches DB enum). Only change `label`._

### 1.6 - "Tip" -> "Gratuity" in client financial panel

**File:** `components/clients/client-financial-panel.tsx`
**Line 77:** `tip: { label: 'Tip', className: 'bg-purple-900 text-purple-800' },`
**Change to:** `tip: { label: 'Gratuity', className: 'bg-purple-900 text-purple-800' },`

### 1.7 - "Tip" -> "Gratuity" in financials client

**File:** `app/(chef)/financials/financials-client.tsx`
**Line 88:** `tip: 'Tip',`
**Change to:** `tip: 'Gratuity',`

### 1.8 - "Tip recorded" -> "Gratuity recorded" in interactive specs

**File:** `lib/documents/interactive-specs.ts`
**Line 429:** `{ id: 'e-2', label: 'Tip recorded (if applicable)', checkable: true },`
**Change to:** `{ id: 'e-2', label: 'Gratuity recorded (if applicable)', checkable: true },`

### 1.9 - "Tip added" -> "Gratuity added" in trigger registry

**File:** `lib/loyalty/trigger-registry.ts`
**Line 113:** `label: 'Tip added',`
**Change to:** `label: 'Gratuity added',`

### 1.10 - "Tip" -> "Gratuity" in commerce receipt

**File:** `lib/documents/generate-commerce-receipt.ts`
**Line 207:** `addTotalLine('Tip', data.tipCents)`
**Change to:** `addTotalLine('Gratuity', data.tipCents)`

### 1.11 - "Profit Margin %" -> "Markup %"

**File:** `components/finance/catering-bid-calculator.tsx`
**Line 486:** `<Label htmlFor="profit-pct">Profit Margin %</Label>`
**Change to:** `<Label htmlFor="profit-pct">Markup %</Label>`

### 1.12 - IRS mileage rate hardcoded year

**File:** `components/finance/catering-bid-calculator.tsx`
**Lines 522-523:** `Reimbursed at 72.5 cents/mile (2026 IRS rate)`
**Change to:** `Reimbursed at current IRS standard mileage rate`

### 1.13 - "ShoppingListGenerator" -> "Shopping List"

**File:** `components/culinary/ShoppingListGenerator.tsx`
**Line 224:** `<CardTitle>ShoppingListGenerator</CardTitle>`
**Change to:** `<CardTitle>Shopping List</CardTitle>`

### 1.14 - "Add dishes" -> "Add courses"

**File:** `components/culinary/menu-breakdown-view.tsx`
**Line 255:** `No courses added yet. Add dishes to see the cost breakdown.`
**Change to:** `No courses added yet. Add courses to see the cost breakdown.`

### 1.15 - "Food cost ratio" -> "Food cost %"

**File:** `components/finance/catering-bid-summary.tsx`
**Line 79:** `<span className="text-sm text-gray-500">Food cost ratio:</span>`
**Change to:** `<span className="text-sm text-gray-500">Food cost %:</span>`

### 1.16 - "per person" -> "per guest"

**File:** `components/finance/catering-bid-summary.tsx`
**Line 76:** `{formatCurrency(result.perPersonCents)} per person`
**Change to:** `{formatCurrency(result.perPersonCents)} per guest`

### 1.17 - "Confirmed Income" -> "Confirmed Revenue"

**File:** `components/finance/cash-flow-chart.tsx`
**Line 74:** `<p className="text-xs text-stone-500">Confirmed Income</p>`
**Change to:** `<p className="text-xs text-stone-500">Confirmed Revenue</p>`

### 1.18 - "Projected Income" -> "Projected Revenue"

**File:** `components/finance/cash-flow-chart.tsx`
**Line 82:** `<p className="text-xs text-stone-500">Projected Income</p>`
**Change to:** `<p className="text-xs text-stone-500">Projected Revenue</p>`

### 1.19 - Legend keys "Confirmed In" / "Projected In" -> "Confirmed Revenue" / "Projected Revenue"

**File:** `components/finance/cash-flow-chart.tsx`
**Line 56:** `'Confirmed In': p.confirmedIncomeCents,`
**Change to:** `'Confirmed Revenue': p.confirmedIncomeCents,`
**Line 57:** `'Projected In': p.projectedIncomeCents,`
**Change to:** `'Projected Revenue': p.projectedIncomeCents,`

### 1.20 - "Security deposit" -> "Deposit"

**File:** `components/events/cancellation-policy-display.tsx`
**Line 85:** `<p className="text-sm font-medium text-stone-300">Security deposit</p>`
**Change to:** `<p className="text-sm font-medium text-stone-300">Deposit</p>`

### 1.21 - "Prof. Services" -> "Professional Services"

**File:** `components/finance/expense-summary-chart.tsx`
**Line 18:** `professional_services: 'Prof. Services',`
**Change to:** `professional_services: 'Professional Services',`

### 1.22 - "Overall Margin" -> "Overall Gross Margin"

**File:** `components/finance/profit-dashboard.tsx`
**Line 108:** `<p className="text-sm text-stone-500 mt-1">Overall Margin</p>`
**Change to:** `<p className="text-sm text-stone-500 mt-1">Overall Gross Margin</p>`

### 1.23 - "Expenses Table" -> remove label or make it "Operating Expenses"

**File:** `components/finance/ProfitAndLossReport.tsx`
**Line 107:** `label="Expenses Table"`
**Change to:** `label="Operating Expenses"`

### 1.24 - "recipe bible" -> "recipe book"

**File:** `components/culinary/menu-assembly-browser.tsx`
**Line 410:** `Type at least 2 characters to search your recipe bible.`
**Change to:** `Type at least 2 characters to search your recipe book.`

### 1.25 - "culinary signals" -> "taste preferences"

**File:** `components/culinary/menu-context-sidebar.tsx`
**Line 544:** `<p className="text-xs text-stone-500">No culinary signals recorded for this client.</p>`
**Change to:** `<p className="text-xs text-stone-500">No taste preferences recorded for this client.</p>`

### 1.26 - "{guestCount}g" -> "{guestCount} guests"

**File:** `components/culinary/menu-context-sidebar.tsx`
**Line 792:** `{pm.guestCount && <span className="text-stone-600 text-xxs">{pm.guestCount}g</span>}`
**Change to:** `{pm.guestCount && <span className="text-stone-600 text-xxs">{pm.guestCount} guests</span>}`

### 1.27 - "Avg Price ($)" -> "Avg Price per Unit ($)"

**File:** `components/culinary/add-ingredient-form.tsx`
**Line 143:** `<label className="text-sm font-medium text-stone-300">Avg Price ($)</label>`
**Change to:** `<label className="text-sm font-medium text-stone-300">Avg Price per Unit ($)</label>`

### 1.28 - "Cost / Portion" -> "Cost per Portion"

**File:** `app/(chef)/culinary/costing/page.tsx`
**Line 119:** `<TableHead>Cost / Portion</TableHead>`
**Change to:** `<TableHead>Cost per Portion</TableHead>`

### 1.29 - "Total Time" -> "Cook Time" (header matches data)

**File:** `app/(chef)/culinary/recipes/page.tsx`
**Line 108:** `<TableHead>Total Time</TableHead>`
**Change to:** `<TableHead>Cook Time</TableHead>`

### 1.30 - "Calories / Serving" -> "Calories per Serving"

**File:** `app/(chef)/recipes/[id]/recipe-detail-client.tsx`
**Line 733:** `<dt className="text-sm font-medium text-stone-500">Calories / Serving</dt>`
**Change to:** `<dt className="text-sm font-medium text-stone-500">Calories per Serving</dt>`

### 1.31 - "Protein / Serving" -> "Protein per Serving"

**File:** `app/(chef)/recipes/[id]/recipe-detail-client.tsx`
**Line 739:** `<dt className="text-sm font-medium text-stone-500">Protein / Serving</dt>`
**Change to:** `<dt className="text-sm font-medium text-stone-500">Protein per Serving</dt>`

### 1.32 - "Equipment Needed" -> "Equipment"

**File:** `app/(chef)/recipes/[id]/recipe-detail-client.tsx`
**Line 801:** `<p className="text-sm font-medium text-stone-500 mb-2">Equipment Needed</p>`
**Change to:** `<p className="text-sm font-medium text-stone-500 mb-2">Equipment</p>`

### 1.33 - "kcal/serving" -> "cal/serving"

**File:** `app/(chef)/culinary/dish-index/[id]/dish-detail-client.tsx`
**Line 332:** `{(dish.recipes as any).calories_per_serving} kcal/serving`
**Change to:** `{(dish.recipes as any).calories_per_serving} cal/serving`

### 1.34 - "Recipe Library" -> "Recipe Book" (3 locations)

**File:** `app/(chef)/onboarding/recipes/page.tsx`
**Line 6:** `export const metadata = { title: 'Recipe Library' }`
**Change to:** `export const metadata = { title: 'Recipe Book' }`
**Line 22:** `<h1 className="text-3xl font-bold text-stone-100">Recipe Library</h1>`
**Change to:** `<h1 className="text-3xl font-bold text-stone-100">Recipe Book</h1>`

**File:** `app/(chef)/help/[slug]/page.tsx`
**Line 111:** `3. Build your recipe library (Culinary > Recipes)`
**Change to:** `3. Build your recipe book (Culinary > Recipes)`

**File:** `app/(chef)/help/page.tsx`
**Line 37:** `desc: 'Recipe library, menu building, costing',`
**Change to:** `desc: 'Recipe book, menu building, costing',`

### 1.35 - "AAR Filed" -> "Review Filed"

**File:** `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`
**Line 304:** `<span className="text-sm text-stone-300">AAR Filed</span>`
**Change to:** `<span className="text-sm text-stone-300">Review Filed</span>`

### 1.36 - "Reset Complete" -> "Breakdown Complete"

**File:** `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`
**Line 312:** `<span className="text-sm text-stone-300">Reset Complete</span>`
**Change to:** `<span className="text-sm text-stone-300">Breakdown Complete</span>`

### 1.37 - "Forgotten Items" -> "Missing Items"

**File:** `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`
**Line 384:** `<dt className="text-sm font-medium text-stone-500">Forgotten Items</dt>`
**Change to:** `<dt className="text-sm font-medium text-stone-500">Missing Items</dt>`

### 1.38 - "What went wrong" -> "Areas for Improvement"

**File:** `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`
**Line 413:** `<dt className="text-sm font-medium text-stone-500">What went wrong</dt>`
**Change to:** `<dt className="text-sm font-medium text-stone-500">Areas for Improvement</dt>`

### 1.39 - "Ready to review this dinner?" -> "Ready to review this event?"

**File:** `app/(chef)/events/[id]/_components/event-detail-wrap-tab.tsx`
**Line 57:** `<h2 className="font-semibold text-brand-200">Ready to review this dinner?</h2>`
**Change to:** `<h2 className="font-semibold text-brand-200">Ready to review this event?</h2>`

### 1.40 - "Capture what you learned tonight" -> "Capture what you learned"

**File:** `app/(chef)/events/[id]/_components/event-detail-wrap-tab.tsx`
**Line 74:** `<h2 className="font-semibold text-amber-900">Capture what you learned tonight</h2>`
**Change to:** `<h2 className="font-semibold text-amber-900">Capture what you learned</h2>`

### 1.41 - "Rev / Labor Hr" -> "Revenue per Labor Hour"

**File:** `app/(chef)/dashboard/_sections/restaurant-metrics.tsx`
**Line 92:** `label="Rev / Labor Hr"`
**Change to:** `label="Revenue per Labor Hour"`

### 1.42 - "COGS" -> "COGS (Cost of Goods)"

**File:** `app/(chef)/dashboard/_sections/restaurant-metrics.tsx`
**Line 110:** `label="COGS"`
**Change to:** `label="COGS (Cost of Goods)"`

### 1.43 - "income" -> "revenue" in finance hub

**File:** `app/(chef)/finance/page.tsx`
**Line 78:** `description: 'Monthly view of income, expenses, and upcoming payment plan installments',`
**Change to:** `description: 'Monthly view of revenue, expenses, and upcoming payment plan installments',`

### 1.44 - "Dead" -> "Closed - Lost" in prospecting

**File:** `app/(chef)/prospecting/page.tsx`
**Line 165:** `<option value="dead">Dead</option>`
**Change to:** `<option value="dead">Closed - Lost</option>`

### 1.45 - "Push Dinners" -> "Push Events" and "New Push Dinner" -> "New Push Event"

**File:** `components/navigation/nav-config.tsx`
**Line 881:** `{ href: '/marketing/push-dinners/new', label: 'New Push Dinner' },`
**Change to:** `{ href: '/marketing/push-dinners/new', label: 'New Push Event' },`
**Line 882:** `{ href: '/marketing/push-dinners', label: 'Push Dinners' },`
**Change to:** `{ href: '/marketing/push-dinners', label: 'Push Events' },`

### 1.46 - "Catering Inquiry" -> "Chef Inquiry"

**File:** `app/(client)/my-inquiries/page.tsx`
**Line 28:** `{inquiry.confirmed_occasion || 'Catering Inquiry'}`
**Change to:** `{inquiry.confirmed_occasion || 'Chef Inquiry'}`

### 1.47 - "catering requests" -> "chef requests"

**File:** `app/(client)/my-inquiries/page.tsx`
**Line 54:** `<p className="text-stone-500 mt-1">Track the status of your catering requests.</p>`
**Change to:** `<p className="text-stone-500 mt-1">Track the status of your chef requests.</p>`

### 1.48 - "front-of-house menu PDF" -> "printable menu"

**File:** `app/(client)/my-events/page.tsx`
**Line 476:** `detail: 'Export your current front-of-house menu PDF.',`
**Change to:** `detail: 'Export your printable menu as a PDF.',`

### 1.49 - "Price delta" -> "Price adjustment"

**File:** `app/(client)/my-events/[id]/guest-count-change-card.tsx`
**Line 205:** `Price delta: {describePriceDelta(change)}`
**Change to:** `Price adjustment: {describePriceDelta(change)}`

### 1.50 - "Kitchen & Logistics" -> "Home & Kitchen Details"

**File:** `app/(client)/my-profile/client-profile-form.tsx`
**Line 446:** `<CardTitle>Kitchen & Logistics</CardTitle>`
**Change to:** `<CardTitle>Home & Kitchen Details</CardTitle>`

### 1.51 - "Kitchen Constraints" -> "Kitchen Notes"

**File:** `app/(client)/my-profile/client-profile-form.tsx`
**Line 459:** `label="Kitchen Constraints"`
**Change to:** `label="Kitchen Notes"`

### 1.52 - "Equipment Available" -> "Kitchen Equipment"

**File:** `app/(client)/my-profile/client-profile-form.tsx`
**Line 467:** `label="Equipment Available"`
**Change to:** `label="Kitchen Equipment"`

### 1.53 - "guests served" -> "guests hosted"

**File:** `app/(client)/my-rewards/page.tsx`
**Line 234:** `<Badge variant="info">{status.totalGuestsServed} guests served</Badge>`
**Change to:** `<Badge variant="info">{status.totalGuestsServed} guests hosted</Badge>`

### 1.54 - Service fee explanation reframe

**File:** `app/(client)/my-events/[id]/proposal/page.tsx`
**Lines 261-263:**

```
                <p className="text-xs text-stone-500">
                  The service fee covers menu planning, ingredient sourcing, on-site preparation,
                  service, and full kitchen cleanup.
```

**Change to:**

```
                <p className="text-xs text-stone-500">
                  This covers everything from menu planning and shopping to cooking, serving,
                  and cleanup, so you can simply enjoy the evening.
```

### 1.55 - "lbs" -> "lb" in display output (6 locations)

**File:** `lib/recipes/portion-standards.ts`
**Line 48:** `totalLabel: string // formatted total e.g. "4.5 lbs cooked" or "6 cups"`
**Change to:** `totalLabel: string // formatted total e.g. "4.5 lb cooked" or "6 cups"`
**Line 49:** `rawTotalLabel: string | null // formatted raw purchase total e.g. "5.8 lbs raw"`
**Change to:** `rawTotalLabel: string | null // formatted raw purchase total e.g. "5.8 lb raw"`
**Line 379:** `` return `${fmtNum(lbs)} lbs (${breakdown})` ``
**Change to:** `` return `${fmtNum(lbs)} lb (${breakdown})` ``

**File:** `components/inventory/pantry-dashboard.tsx`
**Line 298:** `placeholder="Unit (e.g. kg, lbs, each)"`
**Change to:** `placeholder="Unit (e.g. kg, lb, each)"`

**File:** `components/events/travel-leg-form.tsx`
**Line 231:** `placeholder="lbs"`
**Change to:** `placeholder="lb"`

**File:** `lib/sustainability/sourcing-actions.ts`
**Line 10:** `// CO2 estimates: lbs CO2 per lb of food (simplified model)`
**Change to:** `// CO2 estimates: lb CO2 per lb of food (simplified model)`

### 1.56 - "lbs" -> "lb" in AI prompt examples (3 locations)

**File:** `lib/ai/grocery-quick-add-actions.ts`
**Line 41:** `* Example: "2 lbs chicken breast, 1 bunch cilantro, 3 avocados, olive oil"`
**Change to:** `* Example: "2 lb chicken breast, 1 bunch cilantro, 3 avocados, olive oil"`
**Line 54:** `- unit: the unit of measurement (e.g., "lbs", "oz", "each", "bunch", "can", "bottle")`
**Change to:** `- unit: the unit of measurement (e.g., "lb", "oz", "each", "bunch", "can", "bottle")`

**File:** `lib/ai/command-task-descriptions.ts`
**Line 224:** `'{ "items": "string - comma-separated list of grocery items, e.g. 2 lbs chicken, 1 bunch cilantro" }',`
**Change to:** `'{ "items": "string - comma-separated list of grocery items, e.g. 2 lb chicken, 1 bunch cilantro" }',`

---

## Phase 2: Component Logic Changes (Low Risk)

These require small logic additions beyond pure string swaps.

### 2.1 - Add `fl oz` to ingredient unit list

**File:** `components/culinary/add-ingredient-form.tsx`
**Lines 28-43:** Add `'fl oz'` after `'oz'` in the UNITS array:

```ts
const UNITS = [
  'unit',
  'oz',
  'fl oz',
  'lb',
  'g',
  'kg',
  'cup',
  'tbsp',
  'tsp',
  'ml',
  'L',
  'each',
  'bunch',
  'head',
  'clove',
]
```

### 2.2 - Add `'kilograms'` to WEIGHT_UNITS set

**File:** `app/(chef)/culinary/recipes/[id]/page.tsx`
**Line 38:** After `'kilogram',` add `'kilograms',`

```ts
const WEIGHT_UNITS = new Set([
  'g',
  'gram',
  'grams',
  'kg',
  'kilogram',
  'kilograms',
  'oz',
  'ounce',
  'ounces',
  'lb',
  'lbs',
  'pound',
  'pounds',
])
```

### 2.3 - Add missing service style options to menu form

**File:** `app/(chef)/menus/new/create-menu-form.tsx`
**Lines 482-484:** Add two more options:

```tsx
                  <option value="plated">Plated</option>
                  <option value="family_style">Family Style</option>
                  <option value="buffet">Buffet</option>
                  <option value="cocktail">Cocktail / Passed</option>
                  <option value="stations">Stations</option>
```

### 2.4 - Create service_style label map and apply to 3 client-facing files

Create a small helper. Add at the top of whichever file is most central, or inline in each file. The simplest approach: inline a map object in each of the 3 files.

**File:** `app/(client)/my-events/[id]/page.tsx`
**Lines 591-593:** Replace raw `.replace('_', ' ')` with proper formatting:

```tsx
// Before:
{
  menu.service_style.replace('_', ' ')
}

// After:
{
  ;(
    ({
      plated: 'Plated',
      plated_dinner: 'Plated',
      family_style: 'Family Style',
      buffet: 'Buffet',
      cocktail: 'Cocktail / Passed',
      stations: 'Stations',
      tasting: 'Tasting Menu',
    }) as Record<string, string>
  )[menu.service_style] || menu.service_style.replace(/_/g, ' ')
}
```

**File:** `app/(client)/my-events/[id]/proposal/page.tsx`
**Lines 199-200:** Same map, also change label from "Service style" to "Dining style":

```tsx
// Before:
<p className="text-stone-500 text-xs mt-1">Service style: {menu.service_style}</p>

// After:
<p className="text-stone-500 text-xs mt-1">Dining style: {({
  plated: 'Plated',
  plated_dinner: 'Plated',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail / Passed',
  stations: 'Stations',
  tasting: 'Tasting Menu',
} as Record<string, string>)[menu.service_style] || menu.service_style.replace(/_/g, ' ')}</p>
```

**File:** `app/(client)/my-events/[id]/approve-menu/menu-approval-client.tsx`
**Lines 167-168:** Same map:

```tsx
// Before:
<Badge variant="info">{menu.service_style.replace('_', ' ')}</Badge>

// After:
<Badge variant="info">{({
  plated: 'Plated',
  plated_dinner: 'Plated',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail / Passed',
  stations: 'Stations',
  tasting: 'Tasting Menu',
} as Record<string, string>)[menu.service_style] || menu.service_style.replace(/_/g, ' ')}</Badge>
```

### 2.5 - Elevate course name over course number (client-facing)

**File:** `app/(client)/my-events/[id]/approve-menu/menu-approval-client.tsx`
**Lines 184-185:** Show course name first, number as secondary:

```tsx
// Before:
<span className="text-xs font-medium text-brand-400 uppercase tracking-wider">
  Course {course.courseNumber}

// After:
<span className="text-xs font-medium text-brand-400 uppercase tracking-wider">
  {course.courseName || `Course ${course.courseNumber}`}
```

---

## Phase 3: Constants & Config Changes (Low Risk)

### 3.1 - "Plated Dinner" -> "Plated Service" in business constants

**File:** `lib/constants/business.ts`
**Line 28:** `'Plated Dinner',`
**Change to:** `'Plated Service',`

### 3.2 - "Plated Dinner" -> "Plated Service" in industry benchmarks

**File:** `lib/finance/industry-benchmarks.ts`
**Line 412:** `style: 'Plated Dinner',`
**Change to:** `style: 'Plated Service',`

### 3.3 - INCOME_SOURCES -> REVENUE_SOURCES

**File:** `lib/constants/business.ts`
**Lines 48-60:**

```ts
// Before:
// Income Sources
// ============================================================

export const INCOME_SOURCES = [
  ...
] as const

export type IncomeSource = (typeof INCOME_SOURCES)[number]['value']

// After:
// Revenue Sources
// ============================================================

export const REVENUE_SOURCES = [
  ...
] as const

export type RevenueSource = (typeof REVENUE_SOURCES)[number]['value']
```

**IMPORTANT:** After renaming, grep the entire codebase for `INCOME_SOURCES` and `IncomeSource` and update all imports/references to `REVENUE_SOURCES` and `RevenueSource`. This is a symbol rename; use grep to find every usage.

### 3.4 - "Dinner for Two" -> "Experience for Two"

**File:** `lib/constants/loyalty.ts`
**Line 100:** `export type GiftCardTag = 'dinner_for_two' | 'celebration_for_four' | 'custom_amount'`
_Note: keep the `dinner_for_two` value (it's a DB key). Only change the display label._
**Line 110:** `{ id: 'gtt-1', tag: 'dinner_for_two', label: 'Dinner for Two', peopleServed: 2 },`
**Change to:** `{ id: 'gtt-1', tag: 'dinner_for_two', label: 'Experience for Two', peopleServed: 2 },`

### 3.5 - Tip action user-facing strings -> "Gratuity"

**File:** `lib/finance/tip-actions.ts`
Update ALL user-facing strings (error messages, descriptions, activity log summaries). Keep internal variable names and entry_type values as-is. The changes:

- Line 3: `// Tip Actions` -> `// Gratuity Actions`
- Line 101: `'Failed to add tip'` -> `'Failed to add gratuity'`
- Line 102: `'Failed to save tip'` -> `'Failed to save gratuity'`
- Line 120: `'Tip recorded (${method})'` -> `'Gratuity recorded (${method})'`
- Line 151: `'Tip not found'` -> `'Gratuity not found'`
- Line 162: `'Failed to delete tip'` -> `'Failed to delete gratuity'`
- Line 179: `'Tip deleted (reversal)'` -> `'Gratuity deleted (reversal)'`
- Line 260: `'Tip requests can only be created for completed events'` -> `'Gratuity requests can only be created for completed events'`
- Line 285: `'A tip request already exists for this event'` -> `'A gratuity request already exists for this event'`
- Line 288: `'Failed to create tip request'` -> `'Failed to create gratuity request'`
- Line 301: `'Created tip request for event'` -> `'Created gratuity request for event'`
- Line 337: `'Failed to fetch tip requests'` -> `'Failed to fetch gratuity requests'`
- Line 405: `'Invalid tip amount'` -> `'Invalid gratuity amount'`
- Line 409: `'Tip amount cannot exceed $10,000'` -> `'Gratuity amount cannot exceed $10,000'`
- Line 427: `'This tip has already been recorded'` -> `'This gratuity has already been recorded'`
- Line 430: `'This tip request was declined'` -> `'This gratuity request was declined'`
- Line 451: `'Failed to record tip. It may have already been submitted.'` -> `'Failed to record gratuity. It may have already been submitted.'`
- Line 464: `'Tip received via tip request'` -> `'Gratuity received via request'`
- Lines 480-481: `'Via tip request: ${notes}'` -> `'Via gratuity request: ${notes}'` / `'Via tip request'` -> `'Via gratuity request'`

**Do NOT rename the file itself** (tip-actions.ts). Internal identifier.

### 3.6 - "Income" -> "Revenue" in remaining UI files

**File:** `components/intelligence/intelligence-hub.tsx`
**Line 236:** `"Avg income/mo:"` -> `"Avg revenue/mo:"`

**File:** `components/calendar/calendar-entry-modal.tsx`
**Line 374:** `"Income (paid)"` -> `"Revenue (paid)"`

**File:** `components/finance/tax-estimate-dashboard.tsx`
**Line 78:** `"Estimated Income"` -> `"Estimated Revenue"`
**Line 156:** find other "Income" label -> change to "Revenue" (if not in a tax/IRS context)
_Note: DO NOT change "Taxable Income", "Adjusted Gross Income", or "SE income" - these are IRS terms and correct as-is._

---

## Phase 4: Database Schema Changes (REQUIRES APPROVAL)

**STOP HERE AND ASK THE USER FOR APPROVAL BEFORE PROCEEDING.**

These changes affect database enums and check constraints. They require migration files. Explain:

1. What data would be affected
2. The migration SQL
3. That the user should back up their database first

### 4.1 - `ledger_entry_type` enum: rename 'tip' to 'gratuity'

**Migration SQL:**

```sql
ALTER TYPE ledger_entry_type RENAME VALUE 'tip' TO 'gratuity';
```

Then update ALL code that writes `entry_type: 'tip'` to `entry_type: 'gratuity'`:

- `lib/finance/tip-actions.ts` lines 118, 178, 461
- `components/import/payment-import.tsx` line 48 (the `value` field)
- Any other files that write `'tip'` as a ledger entry type

And update ALL code that reads/filters by `entry_type === 'tip'` to `=== 'gratuity'`.

### 4.2 - `prep_block_type` enum: rename 'cleanup' to 'breakdown'

**Migration SQL:**

```sql
ALTER TYPE prep_block_type RENAME VALUE 'cleanup' TO 'breakdown';
```

Then update all code referencing `'cleanup'` as a prep block type.

### 4.3 - `event_prep_steps` check constraint: 'cleanup' -> 'breakdown'

**Migration SQL:**

```sql
ALTER TABLE event_prep_steps DROP CONSTRAINT event_prep_steps_step_key_check;
ALTER TABLE event_prep_steps ADD CONSTRAINT event_prep_steps_step_key_check
  CHECK (step_key = ANY (ARRAY['menu_planning'::text, 'ingredient_sourcing'::text, 'prep_work'::text, 'packing'::text, 'travel'::text, 'setup'::text, 'cooking'::text, 'serving'::text, 'breakdown'::text, 'complete'::text]));
UPDATE event_prep_steps SET step_key = 'breakdown' WHERE step_key = 'cleanup';
```

### 4.4 - `event_live_status` check constraint: 'cleanup' -> 'breakdown'

**Migration SQL:**

```sql
ALTER TABLE event_live_status DROP CONSTRAINT event_live_status_status_key_check;
ALTER TABLE event_live_status ADD CONSTRAINT event_live_status_status_key_check
  CHECK (status_key = ANY (ARRAY['en_route'::text, 'arrived'::text, 'setting_up'::text, 'prep_underway'::text, 'first_course'::text, 'main_course'::text, 'dessert'::text, 'breakdown'::text, 'complete'::text]));
UPDATE event_live_status SET status_key = 'breakdown' WHERE status_key = 'cleanup';
```

### 4.5 - Update schema.ts to reflect new enum values

After migrations run, update `lib/db/schema/schema.ts`:

- Line 94: `'tip'` -> `'gratuity'` in ledgerEntryType enum
- Line 115: `'cleanup'` -> `'breakdown'` in prepBlockType enum
- Line 15264: `'cleanup'` -> `'breakdown'` in event_prep_steps check
- Line 15380: `'cleanup'` -> `'breakdown'` in event_live_status check

### 4.6 - Update default JSON values in schema.ts

- Line 19956: `"cleanup":true` -> `"breakdown":true` in prepTimelineVisibility default
- Line 19960: `"cleanup":false` -> `"breakdown":false` in liveTrackerVisibility default

### 4.7 - Update all code referencing old enum values

Grep the entire codebase for:

- `'cleanup'` in prep block / event status contexts -> `'breakdown'`
- `entry_type: 'tip'` -> `entry_type: 'gratuity'`
- Any switch/case or if statements checking these values

---

## Verification Checklist

After all changes:

1. `npx tsc --noEmit --skipLibCheck` exits 0
2. `npx next build --no-lint` exits 0 (optional but recommended)
3. Grep verification (all should return 0 matches in user-facing contexts):
   - `grep -r "Tips Received" app/ components/`
   - `grep -r "front-of-house" app/\(client\)/`
   - `grep -r "Catering Inquiry" app/`
   - `grep -r "ShoppingListGenerator" --include="*.tsx" components/culinary/ShoppingListGenerator.tsx` (as CardTitle)
   - `grep -r "Profit Margin %" components/finance/`
   - `grep -r "Security deposit" components/events/`
   - `grep -r "Prof\. Services" components/finance/`
4. Spot-check 5 random changes in the running app (navigate to the page, verify label is correct)

---

## Commit

```
fix(terminology): culinary school quality audit, 53 label corrections

Standardize all user-facing terms to professional culinary and
business standards. Key changes: tip->gratuity, income->revenue,
cleanup->breakdown, margin->markup, FOH removed from client
surfaces, measurement abbreviations corrected, consistency
enforced across 40+ files.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```
