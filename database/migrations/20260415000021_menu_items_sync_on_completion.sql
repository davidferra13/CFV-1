-- ============================================================
-- Migration: Sync menu_items analytics on event completion
-- Fixes: K1 - menu_items table never written automatically
-- ============================================================
-- When an event completes, upsert menu_items rows from the event's
-- menu dishes. Increments times_served and sets last_served_at.
-- Uses the existing increment_recipe_times_cooked trigger as a pattern.
--
-- Match key: (chef_id, menu_id, LOWER(name)) - dish name normalized to
-- avoid duplicates from minor capitalization differences.

CREATE OR REPLACE FUNCTION sync_menu_items_on_event_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chef_id UUID;
  v_menu_id UUID;
BEGIN
  -- Only fire when status changes to 'completed'
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_chef_id := NEW.tenant_id;

  -- Get the menu linked to this event
  SELECT id INTO v_menu_id
  FROM menus
  WHERE event_id = NEW.id
    AND tenant_id = v_chef_id
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_menu_id IS NULL THEN
    RETURN NEW; -- No menu, nothing to sync
  END IF;

  -- Upsert one menu_items row per dish.
  -- On conflict (same chef + menu + normalized name): increment times_served.
  -- On insert: set initial values from dish and its first component's recipe cost.
  INSERT INTO menu_items (
    chef_id,
    menu_id,
    recipe_id,
    name,
    description,
    category,
    food_cost_cents,
    times_served,
    last_served_at
  )
  SELECT
    v_chef_id                                    AS chef_id,
    v_menu_id                                    AS menu_id,
    -- Use the recipe_id from the first component of this dish (if any)
    (
      SELECT c.recipe_id
      FROM components c
      WHERE c.dish_id = d.id
        AND c.recipe_id IS NOT NULL
      ORDER BY c.sort_order, c.created_at
      LIMIT 1
    )                                             AS recipe_id,
    d.course_name                                AS name,
    d.description                                AS description,
    d.course_name                                AS category,
    -- Compute food cost for this dish's components
    COALESCE(
      (
        SELECT SUM(compute_recipe_cost_cents(c.recipe_id))
        FROM components c
        WHERE c.dish_id = d.id
          AND c.recipe_id IS NOT NULL
      ),
      0
    )                                             AS food_cost_cents,
    1                                             AS times_served,
    NEW.event_date                                AS last_served_at
  FROM dishes d
  WHERE d.menu_id = v_menu_id
    AND d.course_name IS NOT NULL
  ON CONFLICT (chef_id, menu_id, name)
  DO UPDATE SET
    times_served    = menu_items.times_served + 1,
    last_served_at  = EXCLUDED.last_served_at,
    food_cost_cents = EXCLUDED.food_cost_cents, -- Refresh cost on each completion
    updated_at      = NOW();

  RETURN NEW;
END;
$$;

-- Unique constraint required for the ON CONFLICT clause
-- Only add if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'menu_items'::regclass
      AND conname   = 'menu_items_chef_menu_name_unique'
  ) THEN
    ALTER TABLE menu_items
      ADD CONSTRAINT menu_items_chef_menu_name_unique
      UNIQUE (chef_id, menu_id, name);
  END IF;
END;
$$;

-- Attach trigger (fires after the existing recipe times_cooked trigger)
DROP TRIGGER IF EXISTS sync_menu_items_on_event_completion_trigger ON events;

CREATE TRIGGER sync_menu_items_on_event_completion_trigger
  AFTER UPDATE ON events
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION sync_menu_items_on_event_completion();
