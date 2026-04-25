-- Open Booking Follow-Through
-- New parent table for tracking open booking submissions across multiple chef inquiries.
-- Provides: public status token, escalation timestamps, parsed budget, guest count range.
-- Junction table links bookings to the per-chef inquiries they spawn.

CREATE TABLE IF NOT EXISTS open_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  consumer_name TEXT NOT NULL,
  consumer_email TEXT NOT NULL,
  consumer_phone TEXT,
  event_date DATE,
  serve_time TEXT,
  guest_count INTEGER NOT NULL,
  guest_count_range_label TEXT,
  guest_count_range_min INTEGER,
  guest_count_range_max INTEGER,
  occasion TEXT NOT NULL,
  service_type TEXT,
  budget_range TEXT,
  budget_cents_per_person INTEGER,
  location TEXT NOT NULL,
  resolved_location TEXT,
  dietary_restrictions TEXT[],
  additional_notes TEXT,
  referral_source TEXT,
  referral_partner_id UUID REFERENCES referral_partners(id) ON DELETE SET NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  matched_chef_count INTEGER NOT NULL DEFAULT 0,
  first_chef_response_at TIMESTAMPTZ,
  follow_up_48h_sent_at TIMESTAMPTZ,
  final_7d_sent_at TIMESTAMPTZ,
  first_circle_token TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_open_bookings_token ON open_bookings(booking_token);
CREATE INDEX IF NOT EXISTS idx_open_bookings_email ON open_bookings(lower(consumer_email));
CREATE INDEX IF NOT EXISTS idx_open_bookings_referral_partner
  ON open_bookings(referral_partner_id)
  WHERE referral_partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_open_bookings_escalation ON open_bookings(status, created_at)
  WHERE status IN ('sent', 'chef_reviewing', 'no_response');

CREATE TABLE IF NOT EXISTS open_booking_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES open_bookings(id) ON DELETE CASCADE,
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL,
  chef_name TEXT,
  chef_responded_at TIMESTAMPTZ,
  circle_group_token TEXT,
  proposal_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id, inquiry_id)
);

CREATE INDEX IF NOT EXISTS idx_obi_booking ON open_booking_inquiries(booking_id);
CREATE INDEX IF NOT EXISTS idx_obi_inquiry ON open_booking_inquiries(inquiry_id);
