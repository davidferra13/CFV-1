-- Expand guest intake enum options to support V1 cannabis RSVP language.

ALTER TYPE guest_familiarity_level ADD VALUE IF NOT EXISTS 'first_time';
ALTER TYPE guest_familiarity_level ADD VALUE IF NOT EXISTS 'occasional';
ALTER TYPE guest_familiarity_level ADD VALUE IF NOT EXISTS 'regular';

ALTER TYPE guest_consumption_style ADD VALUE IF NOT EXISTS 'smoking';
ALTER TYPE guest_consumption_style ADD VALUE IF NOT EXISTS 'tincture';
ALTER TYPE guest_consumption_style ADD VALUE IF NOT EXISTS 'other';

ALTER TYPE guest_edible_familiarity ADD VALUE IF NOT EXISTS 'yes';
ALTER TYPE guest_edible_familiarity ADD VALUE IF NOT EXISTS 'no';
ALTER TYPE guest_edible_familiarity ADD VALUE IF NOT EXISTS 'unsure';
