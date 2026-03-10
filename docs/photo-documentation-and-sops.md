# Universal Photo Documentation & Staff Training SOPs

## Overview

Two universal features added to ChefFlow:

1. **Entity Photos** - Attach photos to any entity (events, recipes, equipment, etc.)
2. **SOPs (Standard Operating Procedures)** - Create, assign, and track staff training completion

## Feature U4: Universal Photo Documentation

### What it does

A polymorphic photo attachment system. Drop `<PhotoAttachment entityType="event" entityId={eventId} />` onto any page to add photo capabilities. Photos support captions, tags (plating, setup, damage, inspection, design, before, after), and reordering.

### Database

- Table: `entity_photos` (migration `20260331000020`)
- Polymorphic via `entity_type` + `entity_id`
- Supported entity types: event, recipe, equipment, bakery_order, compliance, station, vendor, menu, staff, general
- RLS scoped to `tenant_id`

### Files

| File                                                   | Purpose                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `supabase/migrations/20260331000020_entity_photos.sql` | Migration                                                  |
| `lib/photos/photo-actions.ts`                          | Server actions (CRUD, query by entity/tag/recent, reorder) |
| `components/photos/photo-attachment.tsx`               | Reusable attach-to-anything component                      |
| `components/photos/photo-lightbox.tsx`                 | Full-screen image viewer with navigation                   |
| `components/photos/recent-photos.tsx`                  | Activity feed of recent photos                             |
| `app/(chef)/photos/page.tsx`                           | Gallery page showing all recent photos                     |

### Usage

```tsx
import { PhotoAttachment } from '@/components/photos/photo-attachment'
import { getPhotosForEntity } from '@/lib/photos/photo-actions'

// On any entity detail page:
const { photos } = await getPhotosForEntity('event', eventId)

<PhotoAttachment
  entityType="event"
  entityId={eventId}
  initialPhotos={photos}
  editable={true}
  maxPhotos={20}
/>
```

### Current limitations

- URL-based only (no file upload storage yet). Users paste image URLs.
- Camera capture button planned but requires file upload backend.

## Feature U5: Staff Training / SOPs

### What it does

Create standard operating procedures with markdown content. Assign them to staff roles. Track who has completed which SOP and which version. Compliance matrix shows the full picture at a glance.

### Database

- Table: `sops` (migration `20260331000021`)
- Table: `sop_completions` (same migration)
- Categories: food_safety, opening_closing, recipes, equipment, customer_service, cleaning, emergency, general
- Roles: cook, server, manager, driver, all
- Version tracking: when content changes, version increments. Completions for old versions show as "outdated."
- Unique constraint on (sop_id, staff_member_id, version_completed) prevents duplicate completion records

### Files

| File                                                          | Purpose                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `supabase/migrations/20260331000021_sops_and_completions.sql` | Migration                                                                      |
| `lib/training/sop-actions.ts`                                 | Server actions (CRUD, compliance matrix, overdue, onboarding checklist, stats) |
| `components/training/sop-library.tsx`                         | SOP list with search, filter, create form                                      |
| `components/training/sop-viewer.tsx`                          | Full SOP display with markdown rendering, "Mark as Read"                       |
| `components/training/training-dashboard.tsx`                  | Compliance matrix, stats cards                                                 |
| `components/training/onboarding-checklist.tsx`                | Role-based checklist with progress bar                                         |
| `app/(chef)/training/page.tsx`                                | Main page with Library / Dashboard tabs                                        |
| `app/(chef)/training/[id]/page.tsx`                           | Individual SOP viewer page                                                     |

### Compliance matrix

The training dashboard shows a matrix: staff members as rows, SOPs as columns. Each cell shows:

- **OK** (green) - completed current version
- **!!** (yellow) - completed an older version (needs re-read)
- **--** (red) - not completed

### Key server actions

- `getSOPComplianceMatrix()` - full staff x SOP matrix
- `getOverdueTraining()` - staff with pending or outdated SOPs
- `generateOnboardingChecklist(role)` - all SOPs required for a specific role
- `getSOPStats()` - total SOPs, completion rate, most overdue SOP

### All deterministic

Zero AI dependency. Everything is formula-based (database queries, counting, filtering). Follows the Formula > AI rule.
