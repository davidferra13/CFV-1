-- Hub Guest Friends — peer-to-peer friend connections between app users
-- Cross-tenant: any user can friend any other user regardless of which chef they booked with

CREATE TABLE IF NOT EXISTS hub_guest_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  CONSTRAINT no_self_friend CHECK (requester_id <> addressee_id)
);
-- Unique index on ordered pair to prevent duplicate friendships regardless of direction
CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_guest_friends_unique_pair
  ON hub_guest_friends (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
-- Index for fast lookups: "all friends of profile X"
CREATE INDEX IF NOT EXISTS idx_hub_guest_friends_requester ON hub_guest_friends(requester_id);
CREATE INDEX IF NOT EXISTS idx_hub_guest_friends_addressee ON hub_guest_friends(addressee_id);
CREATE INDEX IF NOT EXISTS idx_hub_guest_friends_status ON hub_guest_friends(status);
-- RLS: public access via admin client (server actions use admin client)
ALTER TABLE hub_guest_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON hub_guest_friends
  FOR ALL USING (true) WITH CHECK (true);
COMMENT ON TABLE hub_guest_friends IS 'Peer-to-peer friend connections between hub guest profiles (cross-tenant)';
