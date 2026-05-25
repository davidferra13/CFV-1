# Spec: Business Operations Dashboard

> **Status:** SPEC-READY
> **Priority:** P2
> **Origin:** Chef Exit Points Analysis (exits 42, 48-50, 53, 56, 62-63)
> **Depends On:** None (standalone tracking features)
> **Created:** 2026-05-25

---

## What This Is

A lightweight dashboard for tracking the administrative overhead that every independent chef manages outside ChefFlow: credentials, insurance policies, trusted staff, major equipment, and tax prep exports. These are all permanent exits. ChefFlow will never replace government portals, insurance providers, Amazon, or staffing agencies. But ChefFlow can track what matters, remind chefs before things expire, and eliminate the mental load of remembering renewal dates, policy numbers, and "who was that great sous chef from last October?"

---

## What This Is NOT

- Not an ERP, insurance portal, or procurement system.
- Not a replacement for the existing Staff Trust and Delegation System (see non-overlap note below).
- Not a replacement for the Equipment Packing List auto-generation or Chef Gear Check features.
- Not a second tax/finance system. Tax Prep Export reuses the existing CPA-Ready Tax Export infrastructure.

---

## Non-Overlap With Existing Specs

### Staff Trust and Delegation System (`docs/specs/staff-trust-and-delegation-system-foundation-domain-contract.md`)

That system is an internal synthesis layer over `staff_members`, `event_staff_assignments`, `chef_delegates`, and `event_collaborators`. It models trust, delegation scopes, assignment-scoped briefings, and post-event performance capture for people who work WITHIN ChefFlow events.

The **Trusted Staff Roster** in this spec is different. It tracks **external contacts** the chef has worked with who are NOT in the ChefFlow staff system: a freelance sous chef found through word of mouth, a bartender from a staffing agency, a server who helped once. These are rolodex entries with a phone number and a reliability note, not full staff members with portal access, shift scheduling, onboarding checklists, and performance scoring.

If a contact graduates from "rolodex entry" to "real staff member," the chef promotes them into the staff system. The Trusted Staff Roster is the shallow end of the pool.

### Equipment Packing List (`docs/specs/equipment-packing-list.md`) and Chef Gear Check (`docs/specs/chef-gear-check.md`)

Equipment Packing List auto-generates per-event packing lists from venue profiles, menu techniques, and chef inventory. Chef Gear Check is personal readiness (uniform, tools, grooming). Both are event-scoped.

The **Equipment Inventory** in this spec is the underlying registry of major owned equipment with purchase dates, warranty expiry, and service contacts. It feeds into the packing list system's "Equipment Registry" concept but focuses on the business/asset tracking side: "When does the warranty on my combi oven expire?" and "Who do I call to service my immersion circulator?"

The packing list spec already calls for an Equipment Registry (Section 1). This spec defines the business-tracking fields that complement it. Same table, richer columns.

### CPA-Ready Tax Export (`docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md`)

That spec built the canonical `buildCpaExportDataset` and `generateCpaExportPackage` pipeline. The **Tax Prep Export** section here adds a simplified dashboard card that surfaces the export readiness status and download link. No new export logic. Just a convenient entry point from the Business Ops Dashboard.

---

## 1. Credential Tracker

Tracks renewable professional credentials: food handler's license, business licenses, event-specific permits, ServSafe certification, and any other credential the chef needs to operate legally.

### Fields

| Field               | Type    | Required | Notes                                                                        |
| ------------------- | ------- | -------- | ---------------------------------------------------------------------------- |
| `credential_name`   | text    | yes      | e.g., "ServSafe Manager Certification"                                       |
| `credential_type`   | enum    | yes      | `food_handler`, `business_license`, `event_permit`, `certification`, `other` |
| `issuing_authority` | text    | no       | e.g., "Massachusetts DPH", "City of Boston"                                  |
| `credential_number` | text    | no       | License/cert number                                                          |
| `issue_date`        | date    | no       | When issued                                                                  |
| `expiry_date`       | date    | no       | When it expires (null = no expiry)                                           |
| `renewal_url`       | text    | no       | Direct link to renewal portal                                                |
| `document_path`     | text    | no       | Uploaded scan/photo (local FS)                                               |
| `notes`             | text    | no       | Free text                                                                    |
| `reminder_sent_30d` | boolean | no       | Whether 30-day reminder fired                                                |
| `reminder_sent_7d`  | boolean | no       | Whether 7-day reminder fired                                                 |

### Behavior

- Dashboard card shows credentials sorted by expiry date (soonest first).
- Expired credentials show a red badge. Expiring within 30 days shows amber.
- "Add Credential" inline form. No wizard, no modal. Type, name, dates, optional URL, done.
- Document upload stores to local FS under `uploads/{tenant_id}/credentials/`.
- Renewal URL renders as a clickable external link (opens new tab). This is the "link out, don't replace" pattern.
- Credentials with no expiry date (like a one-time permit) appear in a separate "No Expiry" section below the timeline.

### Reminders

- 30 days before expiry: Remy generates a reminder note (uses existing Remy note system, not a new notification channel).
- 7 days before expiry: second Remy reminder, higher urgency.
- Reminders are idempotent. If already sent, skip.
- Reminder check runs as part of the existing CIL hourly scanner (add a credential-expiry signal source).

---

## 2. Insurance Tracker

Tracks business insurance policies. Chefs carry liability insurance at minimum; many also carry auto, health, and equipment coverage.

### Fields

| Field                   | Type    | Required | Notes                                                                                                 |
| ----------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `policy_type`           | enum    | yes      | `general_liability`, `professional_liability`, `auto`, `health`, `equipment`, `workers_comp`, `other` |
| `provider_name`         | text    | yes      | e.g., "FLIP Insurance", "State Farm"                                                                  |
| `policy_number`         | text    | no       |                                                                                                       |
| `coverage_amount_cents` | integer | no       | e.g., $1M = 100000000                                                                                 |
| `premium_cents`         | integer | no       | Annual premium                                                                                        |
| `premium_frequency`     | enum    | no       | `annual`, `semi_annual`, `quarterly`, `monthly`                                                       |
| `renewal_date`          | date    | no       |                                                                                                       |
| `agent_name`            | text    | no       |                                                                                                       |
| `agent_phone`           | text    | no       |                                                                                                       |
| `agent_email`           | text    | no       |                                                                                                       |
| `portal_url`            | text    | no       | Link to provider portal                                                                               |
| `document_path`         | text    | no       | Uploaded policy document                                                                              |
| `notes`                 | text    | no       |                                                                                                       |
| `reminder_sent_30d`     | boolean | no       |                                                                                                       |
| `reminder_sent_7d`      | boolean | no       |                                                                                                       |

### Behavior

- Same expiry/reminder pattern as credentials.
- Premium is displayed as a line item so the chef knows what they're paying. This also feeds into the financial picture (premium is a deductible business expense).
- Coverage amount displays in human-readable format ("$1,000,000 / $2,000,000" for typical liability).
- Portal URL links out to the insurance provider. Permanent exit.
- Agent contact info renders with click-to-call (tel:) and click-to-email (mailto:).

---

## 3. Trusted Staff Roster (External Contacts)

A lightweight rolodex for people the chef has worked with who are not (yet) in the ChefFlow staff system. Freelancers, one-time helpers, agency contacts.

### Fields

| Field                   | Type    | Required | Notes                                                                                         |
| ----------------------- | ------- | -------- | --------------------------------------------------------------------------------------------- |
| `name`                  | text    | yes      |                                                                                               |
| `role`                  | enum    | yes      | `sous_chef`, `line_cook`, `server`, `bartender`, `dishwasher`, `assistant`, `driver`, `other` |
| `phone`                 | text    | no       |                                                                                               |
| `email`                 | text    | no       |                                                                                               |
| `hourly_rate_cents`     | integer | no       | What they charge                                                                              |
| `day_rate_cents`        | integer | no       | Alternative to hourly                                                                         |
| `availability_notes`    | text    | no       | e.g., "Weekends only", "Available June-Sept"                                                  |
| `reliability_rating`    | integer | no       | 1-5 stars, chef's subjective assessment                                                       |
| `last_worked_date`      | date    | no       | When chef last used them                                                                      |
| `last_worked_event`     | text    | no       | Free text event reference (not a foreign key; they may not be in ChefFlow events)             |
| `has_food_handler_cert` | boolean | no       | Whether they hold a current food handler's license                                            |
| `has_servsafe`          | boolean | no       |                                                                                               |
| `dietary_restrictions`  | text    | no       | If relevant for staff meals                                                                   |
| `notes`                 | text    | no       | Private chef notes                                                                            |

### Behavior

- Sortable/filterable by role, rating, last worked date.
- "Quick-assign" action: when planning an event, chef can browse this roster, tap a contact, and get their phone/rate/availability displayed for quick outreach. This does NOT create an `event_staff_assignment`. It just surfaces the info. If the chef hires them, they either text/call (permanent exit) or promote them to the full staff system.
- "Promote to Staff" button creates a `staff_members` record pre-filled with name, phone, role, and rate from the roster entry. The roster entry gets a `promoted_to_staff_id` reference and becomes read-only.
- No portal access, no shift scheduling, no onboarding checklists. That is the Staff Trust and Delegation System's domain.

### Relationship to Staff System

```
Trusted Staff Roster (lightweight)          Staff System (full)
  name, phone, role, rate                    staff_members table
  reliability note (1-5)                     performance scores, trust memories
  "I've worked with them"                    event assignments, portal, shifts

  --- "Promote to Staff" --->                Creates staff_members row
```

---

## 4. Equipment Inventory

Tracks major owned equipment. Not every whisk and spatula. The big stuff that costs real money, has warranties, and needs servicing.

### Fields

| Field                   | Type    | Required | Notes                                                         |
| ----------------------- | ------- | -------- | ------------------------------------------------------------- |
| `item_name`             | text    | yes      | e.g., "Anova Precision Cooker Pro"                            |
| `category`              | enum    | yes      | `cooking`, `prep`, `transport`, `service`, `storage`, `other` |
| `brand`                 | text    | no       |                                                               |
| `model`                 | text    | no       |                                                               |
| `serial_number`         | text    | no       | For warranty claims                                           |
| `purchase_date`         | date    | no       |                                                               |
| `purchase_price_cents`  | integer | no       | For depreciation/insurance                                    |
| `purchase_source`       | text    | no       | e.g., "Amazon", "WebstaurantStore"                            |
| `condition`             | enum    | no       | `excellent`, `good`, `fair`, `needs_service`, `retired`       |
| `warranty_expiry`       | date    | no       |                                                               |
| `service_contact_name`  | text    | no       |                                                               |
| `service_contact_phone` | text    | no       |                                                               |
| `service_contact_url`   | text    | no       | Manufacturer support page                                     |
| `notes`                 | text    | no       |                                                               |
| `retired_date`          | date    | no       | When taken out of service                                     |

### Behavior

- Default view shows active equipment (condition != `retired`) sorted by category.
- Warranty expiry uses the same amber/red badge pattern as credentials.
- Warranty reminders via Remy at 30 days before expiry ("Your Rational combi oven warranty expires Dec 15. Service contact: 800-555-1234").
- Service contact renders with click-to-call. Service URL opens external (permanent exit to manufacturer).
- Purchase price feeds into insurance valuation (chef can generate a total equipment value for insurance purposes).
- "Equipment Value Summary" card shows total value of active equipment. Useful for insurance coverage decisions.
- Retired items hidden by default but accessible via filter toggle.

### Relationship to Packing List

The Equipment Packing List spec's "Equipment Registry" (Section 1) tracks items the chef owns for the purpose of auto-generating packing lists. This Equipment Inventory extends that with business-tracking fields (purchase price, warranty, service contacts, serial numbers). They should share a table: `chef_equipment`.

The packing list system reads `item_name`, `category`, `quantity`, and `condition`. This spec adds `brand`, `model`, `serial_number`, `purchase_date`, `purchase_price_cents`, `purchase_source`, `warranty_expiry`, `service_contact_*`, and `retired_date`.

---

## 5. Tax Prep Export Card

A dashboard card that surfaces the existing CPA-Ready Tax Export without building any new export logic.

### Behavior

- Shows current tax year readiness status from `buildCpaExportDataset(currentYear)`.
- If blockers exist: shows count and links to the year-end page for details.
- If ready: shows "Download CPA Export" button that hits the existing `/finance/year-end/export` route.
- Shows last export run metadata if one exists (date, export number).
- Links to `/finance/year-end` for the full experience.
- Also shows a quick summary: total revenue, total expenses, net profit for the current year (read from the same canonical dataset, no duplicate calculation).

---

## Database

### Migration

Check `database/migrations/` for highest timestamp and use the next available.

### Tables

```sql
-- Credential Tracker
CREATE TABLE IF NOT EXISTS chef_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  credential_name TEXT NOT NULL,
  credential_type TEXT NOT NULL CHECK (credential_type IN (
    'food_handler', 'business_license', 'event_permit', 'certification', 'other'
  )),
  issuing_authority TEXT,
  credential_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  renewal_url TEXT,
  document_path TEXT,
  notes TEXT,
  reminder_sent_30d BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_7d BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_credentials_tenant ON chef_credentials(tenant_id);
CREATE INDEX idx_chef_credentials_expiry ON chef_credentials(tenant_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

-- Insurance Tracker
CREATE TABLE IF NOT EXISTS chef_insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL CHECK (policy_type IN (
    'general_liability', 'professional_liability', 'auto',
    'health', 'equipment', 'workers_comp', 'other'
  )),
  provider_name TEXT NOT NULL,
  policy_number TEXT,
  coverage_amount_cents INTEGER,
  premium_cents INTEGER,
  premium_frequency TEXT CHECK (premium_frequency IN (
    'annual', 'semi_annual', 'quarterly', 'monthly'
  )),
  renewal_date DATE,
  agent_name TEXT,
  agent_phone TEXT,
  agent_email TEXT,
  portal_url TEXT,
  document_path TEXT,
  notes TEXT,
  reminder_sent_30d BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_7d BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chef_insurance_tenant ON chef_insurance_policies(tenant_id);
CREATE INDEX idx_chef_insurance_renewal ON chef_insurance_policies(tenant_id, renewal_date)
  WHERE renewal_date IS NOT NULL;

-- Trusted Staff Roster (external contacts, not full staff members)
CREATE TABLE IF NOT EXISTS trusted_staff_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'sous_chef', 'line_cook', 'server', 'bartender',
    'dishwasher', 'assistant', 'driver', 'other'
  )),
  phone TEXT,
  email TEXT,
  hourly_rate_cents INTEGER,
  day_rate_cents INTEGER,
  availability_notes TEXT,
  reliability_rating INTEGER CHECK (reliability_rating BETWEEN 1 AND 5),
  last_worked_date DATE,
  last_worked_event TEXT,
  has_food_handler_cert BOOLEAN NOT NULL DEFAULT false,
  has_servsafe BOOLEAN NOT NULL DEFAULT false,
  dietary_restrictions TEXT,
  notes TEXT,
  promoted_to_staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trusted_staff_tenant ON trusted_staff_contacts(tenant_id);
CREATE INDEX idx_trusted_staff_role ON trusted_staff_contacts(tenant_id, role);
```

### Equipment Inventory Columns

The `chef_equipment` table is defined in the Equipment Packing List spec. This spec extends it with business-tracking columns. If `chef_equipment` does not yet exist at build time, create it with all columns. If it exists, add only the missing columns.

```sql
-- Extend chef_equipment with business-tracking fields
-- (Only add columns that don't already exist)
ALTER TABLE chef_equipment ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE chef_equipment ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE chef_equipment ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE chef_equipment ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE chef_equipment ADD COLUMN IF NOT EXISTS purchase_price_cents INTEGER;
ALTER TABLE chef_equipment ADD COLUMN IF NOT EXISTS purchase_source TEXT;
ALTER TABLE chef_equipment ADD COLUMN IF NOT EXISTS warranty_expiry DATE;
ALTER TABLE chef_equipment ADD COLUMN IF NOT EXISTS service_contact_name TEXT;
ALTER TABLE chef_equipment ADD COLUMN IF NOT EXISTS service_contact_phone TEXT;
ALTER TABLE chef_equipment ADD COLUMN IF NOT EXISTS service_contact_url TEXT;
ALTER TABLE chef_equipment ADD COLUMN IF NOT EXISTS retired_date DATE;

CREATE INDEX IF NOT EXISTS idx_chef_equipment_warranty
  ON chef_equipment(chef_id, warranty_expiry) WHERE warranty_expiry IS NOT NULL;
```

---

## Server Actions

**File: `lib/business-ops/actions.ts`** (`'use server'`)

All actions require `requireChef()`. All queries scoped by `user.tenantId!`.

### Credential Actions

| Action                                   | Input                         | Output                          | Side Effects               |
| ---------------------------------------- | ----------------------------- | ------------------------------- | -------------------------- |
| `getCredentials()`                       | none                          | `Credential[]` sorted by expiry | None                       |
| `createCredential(input)`                | name, type, dates, url, notes | `{ success: true, credential }` | Revalidate `/business-ops` |
| `updateCredential(id, input)`            | partial update                | `{ success: true }`             | Revalidate                 |
| `deleteCredential(id)`                   | id                            | `{ success: true }`             | Revalidate                 |
| `uploadCredentialDocument(id, formData)` | id + file                     | `{ success: true, path }`       | Save to local FS           |

### Insurance Actions

| Action                             | Input                           | Output                                | Side Effects |
| ---------------------------------- | ------------------------------- | ------------------------------------- | ------------ |
| `getInsurancePolicies()`           | none                            | `InsurancePolicy[]` sorted by renewal | None         |
| `createInsurancePolicy(input)`     | type, provider, dates, contacts | `{ success: true, policy }`           | Revalidate   |
| `updateInsurancePolicy(id, input)` | partial update                  | `{ success: true }`                   | Revalidate   |
| `deleteInsurancePolicy(id)`        | id                              | `{ success: true }`                   | Revalidate   |

### Trusted Staff Actions

| Action                          | Input                          | Output                             | Side Effects                                             |
| ------------------------------- | ------------------------------ | ---------------------------------- | -------------------------------------------------------- |
| `getTrustedStaff(filters?)`     | optional role, rating filters  | `TrustedStaffContact[]`            | None                                                     |
| `createTrustedStaff(input)`     | name, role, phone, rate, notes | `{ success: true, contact }`       | Revalidate                                               |
| `updateTrustedStaff(id, input)` | partial update                 | `{ success: true }`                | Revalidate                                               |
| `deleteTrustedStaff(id)`        | id                             | `{ success: true }`                | Revalidate                                               |
| `promoteToStaff(id)`            | trusted contact id             | `{ success: true, staffMemberId }` | Creates `staff_members` row, sets `promoted_to_staff_id` |

### Equipment Actions

Equipment CRUD may already exist from the packing list spec. If so, extend with business-field support. If not, create:

| Action                                   | Input                                         | Output                                                  | Side Effects                                         |
| ---------------------------------------- | --------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `getEquipmentInventory(includeRetired?)` | boolean                                       | `Equipment[]`                                           | None                                                 |
| `createEquipment(input)`                 | name, category, brand, model, dates, contacts | `{ success: true, item }`                               | Revalidate                                           |
| `updateEquipment(id, input)`             | partial update                                | `{ success: true }`                                     | Revalidate                                           |
| `retireEquipment(id)`                    | id                                            | `{ success: true }`                                     | Sets `retired_date = now()`, `condition = 'retired'` |
| `getEquipmentValueSummary()`             | none                                          | `{ totalValueCents, itemCount, warrantyExpiringCount }` | None                                                 |

### Tax Prep Card Action

| Action                           | Input | Output                                                                                | Side Effects                                   |
| -------------------------------- | ----- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `getBusinessOpsTaxSummary(year)` | year  | `{ readiness, blockerCount, lastExportRun, revenueCents, expenseCents, profitCents }` | None (reads from existing CPA export pipeline) |

---

## CIL Integration (Expiry Reminders)

Add a `credential_insurance_expiry` signal source to the existing CIL hourly scanner.

### Scanner Logic

```
For each tenant:
  Query chef_credentials WHERE expiry_date IS NOT NULL
    AND expiry_date BETWEEN now() AND now() + 30 days
    AND reminder_sent_30d = false
  -> Generate Remy note: "[credential_name] expires [expiry_date]. Renew: [renewal_url]"
  -> Set reminder_sent_30d = true

  Query chef_credentials WHERE expiry_date IS NOT NULL
    AND expiry_date BETWEEN now() AND now() + 7 days
    AND reminder_sent_7d = false
  -> Generate Remy note (urgent): "[credential_name] expires in [days] days!"
  -> Set reminder_sent_7d = true

  Same pattern for chef_insurance_policies using renewal_date.
  Same pattern for chef_equipment using warranty_expiry.
```

---

## UI

### Route: `app/(chef)/business-ops/page.tsx`

Server component. The Business Operations Dashboard. Five sections on one scrollable page, each collapsible.

### Layout

```
Business Operations
├── Credentials & Licenses          [collapsible, default open]
│   ├── Timeline view (soonest expiry first)
│   ├── Status badges (green/amber/red)
│   └── + Add Credential (inline form)
│
├── Insurance                       [collapsible, default open]
│   ├── Policy cards (type, provider, coverage, renewal)
│   ├── Agent contact (click-to-call, click-to-email)
│   └── + Add Policy (inline form)
│
├── Trusted Staff                   [collapsible, default open]
│   ├── Filterable list (role, rating)
│   ├── Contact cards with rate + availability
│   ├── Quick-assign info panel
│   └── + Add Contact (inline form)
│
├── Equipment                       [collapsible, default collapsed]
│   ├── Category-grouped list
│   ├── Value summary card
│   ├── Warranty status badges
│   └── + Add Equipment (inline form)
│
└── Tax Prep                        [collapsible, default collapsed]
    ├── Readiness status card
    ├── Quick financial summary (revenue, expenses, profit)
    ├── Download CPA Export (if ready)
    └── Link to /finance/year-end
```

### Navigation

Add "Business Ops" to the chef sidebar nav under the "Business" section, near Finance and Expenses.

### Component Architecture

- `components/business-ops/credential-section.tsx` (client component)
- `components/business-ops/insurance-section.tsx` (client component)
- `components/business-ops/trusted-staff-section.tsx` (client component)
- `components/business-ops/equipment-section.tsx` (client component)
- `components/business-ops/tax-prep-card.tsx` (server component)

---

## Exit Points Closed

| Exit # | Scenario                               | How This Spec Addresses It                                                                                                                                                                                                                              |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 42     | Manage business insurance              | Insurance Tracker stores policy details, agent contacts, renewal dates. Renewal reminders via Remy. Portal URL links out to provider. Chef no longer forgets renewal dates or hunts for policy numbers.                                                 |
| 48     | Renew food handler's license           | Credential Tracker stores license details and expiry. 30-day and 7-day Remy reminders. Renewal URL links directly to state/county portal. Chef is prompted before it lapses.                                                                            |
| 49     | Check cottage food / home kitchen laws | Credential Tracker can store relevant permits with links to state regulation pages. The `renewal_url` field doubles as a reference link. Not a legal database; just a bookmark with context.                                                            |
| 50     | Get business license / permits         | Credential Tracker with `event_permit` type. Store permit details, expiry, issuing authority, renewal portal link. Reminders prevent lapses.                                                                                                            |
| 53     | Online courses / certifications        | Credential Tracker with `certification` type. Store cert name, issuing body, expiry. Chef still takes the course externally (permanent exit), but ChefFlow tracks what they hold and when it expires.                                                   |
| 56     | Find sous chef / assistant             | Trusted Staff Roster. Chef builds a rolodex of people they've worked with. Next time they need a sous chef for a big event, they search by role, check reliability rating, see last-worked date, and call the person. No more relying purely on memory. |
| 62     | Buy kitchen equipment                  | Equipment Inventory tracks what the chef owns, purchase source, and price. When something breaks, the chef knows what they have, what it cost, and where they bought it. Purchase links are external (permanent exit).                                  |
| 63     | Get equipment serviced/repaired        | Equipment Inventory stores service contact name, phone, and URL per item. Chef looks up "immersion circulator" and immediately has the service number. No more Googling for the manufacturer's support page.                                            |

### What Remains External (By Design)

- Government portals for actual renewal submission (exits 48-50)
- Insurance provider portals for actual policy management (exit 42)
- Course platforms for actual learning (exit 53)
- Staffing agencies and word-of-mouth networks for finding NEW people (exit 56)
- Amazon, WebstaurantStore for actual purchasing (exit 62)
- Manufacturer and repair shop websites/phones for actual service (exit 63)

---

## Files to Create

| File                                                    | Purpose                                                               |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| `database/migrations/{next}_business_ops_dashboard.sql` | Tables for credentials, insurance, trusted staff; equipment columns   |
| `lib/business-ops/actions.ts`                           | Server actions for all five sections                                  |
| `lib/business-ops/types.ts`                             | TypeScript types for credentials, insurance, trusted staff, equipment |
| `app/(chef)/business-ops/page.tsx`                      | Dashboard page (server component)                                     |
| `components/business-ops/credential-section.tsx`        | Credentials UI                                                        |
| `components/business-ops/insurance-section.tsx`         | Insurance UI                                                          |
| `components/business-ops/trusted-staff-section.tsx`     | Trusted staff UI                                                      |
| `components/business-ops/equipment-section.tsx`         | Equipment UI                                                          |
| `components/business-ops/tax-prep-card.tsx`             | Tax prep status card                                                  |

## Files to Modify

| File                                 | Change                                                 |
| ------------------------------------ | ------------------------------------------------------ |
| `lib/cil/scanner.ts` (or equivalent) | Add credential/insurance/warranty expiry signal source |
| Nav config                           | Add "Business Ops" entry                               |
| `lib/auth/route-policy.ts`           | Register `/business-ops` route                         |

---

## Verification

1. `npx tsc --noEmit --skipLibCheck` passes
2. `npx next build --no-lint` passes
3. Navigate to `/business-ops`, verify all five sections render
4. Add a credential with expiry date 25 days from now, verify amber badge
5. Add an insurance policy, verify agent contact renders with tel: and mailto: links
6. Add a trusted staff contact, verify filtering by role works
7. Rate a contact 4/5, verify stars display
8. Add equipment with warranty expiry, verify badge status
9. Verify Equipment Value Summary card shows correct total
10. Verify Tax Prep card reads from existing CPA export pipeline
11. "Promote to Staff" converts a trusted contact into a `staff_members` row
12. Renewal URL and service URL open in new tabs (external links)

---

## Out of Scope

- No integration with external government APIs (they don't exist in a useful form)
- No insurance quote comparison
- No automated permit application
- No equipment depreciation calculator (that is accountant territory)
- No staff scheduling or shift management (that is the Staff Trust and Delegation System)
- No equipment rental tracking (future spec)
- No in-app messaging to trusted staff contacts (they have phones)
- No photo/image upload for equipment (document upload for credentials/insurance only)
