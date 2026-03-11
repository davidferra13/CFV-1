-- Add business logo support for chefs.
-- logo_url is separate from profile_image_url (the chef's personal headshot).
-- The logo is the chef's brand mark / business logo shown on the public profile.

ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
-- Storage bucket for chef logos (public, max 5MB, JPEG/PNG/WebP/SVG)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chef-logos',
  'chef-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
