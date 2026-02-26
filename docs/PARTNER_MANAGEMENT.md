# Partner Management — Server Actions & UI

## Overview

The partner management system provides full CRUD for referral partners, their locations, and images. It integrates into the inquiry pipeline so every lead can be attributed to a specific partner and location.

---

## Server Actions (`lib/partners/actions.ts`)

### Partner CRUD

| Function                   | Auth | Description                                                                                        |
| -------------------------- | ---- | -------------------------------------------------------------------------------------------------- |
| `createPartner(input)`     | Chef | Zod-validated, creates partner with all fields                                                     |
| `updatePartner(id, input)` | Chef | Partial update, tenant-scoped                                                                      |
| `getPartners(filters?)`    | Chef | List with inline stats (inquiry count, event count, revenue). Optional `type` and `status` filters |
| `getPartnerById(id)`       | Chef | Full partner with locations, images, and per-location stats (inquiry count, event count, revenue)  |
| `deletePartner(id)`        | Chef | Soft-delete (→ inactive) if linked inquiries/events exist; hard-delete otherwise                   |

### Location Management

| Function                           | Auth | Description                                               |
| ---------------------------------- | ---- | --------------------------------------------------------- |
| `createPartnerLocation(input)`     | Chef | Add location to partner                                   |
| `updatePartnerLocation(id, input)` | Chef | Update location fields                                    |
| `getPartnerLocations(partnerId)`   | Chef | List locations for a partner                              |
| `deletePartnerLocation(id)`        | Chef | Soft-delete (→ inactive) if linked; hard-delete otherwise |

### Image Management

| Function                                      | Auth | Description                                                 |
| --------------------------------------------- | ---- | ----------------------------------------------------------- |
| `addPartnerImage(input)`                      | Chef | Link image URL to partner/location with optional season tag |
| `removePartnerImage(id)`                      | Chef | Delete image record                                         |
| `reorderPartnerImages(partnerId, imageIds[])` | Chef | Batch update display_order                                  |

### Public Showcase

| Function                        | Auth          | Description                                                                                                            |
| ------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `getShowcasePartners(chefSlug)` | None (public) | Returns showcase-visible partners with locations and images for a chef's public page. Uses admin client to bypass RLS. |

---

## UI Pages

### Partner List — `app/(chef)/partners/page.tsx`

- Table showing all partners with columns: Name, Type, Status, Referrals, Conversions, Revenue
- Filter by type and status
- "+ Add Partner" button → `/partners/new`
- Each row links to partner detail

### Create Partner — `app/(chef)/partners/new/page.tsx`

- Uses `PartnerForm` component
- Sections: Partner Info, Contact Details, Showcase & Booking, Internal Notes
- Redirects to partner detail on success

### Partner Detail — `app/(chef)/partners/[id]/page.tsx`

- Header with name, type badge, status
- Stats cards: Total Referrals, Converted Events, Total Revenue, Conversion Rate
- Locations section with per-location stats and inline add/delete
- Images section with thumbnails
- Edit and Report action buttons

### Edit Partner — `app/(chef)/partners/[id]/edit/page.tsx`

- Pre-filled `PartnerForm`
- Updates in place, redirects back to detail

---

## Components

| Component             | File                                            | Purpose                                                 |
| --------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| `PartnerForm`         | `components/partners/partner-form.tsx`          | Reusable create/edit form                               |
| `LocationForm`        | `components/partners/location-form.tsx`         | Location create/edit form                               |
| `PartnerDetailClient` | `components/partners/partner-detail-client.tsx` | Interactive detail page (locations, images, actions)    |
| `PartnerSelect`       | `components/partners/partner-select.tsx`        | Cascading partner → location dropdown for inquiry forms |

---

## Inquiry Integration

### Changes to `lib/inquiries/actions.ts`

- `createInquiry` now accepts optional `referral_partner_id` and `partner_location_id`
- `convertInquiryToEvent` propagates both fields to the new event record

### Changes to `components/inquiries/inquiry-form.tsx`

- New "Referral Source" section after the Channel dropdown
- Partner dropdown shows all active partners
- Location dropdown cascades based on selected partner
- Both fields are optional

### Changes to `app/(chef)/inquiries/new/page.tsx`

- Fetches partners list in parallel with other data
- Builds `partnerLocations` map for the cascading dropdown
- Passes both as props to `InquiryForm`

---

## Navigation

Added to `components/navigation/chef-nav.tsx`:

- **Partners** (`Building2` icon) in the Pipeline group, between Leads and Inquiries
- **Analytics** (`BarChart3` icon) in the Operations group

---

## Data Flow

```
Inquiry created with partner/location
  → Inquiry linked to referral_partners + partner_locations
  → convertInquiryToEvent propagates partner to event
  → Analytics queries aggregate across inquiries + events
  → Partner detail shows per-location stats
  → Partner report generates performance summary
```
