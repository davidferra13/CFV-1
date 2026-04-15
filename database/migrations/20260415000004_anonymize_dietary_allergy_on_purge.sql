-- Extend anonymize_financial_records to clear dietary/allergy PII (Q86)
-- Previous version cleared name/email/phone/address but left dietary_restrictions
-- and allergies arrays intact, which are health PII requiring GDPR erasure.

CREATE OR REPLACE FUNCTION anonymize_financial_records(p_chef_id UUID)
RETURNS void AS $$
BEGIN
  -- Temporarily disable ledger immutability triggers for anonymization
  ALTER TABLE ledger_entries DISABLE TRIGGER ALL;

  -- Anonymize ledger entries — keep amounts, dates, entry_type, sequence
  UPDATE ledger_entries
  SET description = 'REDACTED - Account Deleted',
      internal_notes = NULL
  WHERE tenant_id = p_chef_id;

  -- Re-enable ledger triggers
  ALTER TABLE ledger_entries ENABLE TRIGGER ALL;

  -- Anonymize events — keep financial data, dates, guest counts
  UPDATE events
  SET location_address = 'REDACTED',
      location_city = 'REDACTED',
      location_state = 'XX',
      location_zip = '00000',
      location_notes = NULL,
      access_instructions = NULL,
      special_requests = NULL,
      kitchen_notes = NULL,
      site_notes = NULL,
      cancellation_reason = CASE WHEN cancellation_reason IS NOT NULL
        THEN 'REDACTED' ELSE NULL END
  WHERE tenant_id = p_chef_id;

  -- Anonymize clients — keep IDs for FK integrity, strip ALL PII including health data
  -- dietary_restrictions and allergies are health PII subject to GDPR right-to-erasure
  UPDATE clients
  SET full_name = 'Deleted Client',
      email = 'deleted-' || id::text || '@redacted.local',
      phone = NULL,
      partner_name = NULL,
      children = NULL,
      address = NULL,
      parking_instructions = NULL,
      access_instructions = NULL,
      kitchen_size = NULL,
      kitchen_constraints = NULL,
      house_rules = NULL,
      vibe_notes = NULL,
      payment_behavior = NULL,
      tipping_pattern = NULL,
      what_they_care_about = NULL,
      dietary_restrictions = '{}',
      allergies = '{}'
  WHERE chef_id = p_chef_id;

EXCEPTION WHEN OTHERS THEN
  -- Always re-enable triggers even on failure
  ALTER TABLE ledger_entries ENABLE TRIGGER ALL;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION anonymize_financial_records IS
  'Strips PII from financial records while preserving amounts/dates for 7-year retention. '
  'Includes dietary_restrictions and allergies per GDPR right-to-erasure. Called during account purge.';
