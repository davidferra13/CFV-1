-- Fix: Add ON DELETE SET NULL to all auth.users FK references that are missing it.
-- These audit/ownership columns should survive user deletion (historical records).
-- Without this, deleting an auth user would be blocked by NO ACTION default.

-- Helper: Drop + re-add FK constraint with ON DELETE SET NULL
-- PostgreSQL cannot ALTER a FK's ON DELETE rule in place; must drop and re-create.

-- ==============================================
-- LAYER 1: Foundation
-- ==============================================

-- client_invitations.created_by
ALTER TABLE client_invitations DROP CONSTRAINT IF EXISTS client_invitations_created_by_fkey;
ALTER TABLE client_invitations
  ADD CONSTRAINT client_invitations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- audit_log.changed_by
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_changed_by_fkey;
ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- LAYER 2: Inquiry + Messaging
-- ==============================================

-- inquiry_state_transitions.transitioned_by
ALTER TABLE inquiry_state_transitions DROP CONSTRAINT IF EXISTS inquiry_state_transitions_transitioned_by_fkey;
ALTER TABLE inquiry_state_transitions
  ADD CONSTRAINT inquiry_state_transitions_transitioned_by_fkey
  FOREIGN KEY (transitioned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- messages.from_user_id
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_from_user_id_fkey;
ALTER TABLE messages
  ADD CONSTRAINT messages_from_user_id_fkey
  FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- messages.to_user_id
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_to_user_id_fkey;
ALTER TABLE messages
  ADD CONSTRAINT messages_to_user_id_fkey
  FOREIGN KEY (to_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- messages.approved_by
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_approved_by_fkey;
ALTER TABLE messages
  ADD CONSTRAINT messages_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- LAYER 3: Events, Quotes, Financials
-- ==============================================

-- events.created_by
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE events
  ADD CONSTRAINT events_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- events.updated_by
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_updated_by_fkey;
ALTER TABLE events
  ADD CONSTRAINT events_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- event_state_transitions.transitioned_by
ALTER TABLE event_state_transitions DROP CONSTRAINT IF EXISTS event_state_transitions_transitioned_by_fkey;
ALTER TABLE event_state_transitions
  ADD CONSTRAINT event_state_transitions_transitioned_by_fkey
  FOREIGN KEY (transitioned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- quotes.created_by
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_created_by_fkey;
ALTER TABLE quotes
  ADD CONSTRAINT quotes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- quotes.updated_by
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_updated_by_fkey;
ALTER TABLE quotes
  ADD CONSTRAINT quotes_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- quote_state_transitions.transitioned_by
ALTER TABLE quote_state_transitions DROP CONSTRAINT IF EXISTS quote_state_transitions_transitioned_by_fkey;
ALTER TABLE quote_state_transitions
  ADD CONSTRAINT quote_state_transitions_transitioned_by_fkey
  FOREIGN KEY (transitioned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ledger_entries.created_by
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_created_by_fkey;
ALTER TABLE ledger_entries
  ADD CONSTRAINT ledger_entries_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- expenses.created_by
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_created_by_fkey;
ALTER TABLE expenses
  ADD CONSTRAINT expenses_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- expenses.updated_by
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_updated_by_fkey;
ALTER TABLE expenses
  ADD CONSTRAINT expenses_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- after_action_reviews.created_by
ALTER TABLE after_action_reviews DROP CONSTRAINT IF EXISTS after_action_reviews_created_by_fkey;
ALTER TABLE after_action_reviews
  ADD CONSTRAINT after_action_reviews_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- after_action_reviews.updated_by
ALTER TABLE after_action_reviews DROP CONSTRAINT IF EXISTS after_action_reviews_updated_by_fkey;
ALTER TABLE after_action_reviews
  ADD CONSTRAINT after_action_reviews_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- LAYER 5: Loyalty
-- ==============================================

-- loyalty_transactions.created_by
ALTER TABLE loyalty_transactions DROP CONSTRAINT IF EXISTS loyalty_transactions_created_by_fkey;
ALTER TABLE loyalty_transactions
  ADD CONSTRAINT loyalty_transactions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- loyalty_rewards.created_by
ALTER TABLE loyalty_rewards DROP CONSTRAINT IF EXISTS loyalty_rewards_created_by_fkey;
ALTER TABLE loyalty_rewards
  ADD CONSTRAINT loyalty_rewards_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- loyalty_rewards.updated_by
ALTER TABLE loyalty_rewards DROP CONSTRAINT IF EXISTS loyalty_rewards_updated_by_fkey;
ALTER TABLE loyalty_rewards
  ADD CONSTRAINT loyalty_rewards_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- LAYER 5: Seasonal Palettes
-- ==============================================

-- seasonal_palettes.created_by
ALTER TABLE seasonal_palettes DROP CONSTRAINT IF EXISTS seasonal_palettes_created_by_fkey;
ALTER TABLE seasonal_palettes
  ADD CONSTRAINT seasonal_palettes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- seasonal_palettes.updated_by
ALTER TABLE seasonal_palettes DROP CONSTRAINT IF EXISTS seasonal_palettes_updated_by_fkey;
ALTER TABLE seasonal_palettes
  ADD CONSTRAINT seasonal_palettes_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- LAYER 6: Real-Time Chat
-- ==============================================

-- chat_messages.sender_id
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- Chef Feedback
-- ==============================================

-- chef_feedback.logged_by
ALTER TABLE chef_feedback DROP CONSTRAINT IF EXISTS chef_feedback_logged_by_fkey;
ALTER TABLE chef_feedback
  ADD CONSTRAINT chef_feedback_logged_by_fkey
  FOREIGN KEY (logged_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- Ops Copilot
-- ==============================================

-- copilot_actions.actor_auth_user_id
ALTER TABLE copilot_actions DROP CONSTRAINT IF EXISTS copilot_actions_actor_auth_user_id_fkey;
ALTER TABLE copilot_actions
  ADD CONSTRAINT copilot_actions_actor_auth_user_id_fkey
  FOREIGN KEY (actor_auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- Vouchers & Gift Cards
-- ==============================================

-- client_incentives.created_by_user_id
ALTER TABLE client_incentives DROP CONSTRAINT IF EXISTS client_incentives_created_by_user_id_fkey;
ALTER TABLE client_incentives
  ADD CONSTRAINT client_incentives_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- incentive_deliveries.sent_by_user_id
ALTER TABLE incentive_deliveries DROP CONSTRAINT IF EXISTS incentive_deliveries_sent_by_user_id_fkey;
ALTER TABLE incentive_deliveries
  ADD CONSTRAINT incentive_deliveries_sent_by_user_id_fkey
  FOREIGN KEY (sent_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- client_incentives.purchased_by_user_id
ALTER TABLE client_incentives DROP CONSTRAINT IF EXISTS client_incentives_purchased_by_user_id_fkey;
ALTER TABLE client_incentives
  ADD CONSTRAINT client_incentives_purchased_by_user_id_fkey
  FOREIGN KEY (purchased_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- gift_card_purchase_intents.buyer_user_id
ALTER TABLE gift_card_purchase_intents DROP CONSTRAINT IF EXISTS gift_card_purchase_intents_buyer_user_id_fkey;
ALTER TABLE gift_card_purchase_intents
  ADD CONSTRAINT gift_card_purchase_intents_buyer_user_id_fkey
  FOREIGN KEY (buyer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- incentive_redemptions.redeemed_by_user_id
ALTER TABLE incentive_redemptions DROP CONSTRAINT IF EXISTS incentive_redemptions_redeemed_by_user_id_fkey;
ALTER TABLE incentive_redemptions
  ADD CONSTRAINT incentive_redemptions_redeemed_by_user_id_fkey
  FOREIGN KEY (redeemed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- External Reviews
-- ==============================================

-- external_review_sources.created_by
ALTER TABLE external_review_sources DROP CONSTRAINT IF EXISTS external_review_sources_created_by_fkey;
ALTER TABLE external_review_sources
  ADD CONSTRAINT external_review_sources_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- Chef Todos
-- ==============================================

-- chef_todos.created_by
ALTER TABLE chef_todos DROP CONSTRAINT IF EXISTS chef_todos_created_by_fkey;
ALTER TABLE chef_todos
  ADD CONSTRAINT chef_todos_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- Document Versions
-- ==============================================

-- document_versions.created_by
ALTER TABLE document_versions DROP CONSTRAINT IF EXISTS document_versions_created_by_fkey;
ALTER TABLE document_versions
  ADD CONSTRAINT document_versions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ==============================================
-- DLQ
-- ==============================================

-- dlq_entries.resolved_by (table may not exist in all envs)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dlq_entries') THEN
    ALTER TABLE dlq_entries DROP CONSTRAINT IF EXISTS dlq_entries_resolved_by_fkey;
    ALTER TABLE dlq_entries
      ADD CONSTRAINT dlq_entries_resolved_by_fkey
      FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==============================================
-- Cannabis Staff Invites
-- ==============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cannabis_staff_invites') THEN
    ALTER TABLE cannabis_staff_invites DROP CONSTRAINT IF EXISTS cannabis_staff_invites_invited_by_auth_user_id_fkey;
    ALTER TABLE cannabis_staff_invites
      ADD CONSTRAINT cannabis_staff_invites_invited_by_auth_user_id_fkey
      FOREIGN KEY (invited_by_auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==============================================
-- Front of House Menu Generator
-- ==============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'foh_menu_templates') THEN
    ALTER TABLE foh_menu_templates DROP CONSTRAINT IF EXISTS foh_menu_templates_created_by_fkey;
    ALTER TABLE foh_menu_templates
      ADD CONSTRAINT foh_menu_templates_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    ALTER TABLE foh_menu_templates DROP CONSTRAINT IF EXISTS foh_menu_templates_updated_by_fkey;
    ALTER TABLE foh_menu_templates
      ADD CONSTRAINT foh_menu_templates_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'foh_generated_menus') THEN
    ALTER TABLE foh_generated_menus DROP CONSTRAINT IF EXISTS foh_generated_menus_generated_by_fkey;
    ALTER TABLE foh_generated_menus
      ADD CONSTRAINT foh_generated_menus_generated_by_fkey
      FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==============================================
-- Commerce Engine
-- ==============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commerce_order_items' AND column_name = 'voided_by') THEN
    ALTER TABLE commerce_order_items DROP CONSTRAINT IF EXISTS commerce_order_items_voided_by_fkey;
    ALTER TABLE commerce_order_items
      ADD CONSTRAINT commerce_order_items_voided_by_fkey
      FOREIGN KEY (voided_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commerce_order_items' AND column_name = 'created_by') THEN
    ALTER TABLE commerce_order_items DROP CONSTRAINT IF EXISTS commerce_order_items_created_by_fkey;
    ALTER TABLE commerce_order_items
      ADD CONSTRAINT commerce_order_items_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commerce_orders' AND column_name = 'created_by') THEN
    ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_created_by_fkey;
    ALTER TABLE commerce_orders
      ADD CONSTRAINT commerce_orders_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commerce_transactions' AND column_name = 'created_by') THEN
    ALTER TABLE commerce_transactions DROP CONSTRAINT IF EXISTS commerce_transactions_created_by_fkey;
    ALTER TABLE commerce_transactions
      ADD CONSTRAINT commerce_transactions_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==============================================
-- Event Document Snapshots
-- ==============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_document_snapshots') THEN
    ALTER TABLE event_document_snapshots DROP CONSTRAINT IF EXISTS event_document_snapshots_generated_by_fkey;
    ALTER TABLE event_document_snapshots
      ADD CONSTRAINT event_document_snapshots_generated_by_fkey
      FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==============================================
-- Event Series & Sessions
-- ==============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_series') THEN
    ALTER TABLE event_series DROP CONSTRAINT IF EXISTS event_series_created_by_fkey;
    ALTER TABLE event_series
      ADD CONSTRAINT event_series_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    ALTER TABLE event_series DROP CONSTRAINT IF EXISTS event_series_updated_by_fkey;
    ALTER TABLE event_series
      ADD CONSTRAINT event_series_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_service_sessions') THEN
    ALTER TABLE event_service_sessions DROP CONSTRAINT IF EXISTS event_service_sessions_created_by_fkey;
    ALTER TABLE event_service_sessions
      ADD CONSTRAINT event_service_sessions_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

    ALTER TABLE event_service_sessions DROP CONSTRAINT IF EXISTS event_service_sessions_updated_by_fkey;
    ALTER TABLE event_service_sessions
      ADD CONSTRAINT event_service_sessions_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==============================================
-- Monthly Raffle
-- ==============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monthly_raffle_draws') THEN
    ALTER TABLE monthly_raffle_draws DROP CONSTRAINT IF EXISTS monthly_raffle_draws_created_by_fkey;
    ALTER TABLE monthly_raffle_draws
      ADD CONSTRAINT monthly_raffle_draws_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Done: ~52 FK constraints now have ON DELETE SET NULL.
-- Historical audit trail is preserved when users are deleted.
