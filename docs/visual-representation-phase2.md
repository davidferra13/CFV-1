# Visual Representation - Phase 2 (Entity Photo Uploads)

**Date:** 2026-03-29
**Spec:** `docs/specs/visual-representation-strategy.md`

## What was built

### Shared infrastructure

1. **`lib/entities/photo-actions.ts`** - Unified server actions for uploading/removing photos across 5 entity types (client, staff, vendor, equipment, ingredient). Config-driven: each entity type maps to its table, photo column, tenant scoping column, and revalidation paths. Uses the `entity-photos` public storage bucket.

2. **`components/entities/entity-photo-upload.tsx`** - Reusable client component with two modes:
   - **Compact** (48px circular avatar): for headers and list rows. Shows initials fallback when empty, camera overlay on hover when filled.
   - **Full** (16:9 hero): for detail pages. Shows dashed upload prompt when empty, replace/remove buttons on hover when filled.

### Phase 2A: Client Avatars

- **Detail page** (`app/(chef)/clients/[id]/page.tsx`): Compact avatar upload next to client name in header.
- **List page** (`app/(chef)/clients/clients-table.tsx`): 32px avatar thumbnail (or initials circle) in the Name column.

### Phase 2B: Staff Photos

- **Detail page** (`app/(chef)/staff/[id]/page.tsx`): Compact photo upload next to staff name in header.
- **List page** (`app/(chef)/staff/page.tsx`): 32px photo thumbnail (or initials circle) next to each staff member name.

### Phase 2C: Vendor Logos

- **Detail page** (`app/(chef)/vendors/[id]/page.tsx`): Compact logo upload next to vendor name in card header.
- **List page** (`app/(chef)/vendors/page.tsx`): 32px logo thumbnail (or initials square) next to each vendor name.

### Phase 2D: Equipment Photos

- **Equipment list** (`app/(chef)/operations/equipment/equipment-inventory-client.tsx`): Compact photo upload on each equipment item card. Added `photo_url` to the EquipmentItem type.

### Phase 2E: Ingredient Images

- **Detail page** (`app/(chef)/inventory/ingredients/[id]/page.tsx`): Compact image upload next to ingredient name. Added `image_url` to the select query.

## Design decisions

- **Single bucket** (`entity-photos`): all entity photos in one bucket, organized by `{tenantId}/{entityType}s/{entityId}.{ext}`. Simpler than 5 separate buckets.
- **Public URLs**: Entity photos are not sensitive (avatars, logos, food photos). Public bucket avoids signed URL overhead on list pages.
- **Initials fallback**: List views show a stone-800 circle with the first letter when no photo exists. Non-invasive, no empty space.
- **No placeholder images**: Per the spec's non-invasive rule, empty states show initials (people/vendors) or a camera icon (equipment), never stock photos.

## Storage paths

- `entity-photos/{tenantId}/clients/{clientId}.jpg`
- `entity-photos/{tenantId}/staffs/{staffId}.jpg`
- `entity-photos/{tenantId}/vendors/{vendorId}.jpg`
- `entity-photos/{tenantId}/equipments/{equipmentId}.jpg`
- `entity-photos/{tenantId}/ingredients/{ingredientId}.jpg`
