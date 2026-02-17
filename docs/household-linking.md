# Phase 5: Household Linking System

## What Changed

Added a full household management system that lets chefs group clients into families, couples, and regular groups. Each household has named members with relationship types, a primary contact, and can be linked to events. This replaces the simpler "partner name" text fields with structured, linked profiles.

## Why

Private chefs cook for households, not individuals. A chef needs to know that Mr. Johnson is married to Mrs. Johnson, their daughter has a tree nut allergy, and their regular dinner guest prefers vegetarian. Previously, this was scattered across free-text fields and mental notes. The household system creates structured relationships between client profiles so the chef has full context for every event.

## New Files

### Migration
- `supabase/migrations/20260220000005_households.sql`
  - `household_relationship` enum: partner, child, family_member, regular_guest
  - `households` table: tenant-scoped, with name, primary_client_id, notes
  - `household_members` table: links clients to households with relationship type, unique constraint on (household_id, client_id)
  - `events.household_id` column: nullable FK to households (additive)
  - RLS policies: chef-only within tenant for both tables
  - Indexes on tenant_id, household_id, client_id

### Server Actions
- `lib/households/actions.ts`
  - `createHousehold()` -- create with name, optional primary contact, notes
  - `updateHousehold()` -- update name, primary contact, notes
  - `deleteHousehold()` -- cascade deletes members
  - `getHouseholds()` -- list all with members and client names (batched queries)
  - `getHousehold()` -- single household with full member details
  - `getClientHousehold()` -- find household for a specific client
  - `addHouseholdMember()` -- with relationship type, duplicate detection
  - `removeHouseholdMember()` -- with ownership verification
  - `updateMemberRelationship()` -- change relationship type
  - `linkEventToHousehold()` -- associate event with household

### Components
- `components/households/household-card.tsx` -- overview card with member chips, relationship labels, primary contact crown icon
- `components/households/household-form.tsx` -- create/edit form with client dropdown for primary contact
- `components/households/household-manager.tsx` -- inline manager for client detail page (create, join existing, view members, remove members)

### Pages
- `app/(chef)/households/page.tsx` -- list all households + create form
- `app/(chef)/households/[id]/page.tsx` -- household detail with member management + edit form
- `app/(chef)/households/[id]/household-detail-members.tsx` -- client component for adding/removing members

## Modified Files

### `components/navigation/chef-nav.tsx`
- Added `Home` icon import from lucide-react
- Added `{ href: '/households', label: 'Households', icon: Home }` to the Clients navigation group

### `middleware.ts`
- Added `/households` to `chefPaths` array for auth protection

### `app/(chef)/clients/[id]/page.tsx`
- Added `HouseholdManager` component between PersonalInfoEditor and QuickNotes sections
- Added imports for `getClientHousehold` and `getHouseholds`
- Extended Promise.all to fetch household data in parallel

### `components/events/event-form.tsx`
- Added `HouseholdOption` type and `households` prop (optional)
- Added `householdId` state
- Added optional household `<Select>` dropdown after client selector
- Passes `household_id` to both `createEvent` and `updateEvent` calls

### `lib/events/actions.ts`
- Added `household_id: z.string().uuid().nullable().optional()` to both `CreateEventSchema` and `UpdateEventSchema`
- Added `household_id` to insert object in `createEvent()`
- `updateEvent()` auto-includes via `...validated` spread

### `app/(chef)/events/new/page.tsx`
- Fetches households in parallel with clients
- Passes `householdOptions` to EventForm

### `app/(chef)/events/[id]/edit/page.tsx`
- Fetches households in parallel with clients
- Maps `household_id` from event data
- Passes `householdOptions` to EventForm

## Data Model

```sql
-- Enum
household_relationship: 'partner' | 'child' | 'family_member' | 'regular_guest'

-- Tables
households (
  id UUID PK,
  tenant_id UUID FK chefs,
  name TEXT NOT NULL,            -- "The Johnsons"
  primary_client_id UUID FK clients,
  notes TEXT,
  created_at, updated_at
)

household_members (
  id UUID PK,
  household_id UUID FK households ON DELETE CASCADE,
  client_id UUID FK clients ON DELETE CASCADE,
  relationship household_relationship NOT NULL,
  joined_at TIMESTAMPTZ,
  UNIQUE(household_id, client_id)
)

-- Additive column on events
events.household_id UUID FK households ON DELETE SET NULL
```

## Relationship Types

| Type | Use Case |
|------|----------|
| partner | Spouse, significant other, co-host |
| child | Son, daughter, minor family member |
| family_member | Parent, sibling, extended family |
| regular_guest | Frequent dinner guest, recurring +1 |

## Key Design Decisions

1. **Households are chef-managed**: Only chefs create and manage households. Clients don't see or interact with household grouping -- it's an organizational tool for the chef.

2. **Client can be in one household**: The `getClientHousehold()` function returns the first household a client belongs to. While the schema allows multiple memberships, the UI presents a single household per client for simplicity.

3. **Primary contact**: Each household has an optional primary_client_id indicating who the chef communicates with. Shown with a crown icon.

4. **Event linking is optional**: The household selector on the event form is optional. Events can exist without a household link.

5. **Cascade deletes**: Deleting a household cascade-deletes all membership records. The clients themselves are preserved.

6. **`@ts-nocheck`**: Applied to `lib/households/actions.ts` since the migration hasn't been applied yet. Remove after applying the migration and regenerating types.

## Connection to System

- Uses `requireChef()` for all actions -- household management is chef-only
- Tenant scoping on all queries via `user.tenantId!`
- RLS policies enforce tenant isolation at the database level
- Integrates with existing client detail page, event form, and navigation
- Households appear in the Clients navigation group alongside Clients and Loyalty
