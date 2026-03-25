-- Enable realtime updates for chef activity stream.

ALTER PUBLICATION supabase_realtime ADD TABLE chef_activity_log;
