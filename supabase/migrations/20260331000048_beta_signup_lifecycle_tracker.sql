-- Beta Signup Lifecycle Tracker
-- Tracks the pre-account beta signup lifecycle and the post-account onboarding state
-- for chefs coming through the public beta funnel.

CREATE TABLE IF NOT EXISTS beta_signup_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_id UUID NOT NULL UNIQUE REFERENCES beta_signups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  chef_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  auth_user_id UUID,

  current_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (current_status IN ('pending', 'invited', 'account_ready', 'onboarding', 'declined', 'completed')),
  current_stage TEXT NOT NULL DEFAULT 'application_review'
    CHECK (current_stage IN ('application_review', 'account_creation', 'workspace_launch', 'setup_hub', 'review_closed', 'activated')),
  progress_percent INTEGER NOT NULL DEFAULT 15
    CHECK (progress_percent >= 0 AND progress_percent <= 100),
  next_action TEXT,

  last_email_type TEXT
    CHECK (last_email_type IN ('pending_review', 'invited', 'account_ready', 'onboarding_reminder', 'declined', 'onboarding_complete')),
  last_email_sent_at TIMESTAMPTZ,

  pending_review_sent_at TIMESTAMPTZ,
  invited_sent_at TIMESTAMPTZ,
  declined_sent_at TIMESTAMPTZ,
  account_ready_sent_at TIMESTAMPTZ,
  onboarding_reminder_sent_at TIMESTAMPTZ,
  completed_sent_at TIMESTAMPTZ,

  invited_at TIMESTAMPTZ,
  account_created_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_signup_trackers_email
  ON beta_signup_trackers(email);

CREATE INDEX IF NOT EXISTS idx_beta_signup_trackers_status
  ON beta_signup_trackers(current_status);

CREATE INDEX IF NOT EXISTS idx_beta_signup_trackers_chef
  ON beta_signup_trackers(chef_id)
  WHERE chef_id IS NOT NULL;

ALTER TABLE beta_signup_trackers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE beta_signup_trackers IS
  'Tracks public beta signup lifecycle, email delivery milestones, and onboarding progression for chefs entering through the beta funnel.';
