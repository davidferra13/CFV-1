# ECS Gap: Client Hub Button Row Overflow

> Source: ECS Scorecard 2026-04-27 | User Type: Client (91/100) | Dimension: Polish (17/20)

## Problem
Hub page header has 7 buttons in a non-wrapping flex row that overflows on tablet/small desktop viewports (`app/(client)/my-hub/page.tsx` lines 61-108).

## Spec
Add `flex-wrap` to the button container so buttons wrap to a second row on smaller screens instead of overflowing.

## Fix
```tsx
// Before
<div className="flex gap-2">

// After  
<div className="flex flex-wrap gap-2">
```

## Acceptance
- Buttons wrap cleanly on tablet widths (768px-1024px)
- No horizontal scrollbar on any viewport
- Visual appearance unchanged on desktop
