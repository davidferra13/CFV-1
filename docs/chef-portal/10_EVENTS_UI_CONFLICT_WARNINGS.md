# Events UI - Conflict Warnings (V1)

## Overlap Detection UI

When creating/editing events, check for calendar conflicts.

---

## Warning Types

### Soft Conflict (Proposed Events)
```tsx
<div className="alert alert-warning">
  <p>⚠️ Time overlaps with another proposed event:</p>
  <ul>
    {conflicts.map((c) => (
      <li key={c.id}>
        {c.event_type} - {format(c.start_ts, 'PPp')}
      </li>
    ))}
  </ul>
  <p>You can still proceed, but consider rescheduling.</p>
</div>
```

---

### Hard Conflict (Confirmed Events)
```tsx
<div className="alert alert-error">
  <p>❌ Cannot confirm: Time conflicts with confirmed event:</p>
  <ul>
    {hardConflicts.map((c) => (
      <li key={c.id}>
        {c.event_type} - {format(c.start_ts, 'PPp')}
        <Link href={`/events/${c.id}`}>View Event</Link>
      </li>
    ))}
  </ul>
  <p>Please choose a different time.</p>
</div>
```

---

## Real-Time Validation

```tsx
useEffect(() => {
  if (startTime && endTime) {
    checkConflicts(startTime, endTime).then(setConflicts);
  }
}, [startTime, endTime]);

// Disable confirm button if hard conflicts exist
<button
  onClick={handleConfirm}
  disabled={hardConflicts.length > 0}
>
  Confirm Event
</button>
```

---

**End of Events UI - Conflict Warnings**
