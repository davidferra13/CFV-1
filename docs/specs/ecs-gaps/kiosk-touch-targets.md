# ECS Gap: Kiosk Order Register Touch Targets

> Source: ECS Scorecard 2026-04-27 | User Type: Kiosk (78/100) | Dimension: Polish (15/20)

## Problem
Cart area item controls in kiosk-order-register.tsx use Minus/Plus icons at h-3.5 w-3.5, too small for tablet touch targets.

## Spec
1. Read `components/kiosk/kiosk-order-register.tsx`
2. Find cart quantity control buttons (Minus/Plus icons)
3. Increase icon sizes to at least h-5 w-5
4. Increase button padding to at least p-3 for minimum 44x44px touch target (WCAG)
5. Check other small touch targets in the register UI

## Acceptance
- All interactive elements meet 44x44px minimum touch target
- Cart quantity controls easy to tap
- No accidental taps on adjacent controls
