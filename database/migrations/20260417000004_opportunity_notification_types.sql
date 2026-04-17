-- Add opportunity_interest notification type and opportunity entity type
-- to chef_social_notifications CHECK constraints.
-- Bug: opportunity-actions.ts inserts these values but they were never added
-- to the constraint (last updated in 20260330000027).

ALTER TABLE chef_social_notifications
  DROP CONSTRAINT IF EXISTS chef_social_notifications_notification_type_check;

ALTER TABLE chef_social_notifications
  ADD CONSTRAINT chef_social_notifications_notification_type_check
  CHECK (
    notification_type IN (
      'new_follower',
      'post_reaction',
      'post_comment',
      'comment_reply',
      'comment_reaction',
      'post_share',
      'mention_post',
      'mention_comment',
      'channel_post',
      'story_reaction',
      'story_view',
      'connection_accepted',
      'collab_handoff_received',
      'collab_handoff_accepted',
      'collab_handoff_rejected',
      'collab_handoff_converted',
      'collab_handoff_cancelled',
      'opportunity_interest'
    )
  );

ALTER TABLE chef_social_notifications
  DROP CONSTRAINT IF EXISTS chef_social_notifications_entity_type_check;

ALTER TABLE chef_social_notifications
  ADD CONSTRAINT chef_social_notifications_entity_type_check
  CHECK (
    entity_type IN (
      'post',
      'comment',
      'story',
      'follow',
      'channel',
      'connection',
      'handoff',
      'opportunity'
    )
  );
