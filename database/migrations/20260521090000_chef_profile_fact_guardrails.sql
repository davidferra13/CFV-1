ALTER TABLE public.chef_profiles
  ADD COLUMN IF NOT EXISTS private_profile_memory text,
  ADD COLUMN IF NOT EXISTS profile_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS birth_month integer,
  ADD COLUMN IF NOT EXISTS birth_day integer,
  ADD COLUMN IF NOT EXISTS birthdate_purpose jsonb NOT NULL DEFAULT '{"fullDob":"legal_compliance_only","monthDay":"internal_reminders_personalization","age":"computed_when_needed"}'::jsonb,
  ADD COLUMN IF NOT EXISTS public_bio_settings jsonb NOT NULL DEFAULT '{"maxChars":600,"proofChipMaxChars":60,"maxProofChips":8,"cannabisDisclosureMode":"hidden","externalLongFormLinks":[]}'::jsonb;

ALTER TABLE public.chef_profiles
  ADD CONSTRAINT chef_profiles_birth_month_check
    CHECK (birth_month IS NULL OR (birth_month >= 1 AND birth_month <= 12)) NOT VALID,
  ADD CONSTRAINT chef_profiles_birth_day_check
    CHECK (birth_day IS NULL OR (birth_day >= 1 AND birth_day <= 31)) NOT VALID,
  ADD CONSTRAINT chef_profiles_profile_facts_array_check
    CHECK (jsonb_typeof(profile_facts) = 'array') NOT VALID,
  ADD CONSTRAINT chef_profiles_public_bio_settings_object_check
    CHECK (jsonb_typeof(public_bio_settings) = 'object') NOT VALID,
  ADD CONSTRAINT chef_profiles_birthdate_purpose_object_check
    CHECK (jsonb_typeof(birthdate_purpose) = 'object') NOT VALID;

CREATE INDEX IF NOT EXISTS idx_chef_profiles_profile_facts_gin
  ON public.chef_profiles USING gin (profile_facts);
