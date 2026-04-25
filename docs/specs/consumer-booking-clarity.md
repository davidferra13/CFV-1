# Consumer Booking Clarity - Build Spec

> **Purpose:** Remove the two biggest conversion blockers for first-time private chef clients.
> **Risk level:** Low. Two isolated UI changes. No database, no server actions, no auth, no new dependencies.
> **Files touched:** Exactly 2 files. Nothing else.

---

## Context

A first-time client ("Lily") lands on `/book` to hire a private chef. Two things stop her from submitting:

1. She has no idea what private chef dining costs. The budget dropdown says "Elevated dining experience" but never tells her that means ~$50-100/person.
2. She does not understand the process. What happens after she submits? The answer exists in the code (a 5-step list), but it only appears AFTER submission. She needs to see it BEFORE filling out the form.

Both fixes are static UI. No logic changes.

---

## Change 1: Budget Price Anchors

**File:** `app/(public)/book/_components/book-dinner-form.tsx`

**What:** Add a small hint line under each budget option showing the typical per-person range. The data already exists in `lib/booking/budget-parser.ts` (the `BUDGET_LABEL_CENTS` map), but we are NOT importing it. We are hardcoding the display strings to keep this a pure UI change with zero new imports.

**How:** Replace the current `BUDGET_OPTIONS` array (lines 100-107) with one that includes a `hint` field, then render the hint below the select.

### Current code (lines 100-107):

```tsx
const BUDGET_OPTIONS = [
  { value: '', label: 'What experience level?' },
  { value: 'not-sure', label: 'Not sure yet (help me figure it out)' },
  { value: 'casual', label: 'Casual home cooking' },
  { value: 'elevated', label: 'Elevated dining experience' },
  { value: 'fine-dining', label: 'Fine dining / restaurant quality' },
  { value: 'luxury', label: 'Luxury / fully custom' },
]
```

### New code:

```tsx
const BUDGET_OPTIONS = [
  { value: '', label: 'What experience level?', hint: '' },
  { value: 'not-sure', label: 'Not sure yet (help me figure it out)', hint: '' },
  { value: 'casual', label: 'Casual home cooking', hint: 'Typically $25-50 / person' },
  { value: 'elevated', label: 'Elevated dining experience', hint: 'Typically $50-100 / person' },
  {
    value: 'fine-dining',
    label: 'Fine dining / restaurant quality',
    hint: 'Typically $100-200 / person',
  },
  { value: 'luxury', label: 'Luxury / fully custom', hint: 'Typically $200+ / person' },
]
```

Then find the helper text paragraph below the budget select (lines 683-686):

```tsx
<p className="mt-1.5 text-xs text-stone-500">
  Per-person estimate to help chefs tailor their proposal. Final pricing is set by your chef.
</p>
```

Replace it with a conditional hint + the existing helper text:

```tsx
{
  form.budget_range && BUDGET_OPTIONS.find((o) => o.value === form.budget_range)?.hint && (
    <p className="mt-1.5 text-xs font-medium text-emerald-400/80">
      {BUDGET_OPTIONS.find((o) => o.value === form.budget_range)?.hint}
    </p>
  )
}
;<p className="mt-1.5 text-xs text-stone-500">
  Per-person estimate to help chefs tailor their proposal. Final pricing is set by your chef.
</p>
```

**DO NOT:**

- Import anything from `budget-parser.ts`
- Change any other part of the form
- Modify the form submission logic
- Change the `select` element or its `onChange`
- Add any new state variables

---

## Change 2: "How It Works" Process Stepper (Pre-Form)

**File:** `app/(public)/book/page.tsx`

**What:** Add a static 5-step "How it works" section between the `IntakeLaneExpectations` component and the form. This shows the client the full process BEFORE they fill anything out.

**How:** Insert a new `<section>` between the existing expectations section (ends at line 105) and the form section (starts at line 107).

### Insert this JSX between line 105 (`</section>`) and line 107 (`{/* Form */}`):

```tsx
{
  /* How it works */
}
;<section className="mx-auto max-w-2xl px-4 pb-4 sm:px-6 lg:px-8">
  <div className="rounded-2xl border border-stone-700 bg-stone-900/60 p-6 sm:p-8">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">How it works</h2>
    <ol className="mt-5 space-y-4">
      {[
        {
          step: '1',
          title: 'Submit your request',
          detail: 'Tell us the date, location, group size, and vibe. Takes 2 minutes.',
        },
        {
          step: '2',
          title: 'Matched chefs review',
          detail: 'ChefFlow shares your request with chefs who fit. Usually within 24 hours.',
        },
        {
          step: '3',
          title: 'Review menu and pricing',
          detail: 'Your chef sends a proposed menu and quote. Ask questions, request changes.',
        },
        {
          step: '4',
          title: 'Confirm with a deposit',
          detail: 'Pay a deposit to lock in your date. The rest is due before the event.',
        },
        {
          step: '5',
          title: 'Enjoy your dinner',
          detail: 'Your chef arrives, cooks, serves, and cleans up. You relax.',
        },
      ].map((item) => (
        <li key={item.step} className="flex gap-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-600 bg-stone-800 text-xs font-bold text-stone-300">
            {item.step}
          </span>
          <div>
            <p className="text-sm font-semibold text-stone-100">{item.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-stone-400">{item.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  </div>
</section>
```

**DO NOT:**

- Remove or modify the existing `IntakeLaneExpectations` component
- Remove or modify the existing trust footer
- Add any imports
- Change any server-side logic
- Touch the `BookDinnerForm` component or its props

---

## Verification

After making changes, run:

```bash
npx tsc --noEmit --skipLibCheck
npx next build --no-lint
```

Both must exit 0.

**Visual check:** Navigate to `http://localhost:3000/book` and verify:

1. The "How it works" 5-step list appears between the expectations panel and the form
2. When selecting a budget tier (e.g., "Elevated dining experience"), a green hint line appears showing "Typically $50-100 / person"
3. The hint disappears when "Not sure yet" or the placeholder is selected
4. The rest of the page is unchanged

---

## What NOT to build (deferred)

- **Unified pre-event readiness gate:** The building blocks exist (pre-event checklist, journey stepper, email cadence) but stitching them into a single "everything ready" page is a cross-cutting change that touches client portal, email templates, and event state. Too much surface area for an isolated task. Deferred to a dedicated session.
- **Chef preparation visibility for clients:** Showing "chef is shopping" or "chef is prepping" requires new event sub-states and chef-side UI. Out of scope.
- **SMS/push notifications:** Infrastructure change. Out of scope.
