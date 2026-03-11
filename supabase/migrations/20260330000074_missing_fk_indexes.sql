-- Fix: Add missing indexes on FK columns for tables with heavy inbound references.
-- Without these, CASCADE deletes and JOINs on these tables do full table scans.

-- ==============================================
-- recipe_ingredients: missing index on ingredient_id FK
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient
  ON recipe_ingredients(ingredient_id);
-- ==============================================
-- menu_approval_requests: missing index on menu reference
-- (if table exists from gap closure migration)
-- ==============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_approval_requests') THEN
    CREATE INDEX IF NOT EXISTS idx_menu_approval_requests_event
      ON menu_approval_requests(event_id);
    CREATE INDEX IF NOT EXISTS idx_menu_approval_requests_client
      ON menu_approval_requests(client_id);
  END IF;
END $$;
-- ==============================================
-- hub_guest_profiles: missing indexes on profile FK columns
-- (heavily referenced by hub_messages, hub_connections, hub_polls)
-- ==============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hub_messages') THEN
    CREATE INDEX IF NOT EXISTS idx_hub_messages_author_profile
      ON hub_messages(author_profile_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hub_connections') THEN
    CREATE INDEX IF NOT EXISTS idx_hub_connections_from_profile
      ON hub_connections(from_profile_id);
    CREATE INDEX IF NOT EXISTS idx_hub_connections_to_profile
      ON hub_connections(to_profile_id);
  END IF;
END $$;
-- ==============================================
-- hub_group_members: missing index on group_id FK
-- ==============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hub_group_members') THEN
    CREATE INDEX IF NOT EXISTS idx_hub_group_members_group
      ON hub_group_members(group_id);
  END IF;
END $$;
-- ==============================================
-- guest_feedback: missing index on event_guest FK
-- ==============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guest_feedback') THEN
    CREATE INDEX IF NOT EXISTS idx_guest_feedback_event_guest
      ON guest_feedback(event_guest_id);
  END IF;
END $$;
-- ==============================================
-- Composite indexes for common tenant+FK query patterns
-- ==============================================

-- chef_documents: tenant + event, tenant + client (for filtered lookups)
CREATE INDEX IF NOT EXISTS idx_chef_documents_tenant_event
  ON chef_documents(tenant_id, event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chef_documents_tenant_client
  ON chef_documents(tenant_id, client_id) WHERE client_id IS NOT NULL;
-- vendor_price_points: vendor + ingredient (common join pattern)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_price_points') THEN
    CREATE INDEX IF NOT EXISTS idx_vendor_price_points_vendor_ingredient
      ON vendor_price_points(vendor_id, ingredient_id);
  END IF;
END $$;
