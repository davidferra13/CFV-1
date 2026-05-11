-- Circle Remy: per-member AI toggle
-- Allows each circle member to independently show/hide Remy messages.
-- Default: true (Remy visible). Toggle is per-member, not per-circle.

ALTER TABLE hub_group_members
ADD COLUMN show_remy BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN hub_group_members.show_remy IS 'Per-member toggle to show/hide Remy AI messages in this circle. Default true.';
