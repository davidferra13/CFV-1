# Deposit Defaults Auto-Fill in EventForm

## What Changed

Modified `components/events/event-form.tsx` to support automatic deposit amount population from chef-configured deposit defaults.

## Why

Chefs frequently use the same deposit policy for most events (e.g., "always 50% of the quoted price" or "always a flat $200 deposit"). Rather than requiring manual entry every time, the form now auto-fills the deposit field from saved preferences, reducing repetitive data entry while keeping full manual override capability.

## How It Works

### Props

A new optional `depositDefaults` prop was added to `EventFormProps`:

```typescript
type DepositDefaults = {
  enabled: boolean
  type: 'percentage' | 'fixed'
  percentage: number
  amountCents: number
}
```

The parent page (new event page) fetches defaults via `getDepositDefaults()` and passes them through.

### Auto-Fill Logic

**Fixed amount defaults:**

- On component mount in create mode, if defaults are enabled and type is `'fixed'`, the deposit field is immediately pre-populated with `amountCents / 100` (converted to dollars).

**Percentage defaults:**

- Cannot be computed until a quoted price is entered.
- When the chef types a quoted price, the deposit auto-calculates as `quotedPrice * percentage / 100`.
- As the quoted price changes, the deposit recalculates automatically -- but only while `depositSource` is `'default'`.

### Deposit Source Tracking

A `depositSource` state tracks where the current deposit value came from:

| Value       | Meaning                        |
| ----------- | ------------------------------ |
| `'default'` | Auto-filled from chef defaults |
| `'manual'`  | Chef typed a custom value      |
| `'none'`    | No deposit entered yet         |

This state drives two behaviors:

1. **Percentage recalculation** only happens when source is `'default'` or transitioning from `'none'`.
2. **Helper text** below the deposit field only shows when source is `'default'`.

### UI Indicators

When `depositSource === 'default'`:

- A branded helper message appears: "Auto-filled from your defaults (50%)" or "Auto-filled from your defaults ($200.00)"
- A "Clear" link appears next to the message, which resets the deposit to empty and sets source to `'none'`

When the chef manually edits the deposit field, the source switches to `'manual'` and the auto-fill indicators disappear. The standard helper text ("Required deposit amount (optional)") returns.

### Edit Mode

Auto-fill only applies in create mode. In edit mode, the existing event's `deposit_amount_cents` is used as-is, and `depositSource` is set to `'manual'` (no auto-fill behavior).

## Files Modified

- `components/events/event-form.tsx` -- all changes described above

## Connection to System

This feature supports the deposit default preferences feature (settings page). The data flow is:

1. Chef configures defaults in Settings -> `chef_settings` table
2. New event page calls `getDepositDefaults()` server action
3. Defaults passed as prop to `EventForm`
4. Form auto-fills deposit on create, chef can always override
