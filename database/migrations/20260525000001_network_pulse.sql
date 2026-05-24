-- Network Pulse: add rolling average for anomaly detection
ALTER TABLE chef_activity_snapshots
  ADD COLUMN avg_weekly_events NUMERIC(5,2) NOT NULL DEFAULT 0;
