-- Founder Authority database guard.
-- Blocks direct SQL from disabling or downgrading the canonical founder platform row.

CREATE OR REPLACE FUNCTION prevent_founder_authority_platform_admin_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  founder_email constant text := 'davidferra13@gmail.com';
  founder_auth_user_id constant uuid := '0c254be3-8e70-42a0-84d9-39a01a877ae8';
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.email = founder_email OR OLD.auth_user_id = founder_auth_user_id THEN
      RAISE EXCEPTION 'Founder Authority platform row cannot be deleted';
    END IF;

    RETURN OLD;
  END IF;

  IF
    NEW.email = founder_email OR
    NEW.auth_user_id = founder_auth_user_id OR
    (TG_OP = 'UPDATE' AND (OLD.email = founder_email OR OLD.auth_user_id = founder_auth_user_id))
  THEN
    IF NEW.email <> founder_email THEN
      RAISE EXCEPTION 'Founder Authority email cannot be changed';
    END IF;

    IF NEW.auth_user_id <> founder_auth_user_id THEN
      RAISE EXCEPTION 'Founder Authority auth user cannot be changed';
    END IF;

    IF NEW.access_level <> 'owner' THEN
      RAISE EXCEPTION 'Founder Authority access level cannot be downgraded';
    END IF;

    IF NEW.is_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Founder Authority platform row cannot be disabled';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_prevent_founder_authority_platform_admin_change'
  ) THEN
    CREATE TRIGGER trg_prevent_founder_authority_platform_admin_change
      BEFORE INSERT OR UPDATE OR DELETE ON platform_admins
      FOR EACH ROW
      EXECUTE FUNCTION prevent_founder_authority_platform_admin_change();
  END IF;
END;
$$;
