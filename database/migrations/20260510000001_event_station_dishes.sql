-- Event Station Dishes: assigns dishes to kitchen stations for a specific event.
-- This bridges ops/stations (where the chef configures their kitchen layout)
-- with events (where specific dishes need to be produced at specific stations).
-- Additive only. No existing tables modified.

CREATE TABLE IF NOT EXISTS public.event_station_dishes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  station_id      UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  dish_id         UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  chef_id         UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
  estimated_minutes INT,           -- estimated time this dish needs at the station
  notes           TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(event_id, dish_id)        -- each dish assigned to exactly one station per event
);

CREATE INDEX IF NOT EXISTS idx_event_station_dishes_event
  ON public.event_station_dishes(event_id);

CREATE INDEX IF NOT EXISTS idx_event_station_dishes_station
  ON public.event_station_dishes(station_id);

CREATE INDEX IF NOT EXISTS idx_event_station_dishes_chef
  ON public.event_station_dishes(chef_id);

COMMENT ON TABLE public.event_station_dishes IS
  'Per-event assignment of menu dishes to kitchen stations. One dish per station per event.';

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.update_event_station_dishes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_station_dishes_updated_at
  BEFORE UPDATE ON public.event_station_dishes
  FOR EACH ROW EXECUTE FUNCTION public.update_event_station_dishes_updated_at();

-- RLS
ALTER TABLE public.event_station_dishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_station_dishes_chef_policy ON public.event_station_dishes;
CREATE POLICY event_station_dishes_chef_policy
  ON public.event_station_dishes
  FOR ALL
  USING (chef_id = (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ))
  WITH CHECK (chef_id = (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
  ));
