CREATE OR REPLACE FUNCTION operational_jsonb_has_forbidden_keys(payload jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  WITH RECURSIVE walk(value) AS (
    SELECT COALESCE(payload, '{}'::jsonb)
    UNION ALL
    SELECT child.value
    FROM walk
    CROSS JOIN LATERAL (
      SELECT value
      FROM jsonb_each(
        CASE WHEN jsonb_typeof(walk.value) = 'object' THEN walk.value ELSE '{}'::jsonb END
      )
      UNION ALL
      SELECT value
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(walk.value) = 'array' THEN walk.value ELSE '[]'::jsonb END
      )
    ) child
  )
  SELECT EXISTS (
    SELECT 1
    FROM walk
    CROSS JOIN LATERAL jsonb_object_keys(
      CASE WHEN jsonb_typeof(walk.value) = 'object' THEN walk.value ELSE '{}'::jsonb END
    ) AS keys(key)
    WHERE lower(keys.key) = ANY (ARRAY[
      'body', 'content', 'message', 'messages', 'text', 'transcript',
      'raw_message', 'message_body', 'email_body', 'sms_body', 'chat_body'
    ])
  );
$$;

CREATE TABLE IF NOT EXISTS operational_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  chef_id UUID REFERENCES chefs(id),
  actor_role TEXT NOT NULL,
  actor_entity_id UUID,
  actor_auth_user_id UUID,
  event_category TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_status TEXT NOT NULL DEFAULT 'observed',
  source TEXT NOT NULL,
  subject_type TEXT,
  subject_id UUID,
  target_role TEXT,
  target_entity_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  idempotency_key TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT operational_telemetry_actor_role_check
    CHECK (actor_role IN ('admin', 'chef_owner', 'chef_staff', 'client_owner', 'client_delegate', 'guest', 'vendor', 'system')),
  CONSTRAINT operational_telemetry_target_role_check
    CHECK (target_role IS NULL OR target_role IN ('admin', 'chef_owner', 'chef_staff', 'client_owner', 'client_delegate', 'guest', 'vendor', 'system')),
  CONSTRAINT operational_telemetry_category_check
    CHECK (event_category IN ('auth', 'engagement', 'client_interaction', 'booking', 'operations', 'finance', 'safety', 'system')),
  CONSTRAINT operational_telemetry_status_check
    CHECK (event_status IN ('observed', 'started', 'completed', 'failed', 'blocked', 'cancelled')),
  CONSTRAINT operational_telemetry_no_private_content_check
    CHECK (NOT operational_jsonb_has_forbidden_keys(attributes))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_telemetry_idempotency
  ON operational_telemetry_events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operational_telemetry_tenant_recent
  ON operational_telemetry_events(tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_telemetry_chef_recent
  ON operational_telemetry_events(chef_id, occurred_at DESC)
  WHERE chef_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operational_telemetry_actor_role_recent
  ON operational_telemetry_events(tenant_id, actor_role, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_telemetry_subject
  ON operational_telemetry_events(tenant_id, subject_type, subject_id, occurred_at DESC)
  WHERE subject_type IS NOT NULL AND subject_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS operational_tenant_event_aggregates (
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  aggregate_date DATE NOT NULL,
  event_category TEXT NOT NULL,
  event_name TEXT NOT NULL,
  total_count BIGINT NOT NULL DEFAULT 0,
  failed_count BIGINT NOT NULL DEFAULT 0,
  blocked_count BIGINT NOT NULL DEFAULT 0,
  by_actor_role JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, aggregate_date, event_category, event_name)
);

CREATE INDEX IF NOT EXISTS idx_operational_tenant_aggregates_recent
  ON operational_tenant_event_aggregates(tenant_id, aggregate_date DESC);

CREATE TABLE IF NOT EXISTS operational_chef_event_aggregates (
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  aggregate_date DATE NOT NULL,
  event_category TEXT NOT NULL,
  event_name TEXT NOT NULL,
  total_count BIGINT NOT NULL DEFAULT 0,
  failed_count BIGINT NOT NULL DEFAULT 0,
  blocked_count BIGINT NOT NULL DEFAULT 0,
  by_actor_role JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, chef_id, aggregate_date, event_category, event_name)
);

CREATE INDEX IF NOT EXISTS idx_operational_chef_aggregates_recent
  ON operational_chef_event_aggregates(tenant_id, chef_id, aggregate_date DESC);

CREATE OR REPLACE FUNCTION ingest_operational_telemetry_event(
  p_tenant_id UUID,
  p_chef_id UUID,
  p_actor_role TEXT,
  p_actor_entity_id UUID,
  p_actor_auth_user_id UUID,
  p_event_category TEXT,
  p_event_name TEXT,
  p_event_status TEXT,
  p_source TEXT,
  p_subject_type TEXT,
  p_subject_id UUID,
  p_target_role TEXT,
  p_target_entity_id UUID,
  p_occurred_at TIMESTAMPTZ,
  p_idempotency_key TEXT,
  p_attributes JSONB
)
RETURNS TABLE(event_id UUID, inserted BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id UUID;
  v_inserted BOOLEAN := FALSE;
  v_occurred_at TIMESTAMPTZ := COALESCE(p_occurred_at, now());
  v_attributes JSONB := COALESCE(p_attributes, '{}'::jsonb);
  v_aggregate_date DATE := (COALESCE(p_occurred_at, now()) AT TIME ZONE 'UTC')::date;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  IF operational_jsonb_has_forbidden_keys(v_attributes) THEN
    RAISE EXCEPTION 'operational telemetry attributes cannot include private message content';
  END IF;

  INSERT INTO operational_telemetry_events (
    tenant_id,
    chef_id,
    actor_role,
    actor_entity_id,
    actor_auth_user_id,
    event_category,
    event_name,
    event_status,
    source,
    subject_type,
    subject_id,
    target_role,
    target_entity_id,
    occurred_at,
    idempotency_key,
    attributes
  )
  VALUES (
    p_tenant_id,
    p_chef_id,
    p_actor_role,
    p_actor_entity_id,
    p_actor_auth_user_id,
    p_event_category,
    p_event_name,
    COALESCE(p_event_status, 'observed'),
    p_source,
    p_subject_type,
    p_subject_id,
    p_target_role,
    p_target_entity_id,
    v_occurred_at,
    p_idempotency_key,
    v_attributes
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT id INTO v_event_id
    FROM operational_telemetry_events
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    RETURN QUERY SELECT v_event_id, FALSE;
    RETURN;
  END IF;

  v_inserted := TRUE;

  INSERT INTO operational_tenant_event_aggregates (
    tenant_id,
    aggregate_date,
    event_category,
    event_name,
    total_count,
    failed_count,
    blocked_count,
    by_actor_role,
    first_seen_at,
    last_seen_at
  )
  VALUES (
    p_tenant_id,
    v_aggregate_date,
    p_event_category,
    p_event_name,
    1,
    CASE WHEN COALESCE(p_event_status, 'observed') = 'failed' THEN 1 ELSE 0 END,
    CASE WHEN COALESCE(p_event_status, 'observed') = 'blocked' THEN 1 ELSE 0 END,
    jsonb_build_object(p_actor_role, 1),
    v_occurred_at,
    v_occurred_at
  )
  ON CONFLICT (tenant_id, aggregate_date, event_category, event_name)
  DO UPDATE SET
    total_count = operational_tenant_event_aggregates.total_count + 1,
    failed_count = operational_tenant_event_aggregates.failed_count + CASE WHEN COALESCE(p_event_status, 'observed') = 'failed' THEN 1 ELSE 0 END,
    blocked_count = operational_tenant_event_aggregates.blocked_count + CASE WHEN COALESCE(p_event_status, 'observed') = 'blocked' THEN 1 ELSE 0 END,
    by_actor_role = jsonb_set(
      operational_tenant_event_aggregates.by_actor_role,
      ARRAY[p_actor_role],
      to_jsonb(COALESCE((operational_tenant_event_aggregates.by_actor_role ->> p_actor_role)::bigint, 0) + 1),
      true
    ),
    first_seen_at = LEAST(operational_tenant_event_aggregates.first_seen_at, EXCLUDED.first_seen_at),
    last_seen_at = GREATEST(operational_tenant_event_aggregates.last_seen_at, EXCLUDED.last_seen_at),
    updated_at = now();

  IF p_chef_id IS NOT NULL THEN
    INSERT INTO operational_chef_event_aggregates (
      tenant_id,
      chef_id,
      aggregate_date,
      event_category,
      event_name,
      total_count,
      failed_count,
      blocked_count,
      by_actor_role,
      first_seen_at,
      last_seen_at
    )
    VALUES (
      p_tenant_id,
      p_chef_id,
      v_aggregate_date,
      p_event_category,
      p_event_name,
      1,
      CASE WHEN COALESCE(p_event_status, 'observed') = 'failed' THEN 1 ELSE 0 END,
      CASE WHEN COALESCE(p_event_status, 'observed') = 'blocked' THEN 1 ELSE 0 END,
      jsonb_build_object(p_actor_role, 1),
      v_occurred_at,
      v_occurred_at
    )
    ON CONFLICT (tenant_id, chef_id, aggregate_date, event_category, event_name)
    DO UPDATE SET
      total_count = operational_chef_event_aggregates.total_count + 1,
      failed_count = operational_chef_event_aggregates.failed_count + CASE WHEN COALESCE(p_event_status, 'observed') = 'failed' THEN 1 ELSE 0 END,
      blocked_count = operational_chef_event_aggregates.blocked_count + CASE WHEN COALESCE(p_event_status, 'observed') = 'blocked' THEN 1 ELSE 0 END,
      by_actor_role = jsonb_set(
        operational_chef_event_aggregates.by_actor_role,
        ARRAY[p_actor_role],
        to_jsonb(COALESCE((operational_chef_event_aggregates.by_actor_role ->> p_actor_role)::bigint, 0) + 1),
        true
      ),
      first_seen_at = LEAST(operational_chef_event_aggregates.first_seen_at, EXCLUDED.first_seen_at),
      last_seen_at = GREATEST(operational_chef_event_aggregates.last_seen_at, EXCLUDED.last_seen_at),
      updated_at = now();
  END IF;

  RETURN QUERY SELECT v_event_id, v_inserted;
END;
$$;
