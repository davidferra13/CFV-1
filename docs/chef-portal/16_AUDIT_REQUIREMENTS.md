# Audit Requirements (V1)

## Auditable Actions

Every critical action must answer: **Who, What, When, Why**

---

## Required Audit Logs

### 1. Event Transitions
Table: `event_transitions` (immutable)
- `from_status`, `to_status`
- `triggered_by` (user_id or 'system')
- `triggered_at`
- `notes`

### 2. Ledger Entries
Table: `ledger_entries` (immutable)
- `entry_type`, `amount_cents`
- `stripe_event_id`
- `created_at`

### 3. Client Invites
Table: `client_invites`
- `created_at`, `accepted_at`
- `accepted_by_user_id`

### 4. Menu Changes
Table: `menu_audit_log`
- `action` (created, locked, unlocked, version_created)
- `actor_id`, `created_at`

---

## Audit Query Patterns

### Get Full Event History

```typescript
async function getEventAuditTrail(eventId: string) {
  const transitions = await db.event_transitions.findMany({
    where: { event_id: eventId },
    orderBy: { triggered_at: 'asc' },
  });

  const ledgerEntries = await db.ledger_entries.findMany({
    where: { event_id: eventId },
    orderBy: { created_at: 'asc' },
  });

  return { transitions, ledgerEntries };
}
```

---

## Retention Policy

Audit logs retained **indefinitely** (no deletion).

---

**End of Audit Requirements**
