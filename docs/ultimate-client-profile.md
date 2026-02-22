# Ultimate Client Profile — Feature Documentation

## What Changed

The client system went from a 4-field creation form (name, email, phone, status) to a comprehensive client dossier that captures everything a private chef needs to know about every client, ever.

## Architecture

### Two-Mode Client Creation (`/clients/new`)

1. **Quick Add** (default) — Name, email, phone, referral source. Get the record in fast.
2. **Full Profile** — 8 collapsible accordion sections covering every possible field:
   - Identity & Demographics (nickname, occupation, company, birthday, anniversary, Instagram, referral, formality)
   - Household & Family (partner, children, pets with name/type/notes, family notes)
   - Dietary & Culinary Preferences (allergies, restrictions, dislikes, spice tolerance, favorite cuisines/dishes, wine/beverages)
   - Address & Access (address, gate code, WiFi password, parking, access, security, house rules)
   - Kitchen Profile (size, dishwasher, oven/burner/counter/fridge/plating/sink notes, outdoor cooking, grocery store, water quality, place settings, equipment available/must-bring)
   - Service Defaults (service style, guest count, preferred days, budget range, cleanup, leftovers)
   - Personality & Communication (formality, communication style, vibe, interests, wow factors, payment, tipping, farewell, complaint handling)
   - Chef's Internal Assessment (referral potential, red flags, acquisition cost)

### Client Detail Page Additions

New sections added to `/clients/[id]`:

- **Demographics & Identity** — editable panel for occupation, company, birthday, anniversary, Instagram, contact preferences
- **Pets** — add/edit/remove pets with name, type (dog/cat/bird/fish/reptile/other), and notes
- **Client Photos** — full photo gallery with categories (portrait, house, kitchen, dining, outdoor, parking, other), upload, caption editing, category tagging, lightbox preview
- **Kitchen Profile** — now wired in (existed but was never rendered), extended with dishwasher, outdoor cooking, nearest grocery, water quality, place settings
- **Security & Access** — gate code, WiFi password, security notes, parking, access, house rules. Sensitive fields masked by default.
- **Service Defaults** — preferred style, guest count, preferred days, budget range, cleanup, leftovers
- **Business Intelligence** — chef-only assessment: referral potential, red flags, payment behavior, tipping pattern, wow factors, farewell style, complaint handling, acquisition cost

### Chef-Only Data Boundary

These fields are NEVER visible to clients in the client portal:

- `vibe_notes`, `payment_behavior`, `tipping_pattern`, `farewell_style`
- `complaint_handling_notes`, `wow_factors`, `red_flags`, `referral_potential`
- `acquisition_cost_cents`, `communication_style_notes`
- `gate_code`, `wifi_password`, `security_notes`
- All `client_photos` (chef's site documentation)
- All `client_notes` (quick CRM notes)

Enforced at 3 levels:

1. **RLS policies** — `client_photos` has no client access policy
2. **Server actions** — `getMyProfile` (client self-service) explicitly selects only safe fields
3. **Page routing** — these panels only render under `/app/(chef)/`

## Database Changes

### Migration: `20260322000037_ultimate_client_profile.sql`

**New columns on `clients` table (all nullable, purely additive):**

- Social: `instagram_handle`, `social_media_links` JSONB
- Demographics: `occupation`, `company_name`, `birthday` DATE, `anniversary` DATE
- Pets: `pets` JSONB [{name, type, notes}]
- Security: `gate_code`, `wifi_password`, `security_notes`
- Service: `preferred_service_style`, `typical_guest_count`, `preferred_event_days`, `budget_range_min_cents`, `budget_range_max_cents`, `cleanup_expectations`, `leftovers_preference`
- Kitchen: `has_dishwasher`, `outdoor_cooking_notes`, `nearest_grocery_store`, `water_quality_notes`, `available_place_settings`
- Personality: `formality_level` (CHECK: casual/semi_formal/formal), `communication_style_notes`, `complaint_handling_notes`, `wow_factors`
- Business: `referral_potential` (CHECK: low/medium/high), `red_flags`, `acquisition_cost_cents`

**New table: `client_photos`**

- Columns: id, tenant_id, client_id, storage_path, filename_original, content_type, size_bytes, caption, category, display_order, uploaded_by, created_at, updated_at, deleted_at
- Categories: portrait, house, kitchen, dining, outdoor, parking, other
- RLS: chef-only (select, insert, update). No client access.
- Storage bucket: `client-photos` (private, 10MB limit, JPEG/PNG/HEIC/WebP)

**New indexes:**

- `idx_clients_birthday` (tenant_id, birthday) — for birthday reminders
- `idx_clients_anniversary` (tenant_id, anniversary) — for anniversary reminders
- `idx_clients_referral_potential` (tenant_id, referral_potential)

## Files Created/Modified

### New Files

| File                                                             | Purpose                                                    |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `supabase/migrations/20260322000037_ultimate_client_profile.sql` | Migration                                                  |
| `lib/clients/photo-actions.ts`                                   | Client photo upload/delete/caption/category server actions |
| `components/ui/tag-array-input.tsx`                              | Reusable tag/chip input for arrays                         |
| `components/clients/client-photo-gallery.tsx`                    | Photo gallery with categories, lightbox, upload            |
| `components/clients/demographics-editor.tsx`                     | Demographics view/edit panel                               |
| `components/clients/pet-manager.tsx`                             | Pet CRUD panel                                             |
| `components/clients/security-access-panel.tsx`                   | Security & access panel with masked fields                 |
| `components/clients/service-defaults-panel.tsx`                  | Service preferences panel                                  |
| `components/clients/business-intel-panel.tsx`                    | Chef-only business intelligence panel                      |
| `docs/ultimate-client-profile.md`                                | This document                                              |

### Modified Files

| File                                            | Changes                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `lib/clients/actions.ts`                        | Expanded `CreateClientSchema` (60+ fields), `UpdateClientSchema` (60+ fields), `createClient` passes all fields |
| `app/(chef)/clients/new/client-create-form.tsx` | Complete rewrite: Quick Add + Full Profile accordion form                                                       |
| `app/(chef)/clients/[id]/page.tsx`              | Added 7 new sections + KitchenProfilePanel (was built but never rendered)                                       |
| `components/clients/kitchen-profile-panel.tsx`  | Extended with 5 new fields (dishwasher, outdoor, grocery, water, place settings)                                |
| `lib/clients/completeness.ts`                   | Re-weighted 16 fields (was 12) to include birthday, address, pets, service defaults                             |

## Profile Completeness Weights (total = 100)

| Field                | Weight |
| -------------------- | ------ |
| Allergies confirmed  | 15     |
| Dietary restrictions | 12     |
| Kitchen constraints  | 8      |
| Contact info         | 8      |
| Preferred cuisines   | 6      |
| Dislikes             | 6      |
| Vibe notes           | 6      |
| Payment behavior     | 5      |
| Birthday/anniversary | 5      |
| Address              | 5      |
| Pets documented      | 4      |
| Service defaults     | 4      |
| Regular guests       | 4      |
| Partner's name       | 4      |
| Personal milestones  | 4      |
| What they care about | 4      |

## Tier Assignment

This is all **Free tier** — client relationship management is part of the irreducible core. No Pro gating needed.
