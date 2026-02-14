# Events UI - Status Change Interface (V1)

## Transition Buttons

Display allowed transitions based on current status:

```tsx
export function EventTransitionActions({ event }: { event: Event }) {
  const allowedTransitions = getAllowedTransitions(event.status);

  return (
    <div className="transition-actions">
      {allowedTransitions.map((toStatus) => (
        <button
          key={toStatus}
          onClick={() => handleTransition(event.id, toStatus)}
          className="btn-transition"
        >
          {getTransitionLabel(event.status, toStatus)}
        </button>
      ))}
    </div>
  );
}
```

---

## Transition Labels

```typescript
function getTransitionLabel(from: EventStatus, to: EventStatus): string {
  const labels: Record<string, string> = {
    'draft->proposed': 'Mark as Proposed',
    'proposed->deposit_pending': 'Request Deposit',
    'confirmed->menu_in_progress': 'Start Menu',
    'menu_in_progress->menu_locked': 'Lock Menu',
    'menu_locked->executed': 'Mark as Executed',
    'executed->closed': 'Close Event',
  };

  return labels[`${from}->${to}`] || `Transition to ${to}`;
}
```

---

## Confirmation Modal

```tsx
<Modal open={showConfirm} onClose={() => setShowConfirm(false)}>
  <h2>Confirm Transition</h2>
  <p>Change event status from {event.status} to {targetStatus}?</p>
  <button onClick={confirmTransition}>Confirm</button>
  <button onClick={() => setShowConfirm(false)}>Cancel</button>
</Modal>
```

---

**End of Events UI - Status Change Interface**
