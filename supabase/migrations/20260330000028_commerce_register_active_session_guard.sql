-- Commerce POS hardening:
-- enforce one active register session (open or suspended) per tenant.
--
-- Migration safety:
-- If historical data contains multiple active sessions for a tenant,
-- keep the newest session active and auto-close older duplicates so
-- the unique index can be created without failing.

WITH ranked_active AS (
  SELECT
    id,
    tenant_id,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id
      ORDER BY opened_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM register_sessions
  WHERE status IN ('open', 'suspended')
),
duplicates AS (
  SELECT id
  FROM ranked_active
  WHERE rn > 1
)
UPDATE register_sessions rs
SET
  status = 'closed',
  closed_at = COALESCE(rs.closed_at, now()),
  close_notes = TRIM(
    CONCAT(
      COALESCE(rs.close_notes || ' ', ''),
      '[auto-closed by migration 20260330000028: duplicate active register session]'
    )
  )
WHERE rs.id IN (SELECT id FROM duplicates);

CREATE UNIQUE INDEX IF NOT EXISTS idx_register_sessions_one_active_per_tenant
  ON register_sessions (tenant_id)
  WHERE status IN ('open', 'suspended');
