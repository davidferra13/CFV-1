-- Featured ready-to-book menu
-- Lets a chef designate one menu as the public ready-to-book option.

ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS featured_booking_menu_id UUID REFERENCES menus(id) ON DELETE SET NULL;

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS selected_menu_id UUID REFERENCES menus(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chefs_featured_booking_menu
  ON chefs(featured_booking_menu_id)
  WHERE featured_booking_menu_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inquiries_selected_menu
  ON inquiries(selected_menu_id)
  WHERE selected_menu_id IS NOT NULL;
