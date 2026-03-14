-- Keep media assets pending by default even if the base migration already ran.
ALTER TABLE IF EXISTS public.public_media_assets
  ALTER COLUMN approval_status SET DEFAULT 'pending';
