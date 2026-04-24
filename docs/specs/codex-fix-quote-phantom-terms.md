# Fix: Remove Phantom Terms Reference from Quote Acceptance (JBUG-007)

## Problem

`app/(client)/my-quotes/[id]/quote-response-buttons.tsx` line 94 says "you agree to the pricing and terms" but no terms are visible anywhere on the quote page. This is misleading for a multi-thousand-dollar commitment.

## Approach (Two Parts)

### Part A: Fix the modal text (remove "and terms")

**File:** `app/(client)/my-quotes/[id]/quote-response-buttons.tsx`

Find this line (line 94):

```tsx
description={`You are accepting a quote for ${formatCurrency(totalCents)}. By accepting, you agree to the pricing and terms. Your chef will be notified.`}
```

Replace with:

```tsx
description={`You are accepting a quote for ${formatCurrency(totalCents)}. By accepting, you confirm this pricing works for you. Your chef will be notified and will follow up with next steps.`}
```

### Part B: Fix the dark-on-dark contrast on status banners (JBUG-006)

In the same file (`quote-response-buttons.tsx`), or in the parent `page.tsx`, find the accepted/rejected status banners. They use dark text on dark backgrounds.

**File:** `app/(client)/my-quotes/[id]/page.tsx`

Find the accepted banner (look for `bg-green-950` with `text-green-800`):

```tsx
bg - green - 950
```

and

```tsx
text - green - 800
```

Replace `text-green-800` with `text-green-200` in the accepted banner.

Find the rejected banner (look for `bg-red-950` with `text-red-800`):

```tsx
text - red - 800
```

Replace `text-red-800` with `text-red-200` in the rejected banner.

**IMPORTANT:** Only change the text color classes, not the background classes. The backgrounds (`bg-green-950`, `bg-red-950`) stay the same. Only the text colors change to lighter variants for contrast.

## Rules

- Do NOT add a cancellation policy section. That is a separate feature.
- Do NOT change the accept/reject server action logic.
- Do NOT change the ConfirmModal component.
- Only change the description string in the accept modal.
- Only change text color classes on the status banners.
- Run `npx tsc --noEmit --skipLibCheck` after all edits. It must pass.
