-- Supplier Calls - Recording URL
-- Stores the Twilio recording URL so chefs can replay calls from the log.

ALTER TABLE supplier_calls
  ADD COLUMN IF NOT EXISTS recording_url TEXT;
