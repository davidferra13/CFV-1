-- Kitchen Rental Tracking
-- Chefs who rent commercial kitchen space for large prep jobs can track
-- facility, date, hours, cost, and optionally link to an event.

CREATE TABLE kitchen_rentals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id              UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  facility_name        TEXT NOT NULL,
  address              TEXT,
  rental_date          DATE NOT NULL,
  start_time           TIME,
  end_time             TIME,
  hours_booked         NUMERIC(5,2),
  cost_cents           INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  purpose              TEXT,

  -- Optional event linkage (rental was for specific event prep)
  event_id             UUID REFERENCES events(id) ON DELETE SET NULL,
  booking_confirmation TEXT,
  notes                TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kitchen_rentals_chef  ON kitchen_rentals(chef_id, rental_date DESC);
CREATE INDEX idx_kitchen_rentals_event ON kitchen_rentals(event_id);

COMMENT ON TABLE kitchen_rentals IS 'Commercial kitchen rental bookings. Tracks cost and links to events for P&L purposes.';

ALTER TABLE kitchen_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY kr_chef_select ON kitchen_rentals FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY kr_chef_insert ON kitchen_rentals FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY kr_chef_update ON kitchen_rentals FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY kr_chef_delete ON kitchen_rentals FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
