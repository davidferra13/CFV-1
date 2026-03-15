# Nav Wiring for Batch-Built Features

**Date:** 2026-03-15
**Branch:** feature/openclaw-adoption

## What Changed

Added navigation entries in `components/navigation/nav-config.tsx` for 87 batch-built features that were missing from the sidebar navigation.

## New Nav Entries Added

### New Nav Group: Community (13.x features)

- `/community` - Community Hub with benchmarks and peer messages
- `/community/directory` - Chef Directory with "My Listing" editor
- `/community/mentorship` - Mentorship matching with find/dashboard views
- `/community/subcontracting` - Subcontracting agreements with roster

### Events Group Additions

- `/feedback` - Client Feedback with dashboard and request sending (2.14)

### Sales Group Additions

- `/proposals/builder` - Drag-and-drop Proposal Builder (1.13)

### Culinary Group Additions

- `/recipes/photos` - Recipe Step Photos (1.11)

### Operations Group Additions

- `/tasks/va` - VA Task Delegation (7.4)
- `/staff/payroll` - Payroll Summary (7.5)

### Marketing Group Additions

- `/social/templates` - Social Media Templates (5.4)
- `/social/calendar` - Content Calendar (5.4)

### Finance Group Additions

- `/finance/reporting/yoy-comparison` - Year-over-Year Comparison (3.11)

### Protection Group Additions

- `/safety/claims` - Insurance Claims with new claim and documents views (3.24)

### Tools Group Additions

- `/import` - Data Import hub with CSV, MasterCook MXP, and import history (11.4)

## What's NOT Wired Yet

Dashboard widgets for these features exist as standalone components but cannot be integrated into the card-based dashboard sections until:

1. The 53 pending migrations are applied (tables don't exist yet)
2. Types are regenerated from the new schema
3. Server actions can query the new tables without crashing

## Next Steps

1. Apply migrations (requires explicit approval + backup)
2. Regenerate types
3. Wire dashboard widgets into the card sections
4. Build verification
