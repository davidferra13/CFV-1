# ECS Gap: Vendor Map View

> Source: ECS Scorecard 2026-04-27 | User Type: Vendor/Supplier (84/100) | Dimension: Polish (17/20)

## Problem
National vendor directory has lat/lng geographic data but no map view. Only list/table display.

## Spec
1. Create `components/vendors/vendor-map.tsx` using a lightweight map library (Leaflet with OpenStreetMap tiles, no API key needed)
2. Plot national vendors on map with markers
3. Click marker to see vendor name, type, address, "Add to my vendors" button
4. Filter by vendor type (butcher, fishmonger, etc.)
5. Center map on chef's location (from profile) or US center as default
6. Add map/list toggle to `app/(chef)/culinary/vendors/` page

## Dependencies
- `leaflet` + `react-leaflet` packages (or use native browser Geolocation + simple canvas)
- No paid map service; OSM tiles are free

## Acceptance
- Vendors plotted on map with type-colored markers
- Clickable markers with vendor info
- Filter by type
- Toggle between map and list view
