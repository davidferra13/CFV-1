# Database Views and Projections (V1)

## Purpose of Views

Views provide:
1. **Safe client projections** (exclude chef-private fields)
2. **Computed columns** (payment state from ledger)
3. **Simplified queries** (denormalized data)

## Client-Safe Event View

```sql
CREATE VIEW client_events AS
SELECT
  e.id,
  e.event_type,
  e.start_ts,
  e.end_ts,
  e.status,
  e.total_amount_cents,
  e.deposit_amount_cents,
  e.client_id,
  e.created_at
  -- Excludes: chef_private_notes, internal_status, etc.
FROM events e
WHERE e.deleted_at IS NULL;
```

RLS on view:

```sql
ALTER VIEW client_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_access ON client_events
FOR SELECT
USING (
  client_id = (
    SELECT client_profile_id FROM user_roles WHERE user_id = auth.uid() AND role = 'client'
  )
);
```

## Payment State View

```sql
CREATE VIEW event_payment_summary AS
SELECT
  e.id AS event_id,
  e.total_amount_cents,
  e.deposit_amount_cents,
  COALESCE(SUM(CASE WHEN l.entry_type = 'charge_succeeded' THEN l.amount_cents ELSE 0 END), 0) AS total_paid_cents,
  COALESCE(SUM(CASE WHEN l.entry_type IN ('refund_succeeded', 'adjustment') THEN l.amount_cents ELSE 0 END), 0) AS total_refunded_cents
FROM events e
LEFT JOIN ledger_entries l ON l.event_id = e.id
GROUP BY e.id;
```

## Menu Client Projection

```sql
CREATE VIEW client_menus AS
SELECT
  m.id,
  m.event_id,
  m.name,
  m.description,
  m.locked,
  m.locked_at
  -- Excludes: chef_internal_notes, prep_notes, sourcing_notes
FROM event_menus m
WHERE m.deleted_at IS NULL;
```

## V1 Scope

V1 uses **minimal views**:
- Client-safe event view
- Payment summary view (computed)

Complex views deferred to V2.
