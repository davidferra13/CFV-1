-- Owner observability performance indexes
-- Supports cross-tenant admin command-center queries.

DO $$
BEGIN
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_owner_obs_chat_messages_conversation_created ON public.chat_messages (conversation_id, created_at DESC)';
  END IF;

  IF to_regclass('public.conversations') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_owner_obs_conversations_tenant_last_message ON public.conversations (tenant_id, last_message_at DESC)';
  END IF;

  IF to_regclass('public.chef_social_posts') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_owner_obs_social_posts_chef_created ON public.chef_social_posts (chef_id, created_at DESC)';
  END IF;

  IF to_regclass('public.hub_messages') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_owner_obs_hub_messages_group_created ON public.hub_messages (group_id, created_at DESC)';
  END IF;

  IF to_regclass('public.hub_groups') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_owner_obs_hub_groups_tenant_updated ON public.hub_groups (tenant_id, updated_at DESC)';
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_owner_obs_notifications_recipient_created ON public.notifications (recipient_id, created_at DESC)';
  END IF;
END
$$;
