# ECS Gap: Embed Widget Mobile Date Grid

> Source: ECS Scorecard 2026-04-27 | User Type: Embed Widget (94/100) | Dimension: Polish (17/20)

## Problem
The 4-column date grid (month/day/year/serve_time) is cramped on narrow mobile screens. Fixed grid with no responsive breakpoints. Inline styles prevent @media queries.

## Spec
1. Read the embed inquiry form component (search for date grid with gridTemplateColumns)
2. Use JavaScript-based responsive logic since inline styles can't use @media:
   - Check `window.innerWidth` on mount and resize
   - Below 400px: switch to 2-column grid (month+day on row 1, year+time on row 2)
   - Above 400px: keep 4-column layout
3. Or: use CSS calc/clamp with inline styles for fluid columns

## Acceptance
- Date fields don't overlap or truncate on 320px screens
- Layout adapts without @media queries (inline styles only)
- No visual regression on desktop
