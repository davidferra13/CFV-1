-- Receipt Library — Schema Extensions
-- Enables the chef-wide receipt library: upload any time, tie to any event or client (or neither).
-- All changes are ADDITIVE — no drops, no type changes, no data loss.
--
-- Changes:
--   1. event_id made nullable so receipts can exist without an event (supply runs, annual purchases, etc.)
--   2. client_id column added (optional direct client link, independent of event)
--   3. storage_path column added so signed URLs can be regenerated (the old 24h URLs expire)
--   4. notes column added for context on standalone receipts
--   5. Indexes added for library query performance

-- 1. Make event_id optional
ALTER TABLE receipt_photos ALTER COLUMN event_id DROP NOT NULL;

-- 2. Optional client link
ALTER TABLE receipt_photos
  ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX idx_receipt_photos_client_id
  ON receipt_photos(client_id);

-- 3. Storage path for signed URL regeneration
--    Format: "{tenant_id}/{event_id_or_general}/{uuid}.{ext}"
--    Null for legacy records — those fall back to the stored photo_url
ALTER TABLE receipt_photos
  ADD COLUMN storage_path TEXT;

-- 4. Optional context note for standalone receipts
ALTER TABLE receipt_photos
  ADD COLUMN notes TEXT;

-- 5. Composite index for the receipt library page (newest first, per tenant)
CREATE INDEX idx_receipt_photos_tenant_created
  ON receipt_photos(tenant_id, created_at DESC);

COMMENT ON COLUMN receipt_photos.event_id    IS 'Optional — null for standalone receipts not tied to a specific event.';
COMMENT ON COLUMN receipt_photos.client_id   IS 'Optional — direct client link without requiring an event.';
COMMENT ON COLUMN receipt_photos.storage_path IS 'Raw Supabase Storage path for URL regeneration. Null on legacy records.';
COMMENT ON COLUMN receipt_photos.notes       IS 'Optional context note, e.g. "Annual equipment purchase" for standalone receipts.';
