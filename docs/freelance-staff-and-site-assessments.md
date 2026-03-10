# Freelance Staff Module + Site Visit Assessment Form

Two features built for the Caterer archetype.

## Feature 1: Freelance Staff Module

### What it does

Allows chefs to manage freelance and temporary staff separately from regular team members. Freelancers have additional fields for day rates, agency affiliations, payment terms, and tax document tracking.

### Database changes

- Added columns to `staff_members`: `staff_type` (regular/freelance), `day_rate_cents`, `agency_name`, `payment_terms`, `tax_id_on_file`, `contract_notes`
- Migration: `20260331000005_freelance_staff_and_site_assessments.sql`

### Files

- `lib/staff/freelance-actions.ts` - Server actions: createFreelancer, getFreelancers, getFreelancerEventHistory, calculateFreelancerPayout, getUpcomingFreelancerAssignments
- `components/staff/freelancer-roster.tsx` - Client component with roster list, inline event history expansion, and add-freelancer form
- `app/(chef)/staff/freelancers/page.tsx` - Dedicated freelancer management page

### Integration

- "Freelancers" link added to main staff page (`app/(chef)/staff/page.tsx`)
- Freelancers are stored in the same `staff_members` table with `staff_type='freelance'`, so they work with existing event assignment flows

### Payout calculation logic

- If `day_rate_cents` is set (and no per-assignment rate override), payout = day rate
- Otherwise, payout = hourly rate x actual hours (or scheduled hours as fallback)
- Rate overrides on individual assignments take priority over both

## Feature 2: Site Visit Assessment Form

### What it does

Structured venue evaluation form for event locations. Captures kitchen equipment, access logistics, capacity, venue contact info, and general notes. Supports pre-filling from previous assessments at the same venue.

### Database changes

- New table: `event_site_assessments` with RLS on `chef_id`
- Covers kitchen (size, appliances, outlets, water), access (parking, loading dock, elevator, access times), space (capacity, outdoor, weather, storage), venue contact, and general notes
- Migration: same file as Feature 1

### Files

- `lib/events/site-assessment-actions.ts` - Server actions: createSiteAssessment, updateSiteAssessment, getSiteAssessment, getSiteAssessmentsByVenue
- `components/events/site-assessment-form.tsx` - Multi-section form with venue name matching for pre-fill
- `app/(chef)/events/[id]/site-assessment/page.tsx` - Assessment page per event

### Integration

- "Site Assessment" card added to event detail ops tab (`event-detail-ops-tab.tsx`)
- Available on all events except cancelled
- Default venue name populated from event location address

### Pre-fill feature

When the chef types a venue name and blurs the field, the system searches for previous assessments at that venue. If found, the chef can one-click copy the data from a previous visit, saving time on repeat venues.
