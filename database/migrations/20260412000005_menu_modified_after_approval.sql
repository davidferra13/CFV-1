-- Add menu_modified_after_approval flag to events
-- Set when a chef edits a menu that the client has already approved.
-- The client event detail page uses this to show a "menu updated" banner.
-- Cleared when the client re-approves the menu.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS menu_modified_after_approval BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN events.menu_modified_after_approval IS
  'True when the chef edited the menu after the client approved it. Cleared on re-approval.';
