-- Add 'revoked' to cannabis_tier_invitations admin_approval_status CHECK constraint
-- Fixes: revokeApprovedInvite() writes 'revoked' but CHECK only allowed pending/approved/rejected

ALTER TABLE cannabis_tier_invitations
  DROP CONSTRAINT cannabis_tier_invitations_admin_approval_status_check;

ALTER TABLE cannabis_tier_invitations
  ADD CONSTRAINT cannabis_tier_invitations_admin_approval_status_check
  CHECK (admin_approval_status IN ('pending', 'approved', 'rejected', 'revoked'));
