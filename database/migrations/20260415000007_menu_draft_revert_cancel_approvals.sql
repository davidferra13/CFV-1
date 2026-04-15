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
-- IF NOT EXISTS requires PostgreSQL 12+ (supported)
ALTER TYPE menu_approval_status ADD VALUE IF NOT EXISTS 'cancelled';

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
