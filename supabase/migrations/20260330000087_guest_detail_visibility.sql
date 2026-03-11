-- Guest detail visibility
-- Lets chefs hide individual guest details from the host while still allowing summary counts.

ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS show_guest_details_to_host BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS dietary_notes TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;
UPDATE public.event_guests
SET dietary_notes = NULLIF(
  trim(
    BOTH '; ' FROM concat_ws(
      '; ',
      CASE
        WHEN COALESCE(array_length(dietary_restrictions, 1), 0) > 0
          THEN 'Dietary: ' || array_to_string(dietary_restrictions, ', ')
        ELSE NULL
      END,
      CASE
        WHEN COALESCE(array_length(allergies, 1), 0) > 0
          THEN 'Allergies: ' || array_to_string(allergies, ', ')
        ELSE NULL
      END
    )
  ),
  ''
)
WHERE dietary_notes IS NULL;
