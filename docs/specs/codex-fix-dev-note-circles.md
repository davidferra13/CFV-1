# Fix: Remove Dev Note from Public Circles Page (JBUG-013)

## Problem

`app/(public)/hub/circles/page.tsx` lines 75-79 contain an internal developer note visible to all public users: "This entry point moved here so community and shared guest pages live together instead of competing for the homepage hook."

## Exact Change

**File:** `app/(public)/hub/circles/page.tsx`

### Find this block (lines 75-79):

```tsx
<p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
  Guests can use Dinner Circles to stay aligned on dinner details, chat, and come back to the same
  page before the event. This entry point moved here so community and shared guest pages live
  together instead of competing for the homepage hook.
</p>
```

### Replace with:

```tsx
<p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
  Guests can use Dinner Circles to stay aligned on dinner details, chat, and come back to the same
  page before the event.
</p>
```

## Rules

- Do NOT change any other part of this file.
- This is a text-only edit. Remove the second sentence, keep the first.
- Preserve the existing indentation exactly (12 spaces).
- Run `npx tsc --noEmit --skipLibCheck` after the edit. It must pass.
