-- Add storage requirement to ingredient master record
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS storage_requirement text;

-- Constrain to valid values
ALTER TABLE ingredients
  ADD CONSTRAINT ingredients_storage_requirement_check
  CHECK (storage_requirement IS NULL OR storage_requirement = ANY(
    ARRAY['ambient', 'refrigerated', 'frozen']
  ));

COMMENT ON COLUMN ingredients.storage_requirement
  IS 'Declared storage zone requirement. NULL = unspecified.';
