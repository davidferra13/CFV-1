-- Support state required by voluntary contribution checkout and webhook handling.
-- Additive only; no existing chef rows are rewritten.
ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS supporter_since timestamptz,
  ADD COLUMN IF NOT EXISTS monthly_support_amount_cents integer,
  ADD COLUMN IF NOT EXISTS last_support_amount_cents integer,
  ADD COLUMN IF NOT EXISTS last_supported_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_supporter_recognition_enabled boolean NOT NULL DEFAULT false;
