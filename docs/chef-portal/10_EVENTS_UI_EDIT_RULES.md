# Events UI - Edit Rules (V1)

## Editable Fields by Status

### Draft
- All fields editable

### Proposed
- Basic details editable
- Financial terms editable (triggers re-proposal)

### Deposit Pending
- Limited editing (requires canceling payment intent)
- Reschedule allowed

### Confirmed and Beyond
- Basic details locked
- Financial terms locked
- Only reschedule and cancellation allowed

---

## Edit Restrictions

```typescript
function getEditableFields(status: EventStatus): string[] {
  switch (status) {
    case 'draft':
      return ['all'];
    case 'proposed':
      return ['event_type', 'start_ts', 'end_ts', 'guest_count', 'total_amount_cents', 'deposit_amount_cents'];
    case 'deposit_pending':
      return ['start_ts', 'end_ts']; // Reschedule only
    default:
      return []; // Locked after confirmation
  }
}
```

---

## UI Behavior

```tsx
const isFieldLocked = (field: string) => {
  const editableFields = getEditableFields(event.status);
  return !editableFields.includes('all') && !editableFields.includes(field);
};

<Input
  label="Event Type"
  value={eventType}
  onChange={setEventType}
  disabled={isFieldLocked('event_type')}
/>
```

---

**End of Events UI - Edit Rules**
