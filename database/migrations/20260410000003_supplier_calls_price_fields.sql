-- Supplier Calls - Price & Quantity Fields
-- Adds columns to capture price and quantity when vendor confirms availability.
-- Also adds speech_transcript for full call logging.

ALTER TABLE supplier_calls
  ADD COLUMN IF NOT EXISTS price_quoted       TEXT,           -- e.g. "$4.50 per pound", "12 dollars each"
  ADD COLUMN IF NOT EXISTS quantity_available TEXT,           -- e.g. "3 pounds", "about 10 pieces"
  ADD COLUMN IF NOT EXISTS speech_transcript  TEXT;           -- full SpeechResult from Twilio for step 2
