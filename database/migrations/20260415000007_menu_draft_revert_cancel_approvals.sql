-- ============================================================
-- Migration: Cancel stale approval requests when menu reverts to draft
-- Fixes: B2 (shared -> draft revert leaves client with live approval link)
-- ============================================================

-- When a menu transitions back to 'draft', any pending approval requests
-- for the linked event must be cancelled. Otherwise the client holds a link
-- to approve a menu the chef is actively revising.
--
-- We add a status='cancelled' value to the menu_approval_requests enum
-- (if it doesn't exist), then create a trigger on the menus table that
-- fires after status changes to 'draft'.

-- Step 1: Extend the approval status enum to include 'cancelled'
ALTER TYPE IF EXISTS menu_approval_status_enum ADD VALUE IF NOT EXISTS 'cancelled';

-- Fallback: if the column uses a CHECK constraint instead of an enum, patch it
DO $$
BEGIN
  -- Try to add 'cancelled' to approval status on the table if it's a check-based text column
  -- This is a no-op if the column already accepts 'cancelled'
  BEGIN
    ALTER TABLE menu_approval_requests
      DROP CONSTRAINT IF EXISTS menu_approval_requests_status_check;

    ALTER TABLE menu_approval_requests
      ADD CONSTRAINT menu_approval_requests_status_check
      CHECK (status IN ('not_sent', 'sent', 'approved', 'revision_requested', 'cancelled'));
  EXCEPTION WHEN others THEN
    -- Column may be an enum; no action needed
    NULL;
  END;
END;
$$;

-- Also patch the events.menu_approval_status if it has a similar check
DO $$
BEGIN
  BEGIN
    ALTER TABLE events
      DROP CONSTRAINT IF EXISTS events_menu_approval_status_check;

    ALTER TABLE events
      ADD CONSTRAINT events_menu_approval_status_check
      CHECK (menu_approval_status IN ('not_sent', 'sent', 'approved', 'revision_requested', 'cancelled'));
  EXCEPTION WHEN others THEN
    NULL;
  END;
END;
$$;

-- Step 2: Function that cancels open approval requests for an event
CREATE OR REPLACE FUNCTION cancel_pending_menu_approvals_for_event(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark any 'sent' approval requests as 'cancelled'
  UPDATE menu_approval_requests
  SET status = 'cancelled',
      responded_at = NOW()
  WHERE event_id = p_event_id
    AND status = 'sent';

  -- Reset the event's approval status back to 'not_sent'
  UPDATE events
  SET menu_approval_status = 'not_sent',
      menu_sent_at = NULL,
      updated_at = NOW()
  WHERE id = p_event_id
    AND menu_approval_status = 'sent';
END;
$$;

-- Step 3: Trigger function that fires when a menu status changes to 'draft'
CREATE OR REPLACE FUNCTION cancel_approvals_on_menu_draft_revert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when transitioning INTO 'draft' from a different status
  IF NEW.status = 'draft' AND OLD.status IS DISTINCT FROM 'draft' THEN
    -- If this menu is linked to an event, cancel its pending approvals
    IF NEW.event_id IS NOT NULL THEN
      PERFORM cancel_pending_menu_approvals_for_event(NEW.event_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 4: Attach the trigger to the menus table
DROP TRIGGER IF EXISTS cancel_approvals_on_menu_draft_revert_trigger ON menus;

CREATE TRIGGER cancel_approvals_on_menu_draft_revert_trigger
  AFTER UPDATE OF status ON menus
  FOR EACH ROW
  EXECUTE FUNCTION cancel_approvals_on_menu_draft_revert();
