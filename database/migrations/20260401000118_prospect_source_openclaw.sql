-- Expand prospects.source CHECK constraint to allow openclaw_import and csv_import sources
-- Required for the lead-engine cartridge connector (imports from openclaw_leads into prospects)

ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_source_check;
ALTER TABLE prospects ADD CONSTRAINT prospects_source_check
  CHECK (source IN ('ai_scrub', 'web_enriched', 'manual', 'openclaw_import', 'csv_import'));
