# Mobile Responsiveness Polish

## Summary

Comprehensive pass to make every page in ChefFlow look clean and usable on mobile devices (375px-430px viewport). All changes are CSS-only (Tailwind class adjustments) with zero logic changes.

## Problem

Several pages were built desktop-first with layouts that broke or looked cramped on mobile:
- Page headers with title + action buttons competed for horizontal space
- Multi-column form grids (city/state/zip) rendered inputs too narrow to use
- Financial data grids stacked awkwardly on small screens
- The chat sidebar consumed horizontal space on mobile (288px of ~375px viewport)
- Fixed-width popovers exceeded mobile viewport width
- Large font sizes (`text-3xl`, `text-4xl`) were visually overwhelming on small screens

## Changes Made

### 1. Page Headers (5 files)
All page headers changed from `flex justify-between` to `flex flex-col sm:flex-row sm:justify-between gap-4` so title and action buttons stack vertically on mobile, side-by-side on sm+.

| File | Change |
|------|--------|
| `app/(chef)/dashboard/page.tsx` | Header stacks on mobile, h1 `text-2xl sm:text-3xl` |
| `app/(chef)/events/[id]/page.tsx` | Header stacks, badge wraps, action buttons wrap |
| `app/(chef)/inquiries/[id]/page.tsx` | Header stacks, badges wrap |
| `app/(chef)/clients/[id]/page.tsx` | Header stacks on mobile |
| `app/(client)/my-events/[id]/page.tsx` | Header stacks, "Message Chef" button below title |
| `app/(client)/my-quotes/[id]/page.tsx` | Header stacks on mobile |

### 2. Chat Layout (2 files)
- `app/(chef)/chat/[id]/page.tsx` - Height calc accounts for mobile nav bars (`100dvh - 7rem`); sidebar hidden on mobile with `hidden lg:block`
- `components/chat/chat-view.tsx` - Uses `h-full` (parent controls height); messages container gets `overflow-x-hidden`

### 3. Form Grids (2 files)
- `components/events/event-form.tsx` - City/State/ZIP: `grid-cols-3` -> `grid-cols-1 sm:grid-cols-3`
- `components/inquiries/inquiry-form.tsx` - Three 2-column grids (email/phone, date/guests, budget/referral) all changed to `grid-cols-1 sm:grid-cols-2`

### 4. Data Grids & Font Sizes (2 files)
**Event Detail (`app/(chef)/events/[id]/page.tsx`):**
- Financial Summary: `grid-cols-1 md:grid-cols-4` -> `grid-cols-2 md:grid-cols-4` (2x2 on mobile)
- All `text-2xl` financial numbers -> `text-xl sm:text-2xl`
- Budget guardrail cards: `flex justify-between` -> `flex-col sm:flex-row gap-3`
- Loyalty points card: same flex-col/flex-row pattern
- File AAR CTA: same pattern
- AAR rating numbers: `text-xl sm:text-2xl`

**Client Detail (`app/(chef)/clients/[id]/page.tsx`):**
- Stats grid: `grid-cols-1 md:grid-cols-4` -> `grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6`
- Stat numbers: `text-3xl` -> `text-2xl sm:text-3xl`
- Loyalty numbers: `text-2xl` -> `text-xl sm:text-2xl`

### 5. Calendar Popover (1 file)
- `components/scheduling/event-detail-popover.tsx` - Fixed `w-80` -> `w-[calc(100vw-2rem)] sm:w-80 max-w-80`

### 6. Client Quote Detail (1 file)
- `app/(client)/my-quotes/[id]/page.tsx` - Price: `text-4xl` -> `text-3xl sm:text-4xl`

### 7. Contact Page (1 file)
- `app/(public)/contact/page.tsx` - Grid gap: `gap-8` -> `gap-6 lg:gap-8`

## Patterns Used

| Pattern | When to Use |
|---------|-------------|
| `flex flex-col sm:flex-row` | Any header/CTA with title + button side by side |
| `text-Nxl sm:text-(N+1)xl` | Large display numbers on data-heavy pages |
| `grid-cols-1 sm:grid-cols-N` | Form fields that need full width on mobile |
| `grid-cols-2 md:grid-cols-4` | Stat cards that look good as 2x2 on mobile |
| `w-[calc(100vw-2rem)] sm:w-80` | Fixed-width floating elements |
| `hidden lg:block` | Desktop-only sidebars |

## Verification

- All changes are Tailwind CSS class modifications only (no logic changes)
- TypeScript compilation passes for all modified files
- Test at 375px (iPhone SE) and 390px (iPhone 14) in browser DevTools
