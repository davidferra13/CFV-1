-- ============================================================================
-- Communication Triage Grants
-- Makes new communication relations visible to authenticated API role.
-- RLS policies continue to enforce tenant isolation.
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE conversation_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE communication_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE suggested_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE follow_up_timers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE communication_classification_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE communication_action_log TO authenticated;

GRANT SELECT ON TABLE communication_inbox_items TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE conversation_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE communication_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE suggested_links TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE follow_up_timers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE communication_classification_rules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE communication_action_log TO service_role;
GRANT SELECT ON TABLE communication_inbox_items TO service_role;
