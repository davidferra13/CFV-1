-- Fix: user_roles.entity_id is a polymorphic FK (points to chefs OR clients
-- depending on role) with NO database constraint. This means:
--   1. A garbage UUID could be inserted
--   2. Deleting a chef/client leaves orphaned user_roles rows
--
-- PostgreSQL does not support conditional FKs, so we use a trigger to enforce
-- referential integrity at the database level.

-- Trigger function: validates entity_id exists in the correct table
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
  ELSE
    RAISE EXCEPTION 'Unknown role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Fire on INSERT and UPDATE (role or entity_id change)
CREATE TRIGGER trg_validate_user_role_entity_id
  BEFORE INSERT OR UPDATE OF role, entity_id ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_role_entity_id();
-- Cleanup trigger: when a chef or client is deleted, remove their user_roles entry.
-- This prevents zombie roles pointing to deleted entities.

CREATE OR REPLACE FUNCTION cleanup_user_roles_on_entity_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM user_roles WHERE entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_cleanup_user_roles_on_chef_delete
  AFTER DELETE ON chefs
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_user_roles_on_entity_delete();
CREATE TRIGGER trg_cleanup_user_roles_on_client_delete
  AFTER DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_user_roles_on_entity_delete();
