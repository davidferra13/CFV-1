-- Fix: validate_user_role_entity_id trigger only handled 'chef' and 'client'.
-- 'staff', 'partner', and 'system' roles caused "Unknown role" errors.
-- Update trigger to allow all valid user_role enum values.
-- chef and client still get referential integrity checks.
-- staff, partner, system are validated as known roles but no entity FK enforced.

CREATE OR REPLACE FUNCTION validate_user_role_entity_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'chef' THEN
    IF NOT EXISTS (SELECT 1 FROM chefs WHERE id = NEW.entity_id) THEN
      RAISE EXCEPTION 'entity_id % does not reference a valid chef', NEW.entity_id;
    END IF;
  ELSIF NEW.role = 'client' THEN
    IF NOT EXISTS (SELECT 1 FROM clients WHERE id = NEW.entity_id) THEN
      RAISE EXCEPTION 'entity_id % does not reference a valid client', NEW.entity_id;
    END IF;
  ELSIF NEW.role IN ('staff', 'partner', 'system') THEN
    -- No cross-table FK enforced for these roles (entity_id may reference different tables)
    NULL;
  ELSE
    RAISE EXCEPTION 'Unknown role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
