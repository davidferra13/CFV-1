-- Event Dinner Circle layer.
-- Stores event-scoped public page, supplier input, layout/flow, farm identity,
-- theme, money rules, and vendor interest without replacing existing event,
-- ticket, hub, menu, photo, or collaboration tables.

ALTER TABLE public.event_share_settings
  ADD COLUMN IF NOT EXISTS circle_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.event_share_settings.circle_config IS
  'Event-scoped Dinner Circle configuration: money rules, supplier inputs, layout map, public story, farm identity, social links, theme, and vendor interest.';

CREATE INDEX IF NOT EXISTS idx_event_share_settings_circle_config
  ON public.event_share_settings USING gin(circle_config);
