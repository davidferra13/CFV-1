-- Loyalty redemptions: immutable monetary snapshot fields
-- Ensures invoice adjustments can be computed deterministically even if reward
-- catalog values are edited later.

ALTER TABLE loyalty_reward_redemptions
  ADD COLUMN IF NOT EXISTS reward_value_cents integer,
  ADD COLUMN IF NOT EXISTS reward_percent integer;

COMMENT ON COLUMN loyalty_reward_redemptions.reward_value_cents IS
  'Snapshot of loyalty_rewards.reward_value_cents at redemption time (discount_fixed only).';

COMMENT ON COLUMN loyalty_reward_redemptions.reward_percent IS
  'Snapshot of loyalty_rewards.reward_percent at redemption time (discount_percent only).';

-- Backfill existing discount redemptions from the current catalog values.
-- This is best-effort historical recovery for rows created before snapshots existed.
UPDATE loyalty_reward_redemptions lrr
SET
  reward_value_cents = lr.reward_value_cents,
  reward_percent = lr.reward_percent
FROM loyalty_rewards lr
WHERE lrr.reward_id = lr.id
  AND lrr.reward_type IN ('discount_fixed', 'discount_percent')
  AND lrr.reward_value_cents IS NULL
  AND lrr.reward_percent IS NULL;

CREATE INDEX IF NOT EXISTS idx_lrr_delivered_event
  ON loyalty_reward_redemptions(event_id, created_at)
  WHERE delivery_status = 'delivered' AND event_id IS NOT NULL;
