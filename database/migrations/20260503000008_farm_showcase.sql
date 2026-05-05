-- Farm Showcase: animals, plants/crops the farmer wants to highlight
-- Displayed on public event page and venue details panel.

ALTER TABLE event_venue_details
  ADD COLUMN IF NOT EXISTS farm_animals JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS farm_crops JSONB DEFAULT '[]';

-- farm_animals: [{ "name": "Highland Cows", "description": "Our grass-fed herd of 12", "photo_url": "..." }]
-- farm_crops: [{ "name": "Heirloom Tomatoes", "variety": "Cherokee Purple", "description": "In season July-Sept", "photo_url": "..." }]

COMMENT ON COLUMN event_venue_details.farm_animals IS 'JSON array of animals the farmer showcases';
COMMENT ON COLUMN event_venue_details.farm_crops IS 'JSON array of crops/plants the farmer showcases';
