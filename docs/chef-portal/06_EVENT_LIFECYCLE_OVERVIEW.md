# Event Lifecycle Overview (V1)

## Finite State Machine

Events follow an 8-state lifecycle:

```
draft → proposed → deposit_pending → confirmed →
menu_in_progress → menu_locked → executed → closed
```

Terminal states: `closed`, `canceled`

## Server-Enforced

Transitions are server-authoritative:
- Checked against transition map
- Logged to `event_transitions` table
- Idempotent (duplicate requests ignored)

## Lifecycle Guarantee

Every transition is:
- ✅ Valid (checked against map)
- ✅ Logged (immutable audit)
- ✅ Atomic (database transaction)
- ❌ Never skipped
- ❌ Never reversed (except via explicit transitions)
