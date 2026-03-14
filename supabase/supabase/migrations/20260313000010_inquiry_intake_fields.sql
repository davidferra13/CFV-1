-- Migration: Intake Form New Fields on Inquiries
-- Adds budget_range, referral_source, and service_style_pref to the inquiries table.
-- Survey data: Chef 2 cut back-and-forth from 20-30 to 5-15 messages by using
--   a structured intake form. Capturing these three fields upfront eliminates
--   the most common clarifying questions.

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS budget_range       TEXT,
  ADD COLUMN IF NOT EXISTS referral_source    TEXT,
  ADD COLUMN IF NOT EXISTS service_style_pref TEXT;

-- budget_range expected values (free-text, UI enforces select):
--   'under_500' | '500_1000' | '1000_2500' | '2500_plus'

-- referral_source expected values:
--   'instagram' | 'google' | 'referral' | 'take_a_chef'
--   'event_planner' | 'facebook' | 'word_of_mouth' | 'other'

-- service_style_pref expected values:
--   'plated' | 'family_style' | 'cocktail' | 'buffet' | 'flexible' | 'not_sure'

COMMENT ON COLUMN inquiries.budget_range IS 'Client budget range submitted at inquiry time';
COMMENT ON COLUMN inquiries.referral_source IS 'How the client found the chef';
COMMENT ON COLUMN inquiries.service_style_pref IS 'Preferred service style: plated, family_style, cocktail, buffet, flexible';
