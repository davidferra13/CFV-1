-- Menu Doc Editor: new fields
-- Adds dish.name (actual dish title, separate from course_name section label),
-- and menu.price_per_person_cents, menu.simple_mode, menu.simple_mode_content
-- for the Google Doc-style menu editor and opt-out simple mode.
-- Purely additive — no existing columns altered or removed.

-- 1. Dish name: the visible title of the dish (e.g. "Autumn Beet Salad")
--    Separate from course_name which is the section label ("STARTER")
ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Per-menu pricing for standalone menus and templates
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS price_per_person_cents INTEGER CHECK (price_per_person_cents > 0);

-- 3. Simple mode: opt-out of structured editor; chef writes freeform text
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS simple_mode BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS simple_mode_content TEXT;

-- Helpful comment indexes — none needed, these fields don't require filtering
