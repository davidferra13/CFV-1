-- Phone Numbers: normalized multi-entity phone storage with verification
-- Additive migration. No existing tables modified.

CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('chef', 'client', 'staff', 'vendor', 'venue')),
  entity_id UUID NOT NULL,
  phone_e164 TEXT NOT NULL,
  phone_display TEXT NOT NULL,
  label TEXT DEFAULT 'mobile',
  type TEXT DEFAULT 'primary' CHECK (type IN ('primary', 'secondary', 'emergency')),
  can_text BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_code_hash TEXT,
  verification_expires_at TIMESTAMPTZ,
  verification_attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(entity_type, entity_id, phone_e164)
);

CREATE INDEX idx_phone_numbers_entity ON phone_numbers(entity_type, entity_id);
CREATE INDEX idx_phone_numbers_e164 ON phone_numbers(phone_e164);
