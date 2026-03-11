-- Add contact columns to inquiries so inquiries can exist without auto-creating a client record.
-- The chef can later choose to "convert" a lead into a full client.

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS contact_phone TEXT;
-- Backfill from linked clients for existing records
UPDATE inquiries i
SET contact_name  = c.full_name,
    contact_email = c.email,
    contact_phone = c.phone
FROM clients c
WHERE i.client_id = c.id
  AND i.contact_name IS NULL;
