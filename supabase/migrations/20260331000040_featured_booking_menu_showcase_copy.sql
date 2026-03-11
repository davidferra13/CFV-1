ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS featured_booking_badge TEXT,
  ADD COLUMN IF NOT EXISTS featured_booking_title TEXT,
  ADD COLUMN IF NOT EXISTS featured_booking_pitch TEXT;

COMMENT ON COLUMN public.chefs.featured_booking_badge IS
  'Optional short eyebrow shown above a chef''s featured ready-to-book menu.';

COMMENT ON COLUMN public.chefs.featured_booking_title IS
  'Optional headline used to merchandize the featured ready-to-book menu.';

COMMENT ON COLUMN public.chefs.featured_booking_pitch IS
  'Optional sales copy shown alongside the featured ready-to-book menu on public booking surfaces.';
