-- Search Foundation: Full-Text Search infrastructure for core business tables
-- Adds tsvector columns, GIN indexes, auto-update triggers, trigram indexes,
-- and additional filter indexes for fast querying.
-- Idempotent: safe to run multiple times.

BEGIN;

-- ============================================
-- 1. CLIENTS
-- ============================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_clients_search_vector
  ON clients USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_clients_full_name_trgm
  ON clients USING gin(full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_tenant_created
  ON clients(tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION clients_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.company_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_search_vector ON clients;
CREATE TRIGGER trg_clients_search_vector
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION clients_search_vector_update();

UPDATE clients SET search_vector =
  setweight(to_tsvector('english', COALESCE(full_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(phone, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(company_name, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(notes, '')), 'D');


-- ============================================
-- 2. EVENTS
-- ============================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_events_search_vector
  ON events USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_events_occasion_trgm
  ON events USING gin(occasion gin_trgm_ops);

CREATE OR REPLACE FUNCTION events_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.occasion, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.location_address, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.special_requests, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.ambiance_notes, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_search_vector ON events;
CREATE TRIGGER trg_events_search_vector
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION events_search_vector_update();

UPDATE events SET search_vector =
  setweight(to_tsvector('english', COALESCE(occasion, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(location_address, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(special_requests, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(ambiance_notes, '')), 'C');


-- ============================================
-- 3. MENUS
-- ============================================

ALTER TABLE menus ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_menus_search_vector
  ON menus USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_menus_name_trgm
  ON menus USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_menus_tenant_cuisine_type
  ON menus(tenant_id, cuisine_type);

CREATE OR REPLACE FUNCTION menus_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_menus_search_vector ON menus;
CREATE TRIGGER trg_menus_search_vector
  BEFORE INSERT OR UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION menus_search_vector_update();

UPDATE menus SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(notes, '')), 'C');


-- ============================================
-- 4. RECIPES
-- ============================================

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_recipes_search_vector
  ON recipes USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_recipes_name_trgm
  ON recipes USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_recipes_tenant_cuisine
  ON recipes(tenant_id, cuisine);

CREATE INDEX IF NOT EXISTS idx_recipes_tenant_meal_type
  ON recipes(tenant_id, meal_type);

CREATE INDEX IF NOT EXISTS idx_recipes_tenant_created
  ON recipes(tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION recipes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recipes_search_vector ON recipes;
CREATE TRIGGER trg_recipes_search_vector
  BEFORE INSERT OR UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION recipes_search_vector_update();

UPDATE recipes SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(notes, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'B');


-- ============================================
-- 5. INQUIRIES
-- ============================================

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_inquiries_search_vector
  ON inquiries USING gin(search_vector);

CREATE OR REPLACE FUNCTION inquiries_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.source_message, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.confirmed_occasion, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inquiries_search_vector ON inquiries;
CREATE TRIGGER trg_inquiries_search_vector
  BEFORE INSERT OR UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION inquiries_search_vector_update();

UPDATE inquiries SET search_vector =
  setweight(to_tsvector('english', COALESCE(source_message, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(confirmed_occasion, '')), 'B');


-- ============================================
-- 6. QUOTES
-- ============================================

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_quotes_search_vector
  ON quotes USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_quotes_quote_name_trgm
  ON quotes USING gin(quote_name gin_trgm_ops);

CREATE OR REPLACE FUNCTION quotes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.quote_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.internal_notes, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.pricing_notes, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quotes_search_vector ON quotes;
CREATE TRIGGER trg_quotes_search_vector
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_search_vector_update();

UPDATE quotes SET search_vector =
  setweight(to_tsvector('english', COALESCE(quote_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(internal_notes, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(pricing_notes, '')), 'C');


-- ============================================
-- 7. EXPENSES
-- ============================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_expenses_search_vector
  ON expenses USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_expenses_vendor_name_trgm
  ON expenses USING gin(vendor_name gin_trgm_ops);

CREATE OR REPLACE FUNCTION expenses_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.vendor_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expenses_search_vector ON expenses;
CREATE TRIGGER trg_expenses_search_vector
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION expenses_search_vector_update();

UPDATE expenses SET search_vector =
  setweight(to_tsvector('english', COALESCE(description, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(vendor_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(notes, '')), 'B');


-- ============================================
-- 8. MESSAGES
-- ============================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_messages_search_vector
  ON messages USING gin(search_vector);

CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_search_vector ON messages;
CREATE TRIGGER trg_messages_search_vector
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION messages_search_vector_update();

UPDATE messages SET search_vector =
  setweight(to_tsvector('english', COALESCE(subject, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(body, '')), 'B');


-- ============================================
-- 9. REFERRAL_PARTNERS
-- ============================================

ALTER TABLE referral_partners ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_referral_partners_search_vector
  ON referral_partners USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_referral_partners_name_trgm
  ON referral_partners USING gin(name gin_trgm_ops);

CREATE OR REPLACE FUNCTION referral_partners_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.contact_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_referral_partners_search_vector ON referral_partners;
CREATE TRIGGER trg_referral_partners_search_vector
  BEFORE INSERT OR UPDATE ON referral_partners
  FOR EACH ROW EXECUTE FUNCTION referral_partners_search_vector_update();

UPDATE referral_partners SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(contact_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(notes, '')), 'C');


-- ============================================
-- 10. STAFF_MEMBERS
-- ============================================

ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_staff_members_search_vector
  ON staff_members USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_staff_members_name_trgm
  ON staff_members USING gin(name gin_trgm_ops);

CREATE OR REPLACE FUNCTION staff_members_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_members_search_vector ON staff_members;
CREATE TRIGGER trg_staff_members_search_vector
  BEFORE INSERT OR UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION staff_members_search_vector_update();

UPDATE staff_members SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(phone, '')), 'C');


-- ============================================
-- 11. DISH_INDEX
-- ============================================

ALTER TABLE dish_index ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_dish_index_search_vector
  ON dish_index USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_dish_index_name_trgm
  ON dish_index USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_dish_index_dietary_tags
  ON dish_index USING gin(dietary_tags);

CREATE INDEX IF NOT EXISTS idx_dish_index_tags
  ON dish_index USING gin(tags);

CREATE OR REPLACE FUNCTION dish_index_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.course, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dish_index_search_vector ON dish_index;
CREATE TRIGGER trg_dish_index_search_vector
  BEFORE INSERT OR UPDATE ON dish_index
  FOR EACH ROW EXECUTE FUNCTION dish_index_search_vector_update();

UPDATE dish_index SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(course, '')), 'B');


-- ============================================
-- 12. CLIENT_NOTES
-- ============================================

ALTER TABLE client_notes ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_client_notes_search_vector
  ON client_notes USING gin(search_vector);

CREATE OR REPLACE FUNCTION client_notes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', COALESCE(NEW.note_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_notes_search_vector ON client_notes;
CREATE TRIGGER trg_client_notes_search_vector
  BEFORE INSERT OR UPDATE ON client_notes
  FOR EACH ROW EXECUTE FUNCTION client_notes_search_vector_update();

UPDATE client_notes SET search_vector =
  to_tsvector('english', COALESCE(note_text, ''));


-- ============================================
-- 13. CONVERSATIONS
-- ============================================

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_conversations_search_vector
  ON conversations USING gin(search_vector);

CREATE OR REPLACE FUNCTION conversations_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', COALESCE(NEW.last_message_preview, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversations_search_vector ON conversations;
CREATE TRIGGER trg_conversations_search_vector
  BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION conversations_search_vector_update();

UPDATE conversations SET search_vector =
  to_tsvector('english', COALESCE(last_message_preview, ''));


-- ============================================
-- 14. EVENT_CONTRACTS
-- ============================================

ALTER TABLE event_contracts ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_event_contracts_search_vector
  ON event_contracts USING gin(search_vector);

CREATE OR REPLACE FUNCTION event_contracts_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', COALESCE(NEW.body_snapshot, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_contracts_search_vector ON event_contracts;
CREATE TRIGGER trg_event_contracts_search_vector
  BEFORE INSERT OR UPDATE ON event_contracts
  FOR EACH ROW EXECUTE FUNCTION event_contracts_search_vector_update();

UPDATE event_contracts SET search_vector =
  to_tsvector('english', COALESCE(body_snapshot, ''));


-- ============================================
-- 15. INGREDIENTS
-- ============================================

ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_ingredients_search_vector
  ON ingredients USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm
  ON ingredients USING gin(name gin_trgm_ops);

CREATE OR REPLACE FUNCTION ingredients_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ingredients_search_vector ON ingredients;
CREATE TRIGGER trg_ingredients_search_vector
  BEFORE INSERT OR UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION ingredients_search_vector_update();

UPDATE ingredients SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C');


-- ============================================
-- 16. ADDITIONAL FILTER INDEXES (dishes table)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_dishes_dietary_tags
  ON dishes USING gin(dietary_tags);

CREATE INDEX IF NOT EXISTS idx_dishes_allergen_flags
  ON dishes USING gin(allergen_flags);


COMMIT;
