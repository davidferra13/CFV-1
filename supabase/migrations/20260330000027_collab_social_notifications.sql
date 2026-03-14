-- Extend social notification enums for collaboration handoffs.
-- Keeps collaboration alerts inside the chef community notification center.

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
      'collab_handoff_cancelled'
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
      'handoff'
    )
  );
