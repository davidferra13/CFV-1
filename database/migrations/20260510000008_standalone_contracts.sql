-- Standalone Contracts
-- Allows contracts to be created without an event (general agreements, NDAs, etc.)
-- Makes event_id nullable on event_contracts table.

ALTER TABLE event_contracts ALTER COLUMN event_id DROP NOT NULL;

COMMENT ON COLUMN event_contracts.event_id IS 'Optional link to an event. NULL for standalone contracts (general agreements).';
