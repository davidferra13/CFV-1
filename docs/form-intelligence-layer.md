# Form Intelligence Layer

**Date:** 2026-03-15
**Status:** Complete

## What Changed

ChefFlow has 120+ forms across the app. Before this work:

- Zero forms had `aria-describedby` or `aria-invalid` (screen readers couldn't announce errors)
- `form-rules.ts` existed with validation presets but was literally unused (no hook to consume it)
- CheckboxGroup and RadioGroup had no error state support
- 3 cache tags were orphaned (mutations never busted them, causing stale data)

## Architecture

```
lib/validation/form-rules.ts (existing - validation logic + presets)
        |
        v
lib/validation/use-field-validation.ts (NEW - hook bridging rules to UI)
        |
        v
components/ui/input.tsx (ENHANCED - aria-invalid, aria-describedby, role="alert")
components/ui/textarea.tsx (ENHANCED - same)
components/ui/select.tsx (ENHANCED - same)
components/ui/checkbox-group.tsx (ENHANCED - error prop + display)
components/ui/radio-group.tsx (ENHANCED - error prop + display)
        |
        v
120+ forms across the app (automatic accessibility improvement)
```

## Phase 1: Accessibility (5 component files, fixes all 120+ forms)

### What was added to Input, Textarea, Select

1. **`aria-invalid`** - set to `"true"` when error prop is present, `"false"` otherwise
2. **`aria-describedby`** - links the input to its error message and/or helper text via ID
3. **`id` on error/helper `<p>` elements** - so `aria-describedby` has a target
4. **`role="alert"` on error messages** - screen readers announce errors immediately

### What was added to CheckboxGroup, RadioGroup

1. **`error` prop** - renders error message below the options
2. **`role="alert"` on error messages** - screen readers announce errors immediately

### Why this matters

Before: a blind user tabbing through a form would have no way to know a field had a validation error. The red border was the only indicator (visual-only). Now screen readers announce "Invalid entry" and read the error message text.

## Phase 2: useFieldValidation Hook

**File:** `lib/validation/use-field-validation.ts`

Activates the existing `form-rules.ts` presets for real-time inline validation.

### Strategy: Blur-first validation

- Fields don't show errors on initial render (no "wall of red" on fresh form)
- After a field is blurred (user interacted then moved away), errors appear
- Subsequent typing validates onChange (immediate feedback while fixing)

### Usage

```tsx
import { useFieldValidation } from '@/lib/validation/use-field-validation'
import { RULES } from '@/lib/validation/form-rules'

function MyForm() {
  const v = useFieldValidation({
    name: RULES.required,
    email: RULES.email,
    phone: RULES.phone,
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (v.validateAll()) submit(v.values)
      }}
    >
      <Input
        label="Name"
        value={v.values.name}
        onChange={v.onChange('name')}
        onBlur={v.onBlur('name')}
        error={v.errorFor('name')}
        required
      />
      <Input
        label="Email"
        value={v.values.email}
        onChange={v.onChange('email')}
        onBlur={v.onBlur('email')}
        error={v.errorFor('email')}
        required
      />
      <Button disabled={!v.isValid}>Save</Button>
    </form>
  )
}
```

### API

| Property                 | Type                             | Description                                   |
| ------------------------ | -------------------------------- | --------------------------------------------- |
| `values`                 | `Record<string, string>`         | Current field values                          |
| `errors`                 | `Record<string, string \| null>` | Current field errors                          |
| `isValid`                | `boolean`                        | All fields currently valid                    |
| `isDirty`                | `boolean`                        | Any field has been touched                    |
| `onChange(field)`        | `(e) => void`                    | Handler factory for onChange                  |
| `onBlur(field)`          | `() => void`                     | Handler factory for onBlur (marks as touched) |
| `setValue(field, value)` | `void`                           | Set value programmatically                    |
| `setError(field, error)` | `void`                           | Set error manually (e.g., server errors)      |
| `validateAll()`          | `boolean`                        | Validate all fields at once (for submit)      |
| `reset()`                | `void`                           | Reset to initial values                       |
| `errorFor(field)`        | `string \| undefined`            | Error string for direct prop passing          |

### Available presets (from form-rules.ts)

| Preset                 | Validates                  |
| ---------------------- | -------------------------- |
| `RULES.required`       | Non-empty after trim       |
| `RULES.email`          | Valid email format         |
| `RULES.phone`          | International phone format |
| `RULES.positiveNumber` | Numeric, greater than 0    |
| `RULES.date`           | YYYY-MM-DD format          |

Custom rules:

```tsx
const v = useFieldValidation({
  bio: {
    maxLength: 500,
    custom: (v) => (v.includes('http') ? 'No URLs allowed' : null),
  },
})
```

## Phase 3: Cache Staleness Fixes

### cannabis-access tag (HIGH)

**Problem:** `grantCannabisTier()` and `revokeCannabisTier()` in `lib/admin/cannabis-actions.ts` modified `cannabis_tier_users` but never called `revalidateTag('cannabis-access-...')`. The cache in `layout-data-cache.ts` would serve stale data for up to 60 seconds.

**Fix:** Added `revalidateTag('cannabis-access-${authUserId}')` to both `grantCannabisTier()` and `revokeCannabisTier()`.

### deletion-status tag (HIGH)

**Problem:** `requestAccountDeletion()` and `cancelAccountDeletion()` in `lib/compliance/account-deletion-actions.ts` used `revalidatePath('/', 'layout')` but `revalidatePath` does NOT bust `unstable_cache` tags. The deletion status cache (`deletion-status-{chefId}`) was never invalidated.

**Fix:** Added `revalidateTag('deletion-status-${chefId}')` to both functions.

## Files Modified

- `components/ui/input.tsx` - aria-invalid, aria-describedby, error/helper IDs, role="alert"
- `components/ui/textarea.tsx` - same
- `components/ui/select.tsx` - same
- `components/ui/checkbox-group.tsx` - error prop + display
- `components/ui/radio-group.tsx` - error prop + display
- `lib/admin/cannabis-actions.ts` - revalidateTag on grant/revoke
- `lib/compliance/account-deletion-actions.ts` - revalidateTag on request/cancel

## Files Created

- `lib/validation/use-field-validation.ts` - Real-time validation hook
- `docs/form-intelligence-layer.md` - This document
