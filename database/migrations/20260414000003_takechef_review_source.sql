-- Add take_a_chef as a valid feedback source for chef_feedback
-- Enables chefs to log TakeAChef reviews in their review system

ALTER TABLE chef_feedback
  DROP CONSTRAINT IF EXISTS chef_feedback_source_check;

ALTER TABLE chef_feedback
  ADD CONSTRAINT chef_feedback_source_check
  CHECK (source = ANY (ARRAY[
    'verbal', 'google', 'yelp', 'yelp_guest', 'email', 'social_media',
    'text_message', 'other', 'airbnb', 'facebook', 'tripadvisor',
    'thumbtack', 'bark', 'gigsalad', 'taskrabbit', 'houzz', 'angi',
    'nextdoor', 'instagram', 'take_a_chef'
  ]));
