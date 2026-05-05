# Codex Build Spec: PIE Compliance Admin Dashboard

> **Priority:** P2 - Visual compliance check for developer
> **Risk:** LOW - new admin page, no existing code modified
> **Estimated scope:** ~200 lines, 1 new route + 1 component

## Context

`lib/pricing/pie-compliance.ts` returns a `PieComplianceReport` with per-law status. This should be visible in the admin area so the developer can check PIE health at a glance.

## Files to Create

### 1. Server action: `lib/pricing/compliance-actions.ts`

```typescript
'use server'
import { requireAdmin } from '@/lib/auth/guards' // match existing auth pattern
import { getPieCompliance } from './pie-compliance'

export async function fetchPieCompliance() {
  await requireAdmin()
  return getPieCompliance()
}
```

### 2. Page: `app/(authenticated)/admin/pie-compliance/page.tsx`

Simple server component that:

- Calls `getPieCompliance()` directly (server component, no action needed)
- Renders a table of all 13 laws with status badges
- Color coding: passing = green, warning = yellow, violation = red, catastrophic = pulsing red
- Top summary bar: "X/13 laws passing" with overall status
- Census stats: total ingredients, regions, coverage %
- Generated timestamp

### 3. Layout integration

Add "PIE Compliance" link to admin nav (find existing admin nav pattern and add entry).

## Design

Match existing admin page patterns. No new UI libraries. Use existing badge/status components if available. Keep it simple: one table, one summary bar, one timestamp.

## Do NOT Modify

- `lib/pricing/pie-compliance.ts`
- Any non-admin pages
- Any pricing resolution logic

## Acceptance Criteria

- `/admin/pie-compliance` renders with real data
- All 13 laws displayed with correct status colors
- Admin auth required (non-admin gets redirected)
- `npx tsc --noEmit --skipLibCheck` passes
- `npx next build --no-lint` passes
