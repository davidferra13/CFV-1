-- Document Management Enhancements
-- Adds: is_auto flag on chef_folders, inquiry_id on chef_documents,
-- needs_review status support for receipt_photos, and receipt_photo_id on expenses.

-- 1. chef_folders: distinguish auto-generated folders from manual ones
ALTER TABLE chef_folders
  ADD COLUMN IF NOT EXISTS is_auto boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN chef_folders.is_auto IS 'True for auto-generated folders (e.g. Receipts/2026/03 - March)';

-- 2. chef_documents: link to inquiries for universal entity linking
ALTER TABLE chef_documents
  ADD COLUMN IF NOT EXISTS inquiry_id uuid REFERENCES inquiries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chef_documents_inquiry_id
  ON chef_documents(inquiry_id) WHERE inquiry_id IS NOT NULL;

COMMENT ON COLUMN chef_documents.inquiry_id IS 'Optional link to an inquiry for cross-entity document retrieval';

-- 3. expenses: link back to the receipt_photo that created the expense (stronger than notes-based dedup)
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_photo_id uuid REFERENCES receipt_photos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_receipt_photo_id
  ON expenses(receipt_photo_id) WHERE receipt_photo_id IS NOT NULL;

COMMENT ON COLUMN expenses.receipt_photo_id IS 'Links expense to the receipt_photo that generated it via approval';

-- 4. receipt_photos: add needs_review as a valid status
-- upload_status is a text column with no CHECK constraint, so 'needs_review' works as-is.
-- Add a comment documenting the valid statuses for clarity.
COMMENT ON COLUMN receipt_photos.upload_status IS 'Pipeline status: pending | processing | extracted | needs_review | approved';
