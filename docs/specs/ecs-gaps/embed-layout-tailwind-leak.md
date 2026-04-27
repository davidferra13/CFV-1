# ECS Gap: Embed Layout Tailwind Leak

> Source: ECS Scorecard 2026-04-27 | User Type: Embed Widget (94/100) | Dimension: Polish (17/20)

## Problem
`app/embed/layout.tsx` line 12 uses Tailwind class "min-h-screen bg-transparent" which may not resolve if Tailwind CSS is not loaded in the iframe context. The form component itself is properly inline-styled.

## Spec
1. Read `app/embed/layout.tsx`
2. Replace Tailwind classes with inline styles:
   ```tsx
   // Before
   <div className="min-h-screen bg-transparent">
   
   // After
   <div style={{ minHeight: '100vh', background: 'transparent' }}>
   ```
3. Check for any other Tailwind usage in `app/embed/` files

## Acceptance
- Zero Tailwind classes in embed layout
- All styling via inline styles
- Widget renders correctly when Tailwind is not loaded
