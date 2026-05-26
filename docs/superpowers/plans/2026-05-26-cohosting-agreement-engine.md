# Cohosting Agreement Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Cohosting Agreement Engine: structured responsibility checklists, compensation mapping, e-signatures, and ticket-sale gates for multi-host Dinner Circles.

**Architecture:** Three new database tables (`hub_cohost_agreements`, `hub_agreement_items`, `hub_agreement_signatures`) hold agreements, checklist items, and signatures. Server actions follow the chef-circle pattern (`requireChef()` + tenant scoping). UI is a 4-step setup wizard plus an Agreement tab in the circle view. The Completion Contract gains an agreement-signed gate for co-hosted events. Amendments use signature-critical tiering: compensation/assignment changes void signatures; notes/status do not.

**Tech Stack:** Next.js, PostgreSQL (raw SQL migration), Drizzle (schema sync after migration), TypeScript, Tailwind, Supabase admin client, Zod validation.

**Spec:** `docs/specs/dinner-circle-multi-host-collaboration.md` (lines 326-667)

**Design decisions (from conversation Q&A):**

- "Shared" items: either party marks done, other gets notification
- Compensation: default `splitType: 'gross'`, `'net'` optional in JSONB
- E-signature: "Collaboration Agreement" language (not "legal contract"), timestamp+IP+content_hash
- Amendment tiering: compensation/assignment changes = void signatures (critical); notes/status = notification only (non-critical)
- Post-signing addenda: new items tagged `added_after_signing`, require acknowledgment not re-sign
- Cancellation: Category 11 "Cancellation & Contingency" in templates
- Post-event reconciliation: agreement document shows planned vs actual
- Carry-forward: "Confirm or Adjust" screen for recurring events
- N-party splits: dynamic list of hosts with percentage inputs (sum=100)
- Token-based signing: external partners sign via hub_guest_profiles, no account required
- Content hash: SHA-256 of serialized agreement state at signing time
- Templates default to fair/neutral splits (50/50)

---

## File Map

### New Files

| File                                                          | Responsibility                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| `database/migrations/20260528000001_cohosting_agreements.sql` | Three new tables + columns on `hub_agreement_items`           |
| `lib/hub/agreement-types.ts`                                  | TypeScript types for agreements, items, signatures, templates |
| `lib/hub/agreement-templates.ts`                              | 5 default templates with 11 categories of checklist items     |
| `lib/hub/agreement-utils.ts`                                  | Content hashing, amendment severity check, template hydration |
| `lib/hub/agreement-actions.ts`                                | Server actions: CRUD, signing, amendments, carry-forward      |
| `lib/hub/agreement-lifecycle-hooks.ts`                        | System messages posted to circle on agreement events          |
| `components/hub/agreement-setup-wizard.tsx`                   | 4-step wizard: template, compensation, checklist, sign        |
| `components/hub/agreement-tab.tsx`                            | Agreement tab in circle view with status, checklist, document |
| `components/hub/agreement-compensation-card.tsx`              | Compensation config: model selector + N-party split inputs    |
| `components/hub/agreement-checklist-section.tsx`              | Category-grouped checklist with assignment toggles + notes    |
| `components/hub/agreement-signature-block.tsx`                | E-signature capture: name, role, "I agree" button             |
| `components/hub/agreement-ticket-gate.tsx`                    | Banner blocking ticket sales until agreement is signed        |
| `components/hub/agreement-confirm-adjust.tsx`                 | Carry-forward review screen for recurring events              |

### Modified Files

| File                                 | Change                                         |
| ------------------------------------ | ---------------------------------------------- |
| `lib/completion/evaluators/event.ts` | Add agreement-signed gate for co-hosted events |
| `lib/completion/types.ts`            | Add `'collaboration'` to `RequirementCategory` |

---

## Task 1: Database Migration

**Files:**

- Create: `database/migrations/20260528000001_cohosting_agreements.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ============================================
-- COHOSTING AGREEMENT ENGINE
-- ============================================
-- Structured responsibility checklists, compensation mapping,
-- and e-signatures for multi-host Dinner Circle collaboration.
--
-- Three new tables. No existing columns modified or removed.
-- ADDITIVE ONLY.
-- ============================================

-- ─── Agreements ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hub_cohost_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The dinner circle this agreement belongs to
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,

  -- Optional: specific event within the circle (null = circle-level default)
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Template used to seed default checklist items
  template_type TEXT NOT NULL DEFAULT 'chef_farm'
    CHECK (template_type IN (
      'chef_farm', 'chef_private_host', 'chef_chef',
      'chef_restaurant', 'chef_planner', 'custom'
    )),

  -- How compensation is structured
  compensation_model TEXT NOT NULL DEFAULT 'both_sell'
    CHECK (compensation_model IN (
      'venue_sells_all', 'both_sell', 'chef_sells_all', 'fixed_fee'
    )),

  -- Flexible compensation details
  -- { splitType: 'gross'|'net', splits: [{ hostProfileId, label, percentage }],
  --   fixedFees: [{ hostProfileId, label, amountCents }],
  --   paymentMethod: 'venmo'|'check'|'bank_transfer'|'other',
  --   paymentTiming: 'day_of'|'within_48h'|'within_week'|'custom',
  --   paymentNotes: '...',
  --   sharedExpenses: [{ description, amountCents, paidBy }] }
  compensation_details JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Agreement lifecycle
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_signatures', 'active', 'amended', 'voided')),

  -- Version tracking for amendments (starts at 1, incremented on critical changes)
  version INTEGER NOT NULL DEFAULT 1,

  -- Who created this agreement
  created_by UUID NOT NULL,

  -- Inherited from a previous event's agreement (for carry-forward)
  inherited_from_agreement_id UUID REFERENCES hub_cohost_agreements(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hub_cohost_agreements IS
  'Cohosting collaboration agreements with compensation structure and lifecycle tracking.';

CREATE INDEX IF NOT EXISTS idx_hub_cohost_agreements_group
  ON hub_cohost_agreements(group_id);
CREATE INDEX IF NOT EXISTS idx_hub_cohost_agreements_event
  ON hub_cohost_agreements(event_id);
CREATE INDEX IF NOT EXISTS idx_hub_cohost_agreements_status
  ON hub_cohost_agreements(status);

-- ─── Agreement Items (Checklist) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hub_agreement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agreement_id UUID NOT NULL REFERENCES hub_cohost_agreements(id) ON DELETE CASCADE,

  -- Which category this item belongs to
  category TEXT NOT NULL
    CHECK (category IN (
      'tickets_revenue', 'ingredients', 'equipment', 'venue_setup',
      'culinary', 'beverages', 'hospitality', 'marketing',
      'guest_management', 'wrap_up', 'cancellation'
    )),

  title TEXT NOT NULL,

  -- Who is responsible
  assignment TEXT NOT NULL DEFAULT 'unassigned'
    CHECK (assignment IN ('chef', 'venue', 'shared', 'na', 'unassigned')),

  -- Free-text notes from either party
  notes TEXT,

  -- Execution status (tracked during event)
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'done')),

  -- Display order within category
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- true = came from template, false = user-added custom item
  is_default BOOLEAN NOT NULL DEFAULT true,

  -- Whether this item change should void existing signatures
  -- Template items with assignment changes = true; notes-only changes = false
  signature_critical BOOLEAN NOT NULL DEFAULT true,

  -- Items added after agreement was signed
  added_after_signing BOOLEAN NOT NULL DEFAULT false,

  -- Profile IDs that acknowledged post-signing additions (JSONB array of UUIDs)
  acknowledged_by JSONB NOT NULL DEFAULT '[]'::jsonb,

  completed_at TIMESTAMPTZ,
  completed_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hub_agreement_items IS
  'Individual checklist items within a cohosting agreement, covering the full event lifecycle.';

CREATE INDEX IF NOT EXISTS idx_hub_agreement_items_agreement
  ON hub_agreement_items(agreement_id);
CREATE INDEX IF NOT EXISTS idx_hub_agreement_items_category
  ON hub_agreement_items(agreement_id, category);

-- ─── Agreement Signatures ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hub_agreement_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agreement_id UUID NOT NULL REFERENCES hub_cohost_agreements(id) ON DELETE CASCADE,

  -- Who signed (hub guest profile, works for both chefs and external partners)
  signer_profile_id UUID NOT NULL,

  -- Display info captured at signing time
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL,

  -- SHA-256 hash of the full agreement state at signing time (tamper-evident)
  content_hash TEXT NOT NULL,

  -- Metadata for audit trail
  ip_address TEXT,
  user_agent TEXT,

  -- Which version of the agreement was signed
  version INTEGER NOT NULL DEFAULT 1,

  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One signature per signer per version
  CONSTRAINT unique_agreement_signer_version
    UNIQUE (agreement_id, signer_profile_id, version)
);

COMMENT ON TABLE hub_agreement_signatures IS
  'E-signatures on cohosting agreements with content hash for tamper evidence.';

CREATE INDEX IF NOT EXISTS idx_hub_agreement_signatures_agreement
  ON hub_agreement_signatures(agreement_id);
```

- [ ] **Step 2: Verify migration filename is strictly higher than existing**

Run: `ls database/migrations/ | Select-Object -Last 1`
Expected: `20260527000001_series_circles.sql` (our `20260528000001` is higher)

- [ ] **Step 3: Commit**

```bash
git add database/migrations/20260528000001_cohosting_agreements.sql
git commit -m "feat(db): add cohosting agreement engine tables

Three new tables: hub_cohost_agreements, hub_agreement_items,
hub_agreement_signatures. Supports compensation mapping,
responsibility checklists, and tamper-evident e-signatures.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: TypeScript Types

**Files:**

- Create: `lib/hub/agreement-types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// Cohosting Agreement Engine - Type Definitions
// Pure types, no 'use server' directive.

// ─── Compensation ───────────────────────────────────────────────────────────

export type CompensationModel = 'venue_sells_all' | 'both_sell' | 'chef_sells_all' | 'fixed_fee'
export type SplitType = 'gross' | 'net'
export type PaymentMethod = 'venmo' | 'check' | 'bank_transfer' | 'other'
export type PaymentTiming = 'day_of' | 'within_48h' | 'within_week' | 'custom'

export interface HostSplit {
  hostProfileId: string
  label: string
  percentage: number
}

export interface FixedFee {
  hostProfileId: string
  label: string
  amountCents: number
}

export interface SharedExpense {
  description: string
  amountCents: number
  paidBy: string
}

export interface CompensationDetails {
  splitType: SplitType
  splits: HostSplit[]
  fixedFees: FixedFee[]
  paymentMethod: PaymentMethod
  paymentTiming: PaymentTiming
  paymentNotes: string
  sharedExpenses: SharedExpense[]
}

// ─── Agreement ──────────────────────────────────────────────────────────────

export type AgreementStatus = 'draft' | 'pending_signatures' | 'active' | 'amended' | 'voided'

export type TemplateType =
  | 'chef_farm'
  | 'chef_private_host'
  | 'chef_chef'
  | 'chef_restaurant'
  | 'chef_planner'
  | 'custom'

export interface CohostAgreement {
  id: string
  groupId: string
  eventId: string | null
  templateType: TemplateType
  compensationModel: CompensationModel
  compensationDetails: CompensationDetails
  status: AgreementStatus
  version: number
  createdBy: string
  inheritedFromAgreementId: string | null
  createdAt: string
  updatedAt: string
}

// ─── Checklist Items ────────────────────────────────────────────────────────

export type ItemCategory =
  | 'tickets_revenue'
  | 'ingredients'
  | 'equipment'
  | 'venue_setup'
  | 'culinary'
  | 'beverages'
  | 'hospitality'
  | 'marketing'
  | 'guest_management'
  | 'wrap_up'
  | 'cancellation'

export type ItemAssignment = 'chef' | 'venue' | 'shared' | 'na' | 'unassigned'
export type ItemStatus = 'not_started' | 'in_progress' | 'done'

export interface AgreementItem {
  id: string
  agreementId: string
  category: ItemCategory
  title: string
  assignment: ItemAssignment
  notes: string | null
  status: ItemStatus
  sortOrder: number
  isDefault: boolean
  signatureCritical: boolean
  addedAfterSigning: boolean
  acknowledgedBy: string[]
  completedAt: string | null
  completedBy: string | null
  createdAt: string
  updatedAt: string
}

// ─── Signatures ─────────────────────────────────────────────────────────────

export interface AgreementSignature {
  id: string
  agreementId: string
  signerProfileId: string
  signerName: string
  signerRole: string
  contentHash: string
  ipAddress: string | null
  userAgent: string | null
  version: number
  signedAt: string
}

// ─── Composed Views ─────────────────────────────────────────────────────────

export interface AgreementWithItems extends CohostAgreement {
  items: AgreementItem[]
  signatures: AgreementSignature[]
  hosts: AgreementHost[]
}

export interface AgreementHost {
  profileId: string
  displayName: string
  label: string
  organization: string | null
  hasSigned: boolean
  signedAt: string | null
}

// ─── Template Definition ────────────────────────────────────────────────────

export interface TemplateItem {
  category: ItemCategory
  title: string
  signatureCritical: boolean
}

export interface AgreementTemplate {
  type: TemplateType
  label: string
  description: string
  defaultCompensationModel: CompensationModel
  defaultSplitPercentage: number
  items: TemplateItem[]
}

// ─── Category Metadata ──────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  tickets_revenue: 'Tickets & Revenue',
  ingredients: 'Ingredients & Sourcing',
  equipment: 'Equipment & Serviceware',
  venue_setup: 'Venue & Setup',
  culinary: 'Culinary Execution',
  beverages: 'Beverages',
  hospitality: 'Hospitality & Guest Experience',
  marketing: 'Marketing & Promotion',
  guest_management: 'Guest Management',
  wrap_up: 'Wrap-Up & Post-Event',
  cancellation: 'Cancellation & Contingency',
}

export const COMPENSATION_MODEL_LABELS: Record<CompensationModel, string> = {
  venue_sells_all: 'Venue sells 100%',
  both_sell: 'Both sell tickets',
  chef_sells_all: 'Chef sells 100%',
  fixed_fee: 'Fixed compensation',
}

export const ASSIGNMENT_LABELS: Record<ItemAssignment, string> = {
  chef: 'Chef',
  venue: 'Venue',
  shared: 'Shared',
  na: 'N/A',
  unassigned: 'Unassigned',
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hub/agreement-types.ts
git commit -m "feat: add cohosting agreement TypeScript types

Types for agreements, checklist items, signatures, templates,
compensation models, and category metadata.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Default Templates

**Files:**

- Create: `lib/hub/agreement-templates.ts`

- [ ] **Step 1: Create the templates file with all 11 categories**

This file defines the default checklist items for each template type. All 5 templates share the same base items; templates customize which items are included and their default assignments.

```typescript
import type { AgreementTemplate, TemplateItem, ItemCategory } from './agreement-types'

// ─── Base Checklist Items (shared across all templates) ─────────────────────

const BASE_ITEMS: TemplateItem[] = [
  // Category 1: Tickets & Revenue
  { category: 'tickets_revenue', title: 'Ticket pricing', signatureCritical: true },
  { category: 'tickets_revenue', title: 'Who sells tickets', signatureCritical: true },
  { category: 'tickets_revenue', title: 'Revenue split model', signatureCritical: true },
  {
    category: 'tickets_revenue',
    title: 'Revenue split ratio and amounts',
    signatureCritical: true,
  },
  { category: 'tickets_revenue', title: 'Payment method and timing', signatureCritical: true },
  { category: 'tickets_revenue', title: 'Refund policy ownership', signatureCritical: true },

  // Category 2: Ingredients & Sourcing
  { category: 'ingredients', title: 'Farm-sourced ingredients', signatureCritical: true },
  {
    category: 'ingredients',
    title: 'Market-bought ingredients (who shops, who pays)',
    signatureCritical: true,
  },
  {
    category: 'ingredients',
    title: 'Specialty items (butcher, fishmonger, forager)',
    signatureCritical: true,
  },
  {
    category: 'ingredients',
    title: 'Ingredient list exchange (quantities and confirmation)',
    signatureCritical: false,
  },
  { category: 'ingredients', title: 'Substitution authority', signatureCritical: true },
  { category: 'ingredients', title: 'Harvest timing coordination', signatureCritical: false },

  // Category 3: Equipment & Serviceware
  { category: 'equipment', title: 'Plates, bowls, serving platters', signatureCritical: true },
  { category: 'equipment', title: 'Glasses (water, wine, cocktail)', signatureCritical: true },
  { category: 'equipment', title: 'Silverware and napkins', signatureCritical: true },
  {
    category: 'equipment',
    title: 'Cooking equipment (grills, burners, ovens)',
    signatureCritical: true,
  },
  {
    category: 'equipment',
    title: 'Prep equipment (cutting boards, blenders, processors)',
    signatureCritical: false,
  },
  {
    category: 'equipment',
    title: 'Serving equipment (chafing dishes, boards)',
    signatureCritical: false,
  },
  { category: 'equipment', title: 'Tables, chairs, seating', signatureCritical: true },
  { category: 'equipment', title: 'Linens and table cloths', signatureCritical: false },
  {
    category: 'equipment',
    title: 'Rentals needed (who arranges, who pays)',
    signatureCritical: true,
  },

  // Category 4: Venue & Setup
  {
    category: 'venue_setup',
    title: 'Property preparation (mowing, cleaning, pathways)',
    signatureCritical: true,
  },
  { category: 'venue_setup', title: 'Table setup and decor', signatureCritical: false },
  {
    category: 'venue_setup',
    title: 'Lighting (string lights, candles, lanterns)',
    signatureCritical: false,
  },
  {
    category: 'venue_setup',
    title: 'Weather contingency (tents, indoor backup)',
    signatureCritical: true,
  },
  { category: 'venue_setup', title: 'Parking arrangement', signatureCritical: false },
  { category: 'venue_setup', title: 'Signage and wayfinding', signatureCritical: false },
  {
    category: 'venue_setup',
    title: 'Heating or cooling (outdoor heaters, fans)',
    signatureCritical: false,
  },
  { category: 'venue_setup', title: 'Restroom access', signatureCritical: true },
  {
    category: 'venue_setup',
    title: 'Power (extension cords, generators)',
    signatureCritical: false,
  },

  // Category 5: Culinary Execution
  { category: 'culinary', title: 'Menu design and finalization', signatureCritical: true },
  { category: 'culinary', title: 'Prep (by course)', signatureCritical: true },
  { category: 'culinary', title: 'Cooking (by course)', signatureCritical: true },
  { category: 'culinary', title: 'Plating (by course)', signatureCritical: true },
  { category: 'culinary', title: 'Service and running food', signatureCritical: true },
  { category: 'culinary', title: 'Appetizers and pre-dinner nibbles', signatureCritical: false },
  { category: 'culinary', title: 'Dessert', signatureCritical: false },
  { category: 'culinary', title: 'Staff and helpers needed', signatureCritical: true },

  // Category 6: Beverages
  { category: 'beverages', title: 'Wine and beer sourcing', signatureCritical: true },
  { category: 'beverages', title: 'Cocktail and mocktail creation', signatureCritical: false },
  { category: 'beverages', title: 'Non-alcoholic beverages', signatureCritical: false },
  { category: 'beverages', title: 'Who pays for beverages', signatureCritical: true },
  { category: 'beverages', title: 'Included in ticket vs upcharge', signatureCritical: true },
  { category: 'beverages', title: 'Bar setup and service', signatureCritical: true },

  // Category 7: Hospitality & Guest Experience
  { category: 'hospitality', title: 'Guest greeting and welcome', signatureCritical: false },
  { category: 'hospitality', title: 'Farm tour or venue tour', signatureCritical: false },
  {
    category: 'hospitality',
    title: 'Course introductions and storytelling',
    signatureCritical: false,
  },
  {
    category: 'hospitality',
    title: 'Guest comfort (blankets, heaters, bug spray)',
    signatureCritical: false,
  },
  { category: 'hospitality', title: 'Music and ambiance', signatureCritical: false },
  {
    category: 'hospitality',
    title: 'Post-dinner experience (fire pit, lounge)',
    signatureCritical: false,
  },

  // Category 8: Marketing & Promotion
  { category: 'marketing', title: 'Event flyer and graphic design', signatureCritical: false },
  { category: 'marketing', title: 'Social media promotion', signatureCritical: false },
  { category: 'marketing', title: 'Website listing', signatureCritical: false },
  { category: 'marketing', title: 'Cross-promotion (tag each other)', signatureCritical: false },
  { category: 'marketing', title: 'Photography during event', signatureCritical: true },
  { category: 'marketing', title: 'Post-event content sharing', signatureCritical: false },

  // Category 9: Guest Management
  {
    category: 'guest_management',
    title: 'Guest communication (pre-event email, logistics)',
    signatureCritical: true,
  },
  {
    category: 'guest_management',
    title: 'Dietary restrictions and allergies collection',
    signatureCritical: true,
  },
  {
    category: 'guest_management',
    title: 'Headcount tracking and confirmation',
    signatureCritical: true,
  },
  {
    category: 'guest_management',
    title: 'Special occasions (birthdays, etc.)',
    signatureCritical: false,
  },
  { category: 'guest_management', title: 'Day-of guest questions', signatureCritical: false },

  // Category 10: Wrap-Up & Post-Event
  { category: 'wrap_up', title: 'Clear table (dishes, glasses, decor)', signatureCritical: false },
  { category: 'wrap_up', title: 'Wash dishes and serviceware', signatureCritical: false },
  { category: 'wrap_up', title: 'Clean cooking area', signatureCritical: false },
  {
    category: 'wrap_up',
    title: 'Pack chef personal equipment (knives, kit)',
    signatureCritical: false,
  },
  { category: 'wrap_up', title: 'Store or return venue equipment', signatureCritical: false },
  { category: 'wrap_up', title: 'Dispose of trash and compost', signatureCritical: false },
  { category: 'wrap_up', title: 'Clean restroom areas', signatureCritical: false },
  {
    category: 'wrap_up',
    title: 'Break down tent or temporary structures',
    signatureCritical: false,
  },
  { category: 'wrap_up', title: 'Store tables and chairs', signatureCritical: false },
  { category: 'wrap_up', title: 'Handle leftover food (who keeps what)', signatureCritical: false },
  {
    category: 'wrap_up',
    title: 'Secure venue (lock sheds, turn off lights, close gates)',
    signatureCritical: false,
  },
  { category: 'wrap_up', title: 'Return borrowed or rented items', signatureCritical: false },
  { category: 'wrap_up', title: 'Thank-you messages to guests', signatureCritical: false },
  { category: 'wrap_up', title: 'Share event photos between co-hosts', signatureCritical: false },
  {
    category: 'wrap_up',
    title: 'Post-event social media (tagging, sharing)',
    signatureCritical: false,
  },
  {
    category: 'wrap_up',
    title: 'Collect reviews and feedback from guests',
    signatureCritical: false,
  },
  { category: 'wrap_up', title: 'Revenue reconciliation and payout', signatureCritical: true },
  {
    category: 'wrap_up',
    title: 'Debrief between co-hosts (what worked, what to change)',
    signatureCritical: false,
  },

  // Category 11: Cancellation & Contingency
  {
    category: 'cancellation',
    title: 'Sunk cost absorption (who eats ingredient costs)',
    signatureCritical: true,
  },
  { category: 'cancellation', title: 'Refund responsibility', signatureCritical: true },
  { category: 'cancellation', title: 'Rescheduling terms', signatureCritical: true },
  {
    category: 'cancellation',
    title: 'Minimum notice period for cancellation',
    signatureCritical: true,
  },
  { category: 'cancellation', title: 'Weather backup plan', signatureCritical: true },
]

// ─── Template Definitions ───────────────────────────────────────────────────

export const AGREEMENT_TEMPLATES: Record<string, AgreementTemplate> = {
  chef_farm: {
    type: 'chef_farm',
    label: 'Chef + Farm/Venue',
    description:
      'Chef cooks, farmer provides venue and ingredients. The primary collaborative dining model.',
    defaultCompensationModel: 'both_sell',
    defaultSplitPercentage: 50,
    items: BASE_ITEMS,
  },
  chef_private_host: {
    type: 'chef_private_host',
    label: 'Chef + Private Host',
    description: 'Someone hiring a chef for their home dinner party.',
    defaultCompensationModel: 'fixed_fee',
    defaultSplitPercentage: 50,
    items: BASE_ITEMS.filter((i) => i.category !== 'marketing'),
  },
  chef_chef: {
    type: 'chef_chef',
    label: 'Chef + Chef',
    description: 'Two chefs collaborating on a multi-course event.',
    defaultCompensationModel: 'both_sell',
    defaultSplitPercentage: 50,
    items: BASE_ITEMS.filter((i) => i.category !== 'venue_setup'),
  },
  chef_restaurant: {
    type: 'chef_restaurant',
    label: 'Chef + Restaurant',
    description: 'Pop-up dinner at an existing restaurant venue.',
    defaultCompensationModel: 'venue_sells_all',
    defaultSplitPercentage: 50,
    items: BASE_ITEMS,
  },
  chef_planner: {
    type: 'chef_planner',
    label: 'Chef + Event Planner',
    description: 'Planner handles logistics and tickets, chef handles food.',
    defaultCompensationModel: 'venue_sells_all',
    defaultSplitPercentage: 50,
    items: BASE_ITEMS,
  },
}

export function getTemplate(type: string): AgreementTemplate {
  return AGREEMENT_TEMPLATES[type] || AGREEMENT_TEMPLATES.chef_farm
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hub/agreement-templates.ts
git commit -m "feat: add cohosting agreement default templates

5 templates (chef+farm, chef+host, chef+chef, chef+restaurant,
chef+planner) with 11 categories and 80+ checklist items.
Category 11: Cancellation & Contingency.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Utility Functions

**Files:**

- Create: `lib/hub/agreement-utils.ts`

- [ ] **Step 1: Create the utilities file**

```typescript
import type { AgreementItem, CohostAgreement, CompensationDetails } from './agreement-types'

// ─── Content Hashing ────────────────────────────────────────────────────────

export async function hashAgreementContent(
  agreement: CohostAgreement,
  items: AgreementItem[]
): Promise<string> {
  const payload = JSON.stringify({
    compensationModel: agreement.compensationModel,
    compensationDetails: agreement.compensationDetails,
    version: agreement.version,
    items: items
      .filter((i) => !i.addedAfterSigning)
      .sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder)
      .map((i) => ({
        category: i.category,
        title: i.title,
        assignment: i.assignment,
        notes: i.notes,
      })),
  })

  const encoder = new TextEncoder()
  const data = encoder.encode(payload)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ─── Amendment Severity ─────────────────────────────────────────────────────

export type AmendmentSeverity = 'critical' | 'non_critical'

export interface FieldChange {
  field: string
  signatureCritical: boolean
}

export function classifyItemChange(
  original: AgreementItem,
  updated: Partial<AgreementItem>
): AmendmentSeverity {
  if (updated.assignment !== undefined && updated.assignment !== original.assignment) {
    return 'critical'
  }
  return 'non_critical'
}

export function classifyCompensationChange(
  original: CohostAgreement,
  updated: { compensationModel?: string; compensationDetails?: CompensationDetails }
): AmendmentSeverity {
  if (updated.compensationModel && updated.compensationModel !== original.compensationModel) {
    return 'critical'
  }
  if (updated.compensationDetails) {
    const orig = original.compensationDetails
    const next = updated.compensationDetails
    if (orig.splitType !== next.splitType) return 'critical'
    if (JSON.stringify(orig.splits) !== JSON.stringify(next.splits)) return 'critical'
    if (JSON.stringify(orig.fixedFees) !== JSON.stringify(next.fixedFees)) return 'critical'
  }
  return 'non_critical'
}

// ─── Compensation Validation ────────────────────────────────────────────────

export function validateSplits(splits: { percentage: number }[]): string | null {
  if (splits.length === 0) return 'At least one host split is required'
  const total = splits.reduce((sum, s) => sum + s.percentage, 0)
  if (Math.abs(total - 100) > 0.01) return `Split percentages must total 100% (currently ${total}%)`
  if (splits.some((s) => s.percentage < 0)) return 'Split percentages cannot be negative'
  return null
}

// ─── Default Compensation Details ───────────────────────────────────────────

export function buildDefaultCompensation(
  hostProfileIds: string[],
  hostLabels: string[],
  defaultSplitPercentage: number
): CompensationDetails {
  const evenSplit = Math.floor(100 / hostProfileIds.length)
  const remainder = 100 - evenSplit * hostProfileIds.length

  return {
    splitType: 'gross',
    splits: hostProfileIds.map((id, i) => ({
      hostProfileId: id,
      label: hostLabels[i] || 'Host',
      percentage: i === 0 ? evenSplit + remainder : evenSplit,
    })),
    fixedFees: [],
    paymentMethod: 'venmo',
    paymentTiming: 'within_48h',
    paymentNotes: '',
    sharedExpenses: [],
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hub/agreement-utils.ts
git commit -m "feat: add agreement utility functions

Content hashing (SHA-256), amendment severity classification,
split validation, and default compensation builder.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Server Actions

**Files:**

- Create: `lib/hub/agreement-actions.ts`

**Important patterns from codebase:**

- Chef-side actions use `requireChef()` from `@/lib/auth/get-user` and return `{ success, error? }`
- DB access via `createServerClient({ admin: true })` from `@/lib/db/server` (Supabase admin client)
- Hub-side actions also exist with profile_token auth, but agreement actions need tenant scoping (chef owns the circle), so use `requireChef()`
- Input validation with Zod schemas
- `revalidatePath` after mutations

- [ ] **Step 1: Create the server actions file**

```typescript
'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { z } from 'zod'
import { getTemplate } from './agreement-templates'
import {
  hashAgreementContent,
  classifyItemChange,
  classifyCompensationChange,
  validateSplits,
  buildDefaultCompensation,
} from './agreement-utils'
import type {
  AgreementWithItems,
  CohostAgreement,
  AgreementItem,
  AgreementSignature,
  AgreementHost,
  CompensationDetails,
  TemplateType,
  CompensationModel,
  ItemAssignment,
} from './agreement-types'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

// ─── Helpers ────────────────────────────────────────────────────────────────

function snakeToCamel(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

async function verifyCircleHost(groupId: string, tenantId: string): Promise<void> {
  const db = createServerClient({ admin: true })
  const { data: group } = await db
    .from('hub_groups')
    .select('id, tenant_id')
    .eq('id', groupId)
    .single()
  if (!group) throw new Error('Circle not found')
  if (group.tenant_id !== tenantId) throw new Error('Not authorized for this circle')
}

// ─── Create Agreement ───────────────────────────────────────────────────────

const CreateAgreementSchema = z.object({
  groupId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  templateType: z.enum([
    'chef_farm',
    'chef_private_host',
    'chef_chef',
    'chef_restaurant',
    'chef_planner',
    'custom',
  ]),
})

export async function createAgreement(
  input: z.infer<typeof CreateAgreementSchema>
): Promise<{ success: boolean; agreementId?: string; error?: string }> {
  const { tenantId } = await requireChef()
  const validated = CreateAgreementSchema.parse(input)
  await verifyCircleHost(validated.groupId, tenantId)

  const db = createServerClient({ admin: true })
  const template = getTemplate(validated.templateType)

  // Get circle hosts for default compensation
  const { data: coHosts } = await db
    .from('circle_co_hosts')
    .select('user_id, role')
    .eq('circle_id', validated.groupId)
    .not('accepted_at', 'is', null)

  // Get host profiles
  const hostUserIds = (coHosts || []).map((h) => h.user_id)
  // Include the circle owner (current chef)
  const { data: chefProfile } = await db
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('auth_user_id', tenantId)
    .single()

  const hostProfiles: { id: string; name: string }[] = []
  if (chefProfile) {
    hostProfiles.push({ id: chefProfile.id, name: chefProfile.display_name || 'Chef' })
  }

  for (const uid of hostUserIds) {
    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id, display_name')
      .eq('auth_user_id', uid)
      .single()
    if (profile) {
      hostProfiles.push({ id: profile.id, name: profile.display_name || 'Partner' })
    }
  }

  const defaultComp = buildDefaultCompensation(
    hostProfiles.map((h) => h.id),
    hostProfiles.map((h) => h.name),
    template.defaultSplitPercentage
  )

  // Insert agreement
  const { data: agreement, error: agreementError } = await db
    .from('hub_cohost_agreements')
    .insert({
      group_id: validated.groupId,
      event_id: validated.eventId || null,
      template_type: validated.templateType,
      compensation_model: template.defaultCompensationModel,
      compensation_details: defaultComp,
      status: 'draft',
      version: 1,
      created_by: tenantId,
    })
    .select('id')
    .single()

  if (agreementError || !agreement) {
    return { success: false, error: agreementError?.message || 'Failed to create agreement' }
  }

  // Insert default checklist items
  const items = template.items.map((item, index) => ({
    agreement_id: agreement.id,
    category: item.category,
    title: item.title,
    assignment: 'unassigned',
    status: 'not_started',
    sort_order: index,
    is_default: true,
    signature_critical: item.signatureCritical,
    added_after_signing: false,
    acknowledged_by: [],
  }))

  const { error: itemsError } = await db.from('hub_agreement_items').insert(items)
  if (itemsError) {
    return { success: false, error: itemsError.message }
  }

  revalidatePath(`/circles/${validated.groupId}`)
  return { success: true, agreementId: agreement.id }
}

// ─── Get Agreement ──────────────────────────────────────────────────────────

export async function getAgreement(
  groupId: string,
  eventId?: string
): Promise<AgreementWithItems | null> {
  const { tenantId } = await requireChef()
  await verifyCircleHost(groupId, tenantId)

  const db = createServerClient({ admin: true })

  // Find the agreement (event-specific first, then circle-level)
  let query = db.from('hub_cohost_agreements').select('*').eq('group_id', groupId)

  if (eventId) {
    query = query.eq('event_id', eventId)
  } else {
    query = query.is('event_id', null)
  }

  const { data: agreements } = await query.order('created_at', { ascending: false }).limit(1)
  if (!agreements || agreements.length === 0) return null

  const agreement = agreements[0]

  // Get items
  const { data: items } = await db
    .from('hub_agreement_items')
    .select('*')
    .eq('agreement_id', agreement.id)
    .order('sort_order', { ascending: true })

  // Get signatures
  const { data: signatures } = await db
    .from('hub_agreement_signatures')
    .select('*')
    .eq('agreement_id', agreement.id)
    .eq('version', agreement.version)

  // Get hosts from circle_co_hosts
  const { data: coHosts } = await db
    .from('circle_co_hosts')
    .select('user_id')
    .eq('circle_id', groupId)
    .not('accepted_at', 'is', null)

  const hostUserIds = [tenantId, ...(coHosts || []).map((h) => h.user_id)]
  const hosts: AgreementHost[] = []

  for (const uid of hostUserIds) {
    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id, display_name')
      .eq('auth_user_id', uid)
      .single()
    if (profile) {
      const sig = (signatures || []).find((s) => s.signer_profile_id === profile.id)
      hosts.push({
        profileId: profile.id,
        displayName: profile.display_name || 'Unknown',
        label: uid === tenantId ? 'Chef' : 'Partner',
        organization: null,
        hasSigned: !!sig,
        signedAt: sig?.signed_at || null,
      })
    }
  }

  return {
    ...(snakeToCamel(agreement) as unknown as CohostAgreement),
    items: (items || []).map((i) => snakeToCamel(i) as unknown as AgreementItem),
    signatures: (signatures || []).map((s) => snakeToCamel(s) as unknown as AgreementSignature),
    hosts,
  }
}

// ─── Update Agreement Item ──────────────────────────────────────────────────

const UpdateItemSchema = z.object({
  itemId: z.string().uuid(),
  assignment: z.enum(['chef', 'venue', 'shared', 'na', 'unassigned']).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['not_started', 'in_progress', 'done']).optional(),
})

export async function updateAgreementItem(
  input: z.infer<typeof UpdateItemSchema>
): Promise<{ success: boolean; signaturesVoided?: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const validated = UpdateItemSchema.parse(input)

  const db = createServerClient({ admin: true })

  // Get the item and its agreement
  const { data: item } = await db
    .from('hub_agreement_items')
    .select('*, hub_cohost_agreements!inner(group_id, status, version)')
    .eq('id', validated.itemId)
    .single()

  if (!item) return { success: false, error: 'Item not found' }

  const agreement = (item as Record<string, unknown>).hub_cohost_agreements as Record<
    string,
    unknown
  >
  await verifyCircleHost(agreement.group_id as string, tenantId)

  // Check amendment severity
  const severity = classifyItemChange(snakeToCamel(item) as unknown as AgreementItem, validated)

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (validated.assignment !== undefined) updates.assignment = validated.assignment
  if (validated.notes !== undefined) updates.notes = validated.notes
  if (validated.status !== undefined) {
    updates.status = validated.status
    if (validated.status === 'done') {
      updates.completed_at = new Date().toISOString()
      updates.completed_by = tenantId
    }
  }

  await db.from('hub_agreement_items').update(updates).eq('id', validated.itemId)

  // If critical change and agreement was signed, void signatures
  let signaturesVoided = false
  if (severity === 'critical' && agreement.status === 'active') {
    await db
      .from('hub_cohost_agreements')
      .update({
        status: 'amended',
        version: (agreement.version as number) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.agreement_id)
    signaturesVoided = true
  }

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true, signaturesVoided }
}

// ─── Add Custom Item ────────────────────────────────────────────────────────

const AddItemSchema = z.object({
  agreementId: z.string().uuid(),
  category: z.enum([
    'tickets_revenue',
    'ingredients',
    'equipment',
    'venue_setup',
    'culinary',
    'beverages',
    'hospitality',
    'marketing',
    'guest_management',
    'wrap_up',
    'cancellation',
  ]),
  title: z.string().min(1).max(200),
})

export async function addCustomItem(
  input: z.infer<typeof AddItemSchema>
): Promise<{ success: boolean; itemId?: string; error?: string }> {
  const { tenantId } = await requireChef()
  const validated = AddItemSchema.parse(input)

  const db = createServerClient({ admin: true })

  const { data: agreement } = await db
    .from('hub_cohost_agreements')
    .select('group_id, status')
    .eq('id', validated.agreementId)
    .single()

  if (!agreement) return { success: false, error: 'Agreement not found' }
  await verifyCircleHost(agreement.group_id, tenantId)

  const isPostSigning = agreement.status === 'active' || agreement.status === 'amended'

  // Get max sort_order in this category
  const { data: maxRow } = await db
    .from('hub_agreement_items')
    .select('sort_order')
    .eq('agreement_id', validated.agreementId)
    .eq('category', validated.category)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxRow?.sort_order || 0) + 1

  const { data: newItem, error } = await db
    .from('hub_agreement_items')
    .insert({
      agreement_id: validated.agreementId,
      category: validated.category,
      title: validated.title,
      assignment: 'unassigned',
      status: 'not_started',
      sort_order: nextOrder,
      is_default: false,
      signature_critical: false,
      added_after_signing: isPostSigning,
      acknowledged_by: [],
    })
    .select('id')
    .single()

  if (error || !newItem) return { success: false, error: error?.message || 'Failed to add item' }

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true, itemId: newItem.id }
}

// ─── Remove Custom Item ─────────────────────────────────────────────────────

export async function removeCustomItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: item } = await db
    .from('hub_agreement_items')
    .select('id, is_default, hub_cohost_agreements!inner(group_id)')
    .eq('id', itemId)
    .single()

  if (!item) return { success: false, error: 'Item not found' }
  if (item.is_default)
    return { success: false, error: 'Cannot remove default items. Set to N/A instead.' }

  const agreement = (item as Record<string, unknown>).hub_cohost_agreements as Record<
    string,
    unknown
  >
  await verifyCircleHost(agreement.group_id as string, tenantId)

  await db.from('hub_agreement_items').delete().eq('id', itemId)

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true }
}

// ─── Update Compensation ────────────────────────────────────────────────────

const UpdateCompensationSchema = z.object({
  agreementId: z.string().uuid(),
  compensationModel: z
    .enum(['venue_sells_all', 'both_sell', 'chef_sells_all', 'fixed_fee'])
    .optional(),
  compensationDetails: z.record(z.unknown()).optional(),
})

export async function updateCompensation(
  input: z.infer<typeof UpdateCompensationSchema>
): Promise<{ success: boolean; signaturesVoided?: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const validated = UpdateCompensationSchema.parse(input)

  const db = createServerClient({ admin: true })

  const { data: agreement } = await db
    .from('hub_cohost_agreements')
    .select('*')
    .eq('id', validated.agreementId)
    .single()

  if (!agreement) return { success: false, error: 'Agreement not found' }
  await verifyCircleHost(agreement.group_id, tenantId)

  // Validate splits if provided
  if (validated.compensationDetails?.splits) {
    const splitError = validateSplits(
      validated.compensationDetails.splits as { percentage: number }[]
    )
    if (splitError) return { success: false, error: splitError }
  }

  const severity = classifyCompensationChange(
    snakeToCamel(agreement) as unknown as CohostAgreement,
    {
      compensationModel: validated.compensationModel,
      compensationDetails: validated.compensationDetails as CompensationDetails | undefined,
    }
  )

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (validated.compensationModel) updates.compensation_model = validated.compensationModel
  if (validated.compensationDetails) updates.compensation_details = validated.compensationDetails

  let signaturesVoided = false
  if (severity === 'critical' && agreement.status === 'active') {
    updates.status = 'amended'
    updates.version = agreement.version + 1
    signaturesVoided = true
  }

  await db.from('hub_cohost_agreements').update(updates).eq('id', validated.agreementId)

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true, signaturesVoided }
}

// ─── Sign Agreement ─────────────────────────────────────────────────────────

export async function signAgreement(
  agreementId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: agreement } = await db
    .from('hub_cohost_agreements')
    .select('*')
    .eq('id', agreementId)
    .single()

  if (!agreement) return { success: false, error: 'Agreement not found' }
  await verifyCircleHost(agreement.group_id, tenantId)

  // Get signer's profile
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('auth_user_id', tenantId)
    .single()

  if (!profile) return { success: false, error: 'Profile not found' }

  // Check for unassigned items
  const { data: unassigned } = await db
    .from('hub_agreement_items')
    .select('id')
    .eq('agreement_id', agreementId)
    .eq('assignment', 'unassigned')
    .limit(1)

  if (unassigned && unassigned.length > 0) {
    return { success: false, error: 'All items must be assigned before signing' }
  }

  // Get items for content hash
  const { data: items } = await db
    .from('hub_agreement_items')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('sort_order')

  const contentHash = await hashAgreementContent(
    snakeToCamel(agreement) as unknown as CohostAgreement,
    (items || []).map((i) => snakeToCamel(i) as unknown as AgreementItem)
  )

  // Get request metadata
  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for') || headerList.get('x-real-ip') || 'unknown'
  const userAgent = headerList.get('user-agent') || 'unknown'

  // Determine signer role
  const isOwner = agreement.created_by === tenantId
  const signerRole = isOwner ? 'chef' : 'partner'

  const { error: sigError } = await db.from('hub_agreement_signatures').upsert(
    {
      agreement_id: agreementId,
      signer_profile_id: profile.id,
      signer_name: profile.display_name || 'Unknown',
      signer_role: signerRole,
      content_hash: contentHash,
      ip_address: ip,
      user_agent: userAgent,
      version: agreement.version,
      signed_at: new Date().toISOString(),
    },
    {
      onConflict: 'agreement_id,signer_profile_id,version',
    }
  )

  if (sigError) return { success: false, error: sigError.message }

  // Check if all hosts have signed
  const { data: coHosts } = await db
    .from('circle_co_hosts')
    .select('user_id')
    .eq('circle_id', agreement.group_id)
    .not('accepted_at', 'is', null)

  const allHostUserIds = [agreement.created_by, ...(coHosts || []).map((h) => h.user_id)]

  // Get all host profile IDs
  const hostProfileIds: string[] = []
  for (const uid of allHostUserIds) {
    const { data: p } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('auth_user_id', uid)
      .single()
    if (p) hostProfileIds.push(p.id)
  }

  const { data: allSigs } = await db
    .from('hub_agreement_signatures')
    .select('signer_profile_id')
    .eq('agreement_id', agreementId)
    .eq('version', agreement.version)

  const signedIds = new Set((allSigs || []).map((s) => s.signer_profile_id))
  const allSigned = hostProfileIds.every((id) => signedIds.has(id))

  if (allSigned) {
    await db
      .from('hub_cohost_agreements')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', agreementId)
  } else if (agreement.status === 'draft' || agreement.status === 'amended') {
    await db
      .from('hub_cohost_agreements')
      .update({ status: 'pending_signatures', updated_at: new Date().toISOString() })
      .eq('id', agreementId)
  }

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true }
}

// ─── Void Agreement ─────────────────────────────────────────────────────────

export async function voidAgreement(
  agreementId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: agreement } = await db
    .from('hub_cohost_agreements')
    .select('group_id, created_by')
    .eq('id', agreementId)
    .single()

  if (!agreement) return { success: false, error: 'Agreement not found' }
  if (agreement.created_by !== tenantId) {
    return { success: false, error: 'Only the agreement creator can void it' }
  }

  await db
    .from('hub_cohost_agreements')
    .update({ status: 'voided', updated_at: new Date().toISOString() })
    .eq('id', agreementId)

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true }
}

// ─── Complete Agreement Item ────────────────────────────────────────────────

export async function completeAgreementItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: item } = await db
    .from('hub_agreement_items')
    .select('id, hub_cohost_agreements!inner(group_id)')
    .eq('id', itemId)
    .single()

  if (!item) return { success: false, error: 'Item not found' }

  const agreement = (item as Record<string, unknown>).hub_cohost_agreements as Record<
    string,
    unknown
  >
  await verifyCircleHost(agreement.group_id as string, tenantId)

  await db
    .from('hub_agreement_items')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      completed_by: tenantId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true }
}

// ─── Acknowledge Post-Signing Item ──────────────────────────────────────────

export async function acknowledgePostSigningItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: item } = await db
    .from('hub_agreement_items')
    .select('id, acknowledged_by, added_after_signing, hub_cohost_agreements!inner(group_id)')
    .eq('id', itemId)
    .single()

  if (!item) return { success: false, error: 'Item not found' }
  if (!item.added_after_signing)
    return { success: false, error: 'Item was not added after signing' }

  const agreement = (item as Record<string, unknown>).hub_cohost_agreements as Record<
    string,
    unknown
  >
  await verifyCircleHost(agreement.group_id as string, tenantId)

  // Get profile ID
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('auth_user_id', tenantId)
    .single()

  if (!profile) return { success: false, error: 'Profile not found' }

  const currentAcks = (item.acknowledged_by || []) as string[]
  if (currentAcks.includes(profile.id)) return { success: true }

  await db
    .from('hub_agreement_items')
    .update({
      acknowledged_by: [...currentAcks, profile.id],
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true }
}

// ─── Carry Forward Agreement ────────────────────────────────────────────────

export async function carryForwardAgreement(
  sourceAgreementId: string,
  newGroupId: string,
  newEventId?: string
): Promise<{ success: boolean; agreementId?: string; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  // Get source agreement with items
  const { data: source } = await db
    .from('hub_cohost_agreements')
    .select('*')
    .eq('id', sourceAgreementId)
    .single()

  if (!source) return { success: false, error: 'Source agreement not found' }
  await verifyCircleHost(newGroupId, tenantId)

  // Create new agreement inheriting from source
  const { data: newAgreement, error: createError } = await db
    .from('hub_cohost_agreements')
    .insert({
      group_id: newGroupId,
      event_id: newEventId || null,
      template_type: source.template_type,
      compensation_model: source.compensation_model,
      compensation_details: source.compensation_details,
      status: 'draft',
      version: 1,
      created_by: tenantId,
      inherited_from_agreement_id: sourceAgreementId,
    })
    .select('id')
    .single()

  if (createError || !newAgreement) {
    return { success: false, error: createError?.message || 'Failed to create agreement' }
  }

  // Copy items from source (only defaults + custom items, reset status)
  const { data: sourceItems } = await db
    .from('hub_agreement_items')
    .select('*')
    .eq('agreement_id', sourceAgreementId)
    .order('sort_order')

  if (sourceItems && sourceItems.length > 0) {
    const copiedItems = sourceItems.map((item) => ({
      agreement_id: newAgreement.id,
      category: item.category,
      title: item.title,
      assignment: item.assignment,
      notes: item.notes,
      status: 'not_started',
      sort_order: item.sort_order,
      is_default: item.is_default,
      signature_critical: item.signature_critical,
      added_after_signing: false,
      acknowledged_by: [],
    }))

    await db.from('hub_agreement_items').insert(copiedItems)
  }

  revalidatePath(`/circles/${newGroupId}`)
  return { success: true, agreementId: newAgreement.id }
}

// ─── Check Agreement Gate (for ticket sales) ────────────────────────────────

export async function checkAgreementGate(
  groupId: string,
  eventId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  // Check if this circle has co-hosts
  const { data: coHosts } = await db
    .from('circle_co_hosts')
    .select('id')
    .eq('circle_id', groupId)
    .not('accepted_at', 'is', null)
    .limit(1)

  // No co-hosts = no agreement needed
  if (!coHosts || coHosts.length === 0) return { allowed: true }

  // Has co-hosts, check for active agreement
  let query = db.from('hub_cohost_agreements').select('status').eq('group_id', groupId)

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data: agreements } = await query.order('created_at', { ascending: false }).limit(1)

  if (!agreements || agreements.length === 0) {
    return {
      allowed: false,
      reason:
        'A collaboration agreement is required before tickets can go live. All co-hosts must review and sign.',
    }
  }

  if (agreements[0].status !== 'active') {
    return {
      allowed: false,
      reason: 'All co-hosts must sign the collaboration agreement before tickets go live.',
    }
  }

  return { allowed: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hub/agreement-actions.ts
git commit -m "feat: add cohosting agreement server actions

CRUD, signing with content hash, amendment severity tiering,
carry-forward for recurring events, ticket-sale gate check.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Completion Contract Integration

**Files:**

- Modify: `lib/completion/types.ts:8` (add `'collaboration'` to RequirementCategory)
- Modify: `lib/completion/evaluators/event.ts` (add agreement gate)

- [ ] **Step 1: Add 'collaboration' to RequirementCategory**

In `lib/completion/types.ts`, find:

```typescript
export type RequirementCategory =
  | 'safety'
  | 'financial'
  | 'culinary'
  | 'logistics'
  | 'communication'
  | 'profile'
  | 'cannabis'
```

Replace with:

```typescript
export type RequirementCategory =
  | 'safety'
  | 'financial'
  | 'culinary'
  | 'logistics'
  | 'communication'
  | 'profile'
  | 'cannabis'
  | 'collaboration'
```

- [ ] **Step 2: Add agreement gate to event evaluator**

In `lib/completion/evaluators/event.ts`, add import at top:

```typescript
import { createServerClient } from '@/lib/db/server'
```

Before `const children: CompletionResult[] = []` (around line 419), add:

```typescript
// Co-hosting agreement gate
let hasCoHosts = false
let agreementActive = false
const adminDb = createServerClient({ admin: true })

const { data: coHostCheck } = await adminDb
  .from('circle_co_hosts')
  .select('id')
  .eq('circle_id', eventId)
  .not('accepted_at', 'is', null)
  .limit(1)

// Only check agreement if event has a linked circle with co-hosts
if (coHostCheck && coHostCheck.length > 0) {
  hasCoHosts = true
  const { data: agreementCheck } = await adminDb
    .from('hub_cohost_agreements')
    .select('status')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .limit(1)
  agreementActive = (agreementCheck && agreementCheck.length > 0) || false
}

if (hasCoHosts) {
  reqs.push({
    key: 'cohost_agreement',
    label: 'Collaboration agreement signed',
    met: agreementActive,
    blocking: true,
    weight: 8,
    category: 'collaboration',
    actionUrl: eventUrl,
    actionLabel: 'Complete agreement',
  })
}
```

Note: The co-host check needs to look up the circle linked to this event, not use eventId directly as circle_id. The builder should find the correct lookup: check `hub_groups` where `event_id = eventId` to get the group_id, then check `circle_co_hosts` where `circle_id = group_id`.

- [ ] **Step 3: Commit**

```bash
git add lib/completion/types.ts lib/completion/evaluators/event.ts
git commit -m "feat: wire agreement gate into completion contract

Co-hosted events require active agreement for completion.
Blocking requirement, 8 weight points, collaboration category.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Agreement Setup Wizard UI

**Files:**

- Create: `components/hub/agreement-setup-wizard.tsx`
- Create: `components/hub/agreement-compensation-card.tsx`
- Create: `components/hub/agreement-checklist-section.tsx`
- Create: `components/hub/agreement-signature-block.tsx`

**UI patterns from codebase:**

- `'use client'` directive
- Tailwind dark theme: `bg-stone-800`, `text-stone-100`, `border-stone-700`, `text-stone-400`
- Props interface defined inline
- `useState` for local state, `useTransition` for server action calls
- Toast for success/error feedback (check if `sonner` or similar is used)

- [ ] **Step 1: Create the compensation card component**

```typescript
'use client'

import { useState } from 'react'
import type {
  CompensationModel,
  CompensationDetails,
  HostSplit,
} from '@/lib/hub/agreement-types'
import { COMPENSATION_MODEL_LABELS } from '@/lib/hub/agreement-types'

interface AgreementCompensationCardProps {
  model: CompensationModel
  details: CompensationDetails
  hosts: { profileId: string; label: string }[]
  onChange: (model: CompensationModel, details: CompensationDetails) => void
  readOnly?: boolean
}

export function AgreementCompensationCard({
  model,
  details,
  hosts,
  onChange,
  readOnly,
}: AgreementCompensationCardProps) {
  const handleModelChange = (newModel: CompensationModel) => {
    onChange(newModel, details)
  }

  const handleSplitChange = (profileId: string, percentage: number) => {
    const newSplits = details.splits.map((s) =>
      s.hostProfileId === profileId ? { ...s, percentage } : s
    )
    onChange(model, { ...details, splits: newSplits })
  }

  const splitTotal = details.splits.reduce((sum, s) => sum + s.percentage, 0)
  const splitError = Math.abs(splitTotal - 100) > 0.01

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-stone-300">Compensation Model</h3>

      {/* Model selector */}
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(COMPENSATION_MODEL_LABELS) as [CompensationModel, string][]).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => !readOnly && handleModelChange(key)}
              disabled={readOnly}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                model === key
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : 'border-stone-700 bg-stone-800/50 text-stone-400 hover:border-stone-600'
              } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {/* Split inputs (for percentage-based models) */}
      {(model === 'both_sell' || model === 'venue_sells_all' || model === 'chef_sells_all') && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-stone-400">Revenue Split</h4>
          {details.splits.map((split) => (
            <div key={split.hostProfileId} className="flex items-center gap-3">
              <span className="min-w-[100px] text-sm text-stone-300">{split.label}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={split.percentage}
                onChange={(e) =>
                  !readOnly && handleSplitChange(split.hostProfileId, Number(e.target.value))
                }
                disabled={readOnly}
                className="w-20 rounded border border-stone-700 bg-stone-800 px-2 py-1 text-right text-sm text-stone-100"
              />
              <span className="text-sm text-stone-400">%</span>
            </div>
          ))}
          {splitError && (
            <p className="text-xs text-red-400">
              Splits must total 100% (currently {splitTotal}%)
            </p>
          )}
        </div>
      )}

      {/* Payment method */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-stone-400">Payment Method</h4>
        <select
          value={details.paymentMethod}
          onChange={(e) =>
            !readOnly &&
            onChange(model, { ...details, paymentMethod: e.target.value as CompensationDetails['paymentMethod'] })
          }
          disabled={readOnly}
          className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100"
        >
          <option value="venmo">Venmo</option>
          <option value="check">Check</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Payment timing */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-stone-400">Payment Timing</h4>
        <select
          value={details.paymentTiming}
          onChange={(e) =>
            !readOnly &&
            onChange(model, { ...details, paymentTiming: e.target.value as CompensationDetails['paymentTiming'] })
          }
          disabled={readOnly}
          className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100"
        >
          <option value="day_of">Day of event</option>
          <option value="within_48h">Within 48 hours</option>
          <option value="within_week">Within one week</option>
          <option value="custom">Custom</option>
        </select>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the checklist section component**

```typescript
'use client'

import { useState } from 'react'
import type {
  AgreementItem,
  ItemCategory,
  ItemAssignment,
} from '@/lib/hub/agreement-types'
import { CATEGORY_LABELS, ASSIGNMENT_LABELS } from '@/lib/hub/agreement-types'

interface AgreementChecklistSectionProps {
  category: ItemCategory
  items: AgreementItem[]
  onAssignmentChange: (itemId: string, assignment: ItemAssignment) => void
  onNotesChange: (itemId: string, notes: string) => void
  onStatusChange?: (itemId: string, status: AgreementItem['status']) => void
  readOnly?: boolean
  showStatus?: boolean
}

const ASSIGNMENT_OPTIONS: ItemAssignment[] = ['chef', 'venue', 'shared', 'na']

export function AgreementChecklistSection({
  category,
  items,
  onAssignmentChange,
  onNotesChange,
  onStatusChange,
  readOnly,
  showStatus,
}: AgreementChecklistSectionProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  const toggleNotes = (itemId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-sm font-semibold text-stone-200">
        {CATEGORY_LABELS[category]}
      </h3>

      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-lg border px-3 py-2 ${
            item.addedAfterSigning
              ? 'border-amber-700/50 bg-amber-900/10'
              : 'border-stone-700/50 bg-stone-800/30'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Status checkbox (execution mode) */}
            {showStatus && onStatusChange && (
              <button
                onClick={() =>
                  !readOnly &&
                  onStatusChange(item.id, item.status === 'done' ? 'not_started' : 'done')
                }
                className={`h-4 w-4 shrink-0 rounded border ${
                  item.status === 'done'
                    ? 'border-green-500 bg-green-500'
                    : 'border-stone-600 bg-stone-800'
                }`}
              />
            )}

            {/* Title */}
            <span
              className={`flex-1 text-sm ${
                item.status === 'done' ? 'text-stone-500 line-through' : 'text-stone-200'
              }`}
            >
              {item.title}
              {item.addedAfterSigning && (
                <span className="ml-2 text-xs text-amber-400">(added after signing)</span>
              )}
            </span>

            {/* Assignment toggle */}
            <div className="flex gap-1">
              {ASSIGNMENT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => !readOnly && onAssignmentChange(item.id, opt)}
                  disabled={readOnly}
                  className={`rounded px-2 py-0.5 text-xs transition-colors ${
                    item.assignment === opt
                      ? opt === 'chef'
                        ? 'bg-blue-500/20 text-blue-300'
                        : opt === 'venue'
                          ? 'bg-green-500/20 text-green-300'
                          : opt === 'shared'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-stone-600/30 text-stone-500'
                      : 'text-stone-500 hover:bg-stone-700/50'
                  } ${readOnly ? 'cursor-not-allowed' : ''}`}
                >
                  {ASSIGNMENT_LABELS[opt]}
                </button>
              ))}
            </div>

            {/* Notes toggle */}
            <button
              onClick={() => toggleNotes(item.id)}
              className="text-stone-500 hover:text-stone-300"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </div>

          {/* Expandable notes */}
          {expandedNotes.has(item.id) && (
            <textarea
              value={item.notes || ''}
              onChange={(e) => !readOnly && onNotesChange(item.id, e.target.value)}
              placeholder="Add notes (equipment details, specific instructions, etc.)"
              disabled={readOnly}
              className="mt-2 w-full rounded border border-stone-700 bg-stone-900/50 px-2 py-1.5 text-xs text-stone-300 placeholder-stone-600"
              rows={2}
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create the signature block component**

```typescript
'use client'

import { useState, useTransition } from 'react'
import type { AgreementHost } from '@/lib/hub/agreement-types'
import { signAgreement } from '@/lib/hub/agreement-actions'

interface AgreementSignatureBlockProps {
  agreementId: string
  hosts: AgreementHost[]
  currentProfileId: string
  allItemsAssigned: boolean
}

export function AgreementSignatureBlock({
  agreementId,
  hosts,
  currentProfileId,
  allItemsAssigned,
}: AgreementSignatureBlockProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const currentHost = hosts.find((h) => h.profileId === currentProfileId)
  const hasCurrentSigned = currentHost?.hasSigned || false
  const allSigned = hosts.every((h) => h.hasSigned)

  const handleSign = () => {
    setError(null)
    startTransition(async () => {
      const result = await signAgreement(agreementId)
      if (!result.success) setError(result.error || 'Failed to sign')
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <h3 className="text-sm font-semibold text-stone-200">Signatures</h3>

      {/* Signature status per host */}
      <div className="space-y-2">
        {hosts.map((host) => (
          <div key={host.profileId} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  host.hasSigned ? 'bg-green-500' : 'bg-stone-600'
                }`}
              />
              <span className="text-sm text-stone-300">
                {host.displayName}
                <span className="ml-1 text-xs text-stone-500">({host.label})</span>
              </span>
            </div>
            {host.hasSigned && host.signedAt && (
              <span className="text-xs text-stone-500">
                {new Date(host.signedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Sign button */}
      {!hasCurrentSigned && (
        <div className="space-y-2">
          {!allItemsAssigned && (
            <p className="text-xs text-amber-400">
              All items must be assigned before signing.
            </p>
          )}
          <button
            onClick={handleSign}
            disabled={isPending || !allItemsAssigned}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Signing...' : 'I agree to this collaboration agreement'}
          </button>
          <p className="text-center text-xs text-stone-500">
            By signing, you acknowledge and agree to the responsibilities and compensation
            outlined above.
          </p>
        </div>
      )}

      {hasCurrentSigned && !allSigned && (
        <p className="text-center text-xs text-stone-400">
          Waiting for other co-hosts to sign.
        </p>
      )}

      {allSigned && (
        <div className="rounded-lg bg-green-900/20 p-3 text-center">
          <p className="text-sm font-medium text-green-400">
            Agreement active. All parties have signed.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Create the setup wizard component**

```typescript
'use client'

import { useState, useTransition } from 'react'
import type {
  CompensationModel,
  CompensationDetails,
  TemplateType,
  AgreementItem,
  ItemAssignment,
  ItemCategory,
} from '@/lib/hub/agreement-types'
import { CATEGORY_LABELS } from '@/lib/hub/agreement-types'
import { AGREEMENT_TEMPLATES } from '@/lib/hub/agreement-templates'
import { AgreementCompensationCard } from './agreement-compensation-card'
import { AgreementChecklistSection } from './agreement-checklist-section'
import { AgreementSignatureBlock } from './agreement-signature-block'
import {
  createAgreement,
  updateAgreementItem,
  updateCompensation,
} from '@/lib/hub/agreement-actions'

interface AgreementSetupWizardProps {
  groupId: string
  eventId?: string
  hosts: { profileId: string; label: string }[]
  currentProfileId: string
  onComplete: () => void
}

type WizardStep = 'template' | 'compensation' | 'checklist' | 'sign'
const STEPS: WizardStep[] = ['template', 'compensation', 'checklist', 'sign']
const STEP_LABELS: Record<WizardStep, string> = {
  template: 'Type',
  compensation: 'Compensation',
  checklist: 'Responsibilities',
  sign: 'Review & Sign',
}

export function AgreementSetupWizard({
  groupId,
  eventId,
  hosts,
  currentProfileId,
  onComplete,
}: AgreementSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('chef_farm')
  const [agreementId, setAgreementId] = useState<string | null>(null)
  const [compensationModel, setCompensationModel] = useState<CompensationModel>('both_sell')
  const [compensationDetails, setCompensationDetails] = useState<CompensationDetails | null>(null)
  const [items, setItems] = useState<AgreementItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const stepIndex = STEPS.indexOf(step)

  const handleNext = () => {
    if (step === 'template') {
      startTransition(async () => {
        const result = await createAgreement({
          groupId,
          eventId,
          templateType: selectedTemplate,
        })
        if (result.success && result.agreementId) {
          setAgreementId(result.agreementId)
          setStep('compensation')
        } else {
          setError(result.error || 'Failed to create agreement')
        }
      })
    } else if (step === 'compensation') {
      if (agreementId && compensationDetails) {
        startTransition(async () => {
          await updateCompensation({
            agreementId: agreementId!,
            compensationModel,
            compensationDetails: compensationDetails as unknown as Record<string, unknown>,
          })
          setStep('checklist')
        })
      }
    } else if (step === 'checklist') {
      setStep('sign')
    }
  }

  const handleBack = () => {
    const prevIndex = stepIndex - 1
    if (prevIndex >= 0) setStep(STEPS[prevIndex])
  }

  const handleAssignmentChange = (itemId: string, assignment: ItemAssignment) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, assignment } : i)))
    startTransition(async () => {
      await updateAgreementItem({ itemId, assignment })
    })
  }

  const handleNotesChange = (itemId: string, notes: string) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, notes } : i)))
  }

  const categories = [...new Set(items.map((i) => i.category))] as ItemCategory[]
  const allAssigned = items.every((i) => i.assignment !== 'unassigned')

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded-full py-1 text-center text-xs font-medium ${
              i <= stepIndex
                ? 'bg-amber-600/20 text-amber-300'
                : 'bg-stone-800 text-stone-500'
            }`}
          >
            {STEP_LABELS[s]}
          </div>
        ))}
      </div>

      {/* Step 1: Template */}
      {step === 'template' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Collaboration Type</h2>
          <p className="text-sm text-stone-400">
            Choose the type that best describes this collaboration.
          </p>
          {Object.values(AGREEMENT_TEMPLATES).map((tmpl) => (
            <button
              key={tmpl.type}
              onClick={() => setSelectedTemplate(tmpl.type)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selectedTemplate === tmpl.type
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
              }`}
            >
              <p className="text-sm font-medium text-stone-200">{tmpl.label}</p>
              <p className="mt-0.5 text-xs text-stone-400">{tmpl.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Compensation */}
      {step === 'compensation' && compensationDetails && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-stone-100">Compensation</h2>
          <p className="text-sm text-stone-400">
            Configure how revenue will be split between all co-hosts.
          </p>
          <AgreementCompensationCard
            model={compensationModel}
            details={compensationDetails}
            hosts={hosts}
            onChange={(m, d) => {
              setCompensationModel(m)
              setCompensationDetails(d)
            }}
          />
        </div>
      )}

      {/* Step 3: Checklist */}
      {step === 'checklist' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-stone-100">Responsibilities</h2>
          <p className="text-sm text-stone-400">
            Assign each item to Chef, Venue, Shared, or N/A. All items must be assigned
            before signing.
          </p>
          {categories.map((cat) => (
            <AgreementChecklistSection
              key={cat}
              category={cat}
              items={items.filter((i) => i.category === cat)}
              onAssignmentChange={handleAssignmentChange}
              onNotesChange={handleNotesChange}
            />
          ))}
        </div>
      )}

      {/* Step 4: Review & Sign */}
      {step === 'sign' && agreementId && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-stone-100">Review & Sign</h2>
          <p className="text-sm text-stone-400">
            Review the agreement below. Both parties must sign before tickets can go live.
          </p>

          {/* Compensation summary */}
          <div className="rounded-lg border border-stone-700 bg-stone-800/30 p-3">
            <h4 className="text-xs font-medium text-stone-400">Compensation Summary</h4>
            {compensationDetails && compensationDetails.splits.map((s) => (
              <p key={s.hostProfileId} className="text-sm text-stone-200">
                {s.label}: {s.percentage}%
              </p>
            ))}
          </div>

          {/* Checklist summary */}
          <div className="space-y-2">
            {categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat)
              return (
                <div key={cat} className="rounded-lg border border-stone-700/50 bg-stone-800/20 p-2">
                  <p className="text-xs font-medium text-stone-300">{CATEGORY_LABELS[cat]}</p>
                  <p className="text-xs text-stone-500">
                    {catItems.length} items assigned
                  </p>
                </div>
              )
            })}
          </div>

          {/* Signature block */}
          <AgreementSignatureBlock
            agreementId={agreementId}
            hosts={hosts.map((h) => ({
              ...h,
              displayName: h.label,
              organization: null,
              hasSigned: false,
              signedAt: null,
            }))}
            currentProfileId={currentProfileId}
            allItemsAssigned={allAssigned}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        {stepIndex > 0 ? (
          <button
            onClick={handleBack}
            className="rounded-lg border border-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        {step !== 'sign' && (
          <button
            onClick={handleNext}
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Continue'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/hub/agreement-setup-wizard.tsx components/hub/agreement-compensation-card.tsx components/hub/agreement-checklist-section.tsx components/hub/agreement-signature-block.tsx
git commit -m "feat: add cohosting agreement UI components

4-step setup wizard (template, compensation, checklist, sign),
compensation card with N-party splits, checklist sections with
assignment toggles and notes, signature block with status.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Agreement Tab and Ticket Gate

**Files:**

- Create: `components/hub/agreement-tab.tsx`
- Create: `components/hub/agreement-ticket-gate.tsx`
- Create: `components/hub/agreement-confirm-adjust.tsx`

- [ ] **Step 1: Create the agreement tab component**

```typescript
'use client'

import { useState, useEffect, useTransition } from 'react'
import type {
  AgreementWithItems,
  ItemCategory,
  ItemAssignment,
} from '@/lib/hub/agreement-types'
import { CATEGORY_LABELS } from '@/lib/hub/agreement-types'
import { AgreementCompensationCard } from './agreement-compensation-card'
import { AgreementChecklistSection } from './agreement-checklist-section'
import { AgreementSignatureBlock } from './agreement-signature-block'
import { AgreementSetupWizard } from './agreement-setup-wizard'
import {
  getAgreement,
  updateAgreementItem,
  completeAgreementItem,
  addCustomItem,
} from '@/lib/hub/agreement-actions'

interface AgreementTabProps {
  groupId: string
  eventId?: string
  hosts: { profileId: string; label: string }[]
  currentProfileId: string
  isHost: boolean
}

export function AgreementTab({
  groupId,
  eventId,
  hosts,
  currentProfileId,
  isHost,
}: AgreementTabProps) {
  const [agreement, setAgreement] = useState<AgreementWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    loadAgreement()
  }, [groupId, eventId])

  const loadAgreement = async () => {
    setLoading(true)
    const data = await getAgreement(groupId, eventId)
    setAgreement(data)
    setLoading(false)
    if (!data && isHost) setShowWizard(true)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-6 w-48 rounded bg-stone-800" />
        <div className="h-32 rounded bg-stone-800/50" />
        <div className="h-32 rounded bg-stone-800/50" />
      </div>
    )
  }

  if (showWizard || !agreement) {
    if (!isHost) {
      return (
        <div className="p-4 text-center text-sm text-stone-400">
          No collaboration agreement has been created yet.
        </div>
      )
    }
    return (
      <AgreementSetupWizard
        groupId={groupId}
        eventId={eventId}
        hosts={hosts}
        currentProfileId={currentProfileId}
        onComplete={() => {
          setShowWizard(false)
          loadAgreement()
        }}
      />
    )
  }

  const categories = [...new Set(agreement.items.map((i) => i.category))] as ItemCategory[]
  const completedCount = agreement.items.filter((i) => i.status === 'done').length
  const totalCount = agreement.items.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleAssignmentChange = (itemId: string, assignment: ItemAssignment) => {
    setAgreement((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) => (i.id === itemId ? { ...i, assignment } : i)),
          }
        : null
    )
    startTransition(async () => {
      await updateAgreementItem({ itemId, assignment })
    })
  }

  const handleNotesChange = (itemId: string, notes: string) => {
    setAgreement((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, notes } : i)) }
        : null
    )
    startTransition(async () => {
      await updateAgreementItem({ itemId, notes })
    })
  }

  const handleStatusChange = (itemId: string, status: 'not_started' | 'in_progress' | 'done') => {
    setAgreement((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, status } : i)) }
        : null
    )
    startTransition(async () => {
      if (status === 'done') {
        await completeAgreementItem(itemId)
      } else {
        await updateAgreementItem({ itemId, status })
      }
    })
  }

  const isReadOnly = !isHost
  const isActive = agreement.status === 'active'

  const statusBadge: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'text-stone-400 bg-stone-700/50' },
    pending_signatures: { label: 'Pending Signatures', color: 'text-amber-400 bg-amber-900/30' },
    active: { label: 'Active', color: 'text-green-400 bg-green-900/30' },
    amended: { label: 'Amended (re-sign needed)', color: 'text-red-400 bg-red-900/30' },
    voided: { label: 'Voided', color: 'text-red-400 bg-red-900/30' },
  }

  const badge = statusBadge[agreement.status] || statusBadge.draft

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-100">Collaboration Agreement</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Progress bar (active agreements) */}
      {isActive && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-400">
            <span>Progress</span>
            <span>{completedCount}/{totalCount} ({progressPct}%)</span>
          </div>
          <div className="h-1.5 rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Compensation summary */}
      <AgreementCompensationCard
        model={agreement.compensationModel}
        details={agreement.compensationDetails}
        hosts={hosts}
        onChange={() => {}}
        readOnly={isActive || isReadOnly}
      />

      {/* Checklist by category */}
      {categories.map((cat) => (
        <AgreementChecklistSection
          key={cat}
          category={cat}
          items={agreement.items.filter((i) => i.category === cat)}
          onAssignmentChange={handleAssignmentChange}
          onNotesChange={handleNotesChange}
          onStatusChange={isActive ? handleStatusChange : undefined}
          readOnly={isReadOnly}
          showStatus={isActive}
        />
      ))}

      {/* Signature block */}
      <AgreementSignatureBlock
        agreementId={agreement.id}
        hosts={agreement.hosts}
        currentProfileId={currentProfileId}
        allItemsAssigned={agreement.items.every((i) => i.assignment !== 'unassigned')}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create the ticket gate banner component**

```typescript
'use client'

interface AgreementTicketGateProps {
  groupId: string
  onSetupAgreement: () => void
}

export function AgreementTicketGate({ groupId, onSetupAgreement }: AgreementTicketGateProps) {
  return (
    <div className="rounded-lg border border-amber-700/50 bg-amber-900/10 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-amber-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-300">
            Collaboration agreement required
          </p>
          <p className="mt-1 text-xs text-stone-400">
            All co-hosts must sign the collaboration agreement before tickets can go live.
          </p>
          <button
            onClick={onSetupAgreement}
            className="mt-3 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
          >
            Set up agreement
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the carry-forward confirm/adjust component**

```typescript
'use client'

import { useState, useTransition } from 'react'
import type { AgreementWithItems, ItemCategory } from '@/lib/hub/agreement-types'
import { CATEGORY_LABELS } from '@/lib/hub/agreement-types'

interface AgreementConfirmAdjustProps {
  previousAgreement: AgreementWithItems
  newGroupId: string
  newEventId?: string
  onConfirm: () => void
  onAdjust: () => void
}

export function AgreementConfirmAdjust({
  previousAgreement,
  newGroupId,
  newEventId,
  onConfirm,
  onAdjust,
}: AgreementConfirmAdjustProps) {
  const categories = [...new Set(previousAgreement.items.map((i) => i.category))] as ItemCategory[]

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-100">Carry Forward Agreement</h2>
        <p className="mt-1 text-sm text-stone-400">
          This event inherits the agreement from your previous collaboration. Review the
          highlights and confirm or adjust.
        </p>
      </div>

      {/* Compensation summary */}
      <div className="rounded-lg border border-stone-700 bg-stone-800/30 p-3">
        <h4 className="text-xs font-medium text-stone-400">Compensation</h4>
        {previousAgreement.compensationDetails.splits.map((s) => (
          <p key={s.hostProfileId} className="text-sm text-stone-200">
            {s.label}: {s.percentage}%
          </p>
        ))}
        <p className="mt-1 text-xs text-stone-500">
          Payment: {previousAgreement.compensationDetails.paymentMethod},{' '}
          {previousAgreement.compensationDetails.paymentTiming}
        </p>
      </div>

      {/* Category summary */}
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-stone-400">Responsibilities</h4>
        {categories.map((cat) => {
          const catItems = previousAgreement.items.filter((i) => i.category === cat)
          const chefCount = catItems.filter((i) => i.assignment === 'chef').length
          const venueCount = catItems.filter((i) => i.assignment === 'venue').length
          const sharedCount = catItems.filter((i) => i.assignment === 'shared').length
          return (
            <div
              key={cat}
              className="flex items-center justify-between rounded border border-stone-700/50 bg-stone-800/20 px-3 py-1.5"
            >
              <span className="text-xs text-stone-300">{CATEGORY_LABELS[cat]}</span>
              <div className="flex gap-2 text-xs text-stone-500">
                {chefCount > 0 && <span className="text-blue-400">{chefCount} chef</span>}
                {venueCount > 0 && <span className="text-green-400">{venueCount} venue</span>}
                {sharedCount > 0 && <span className="text-purple-400">{sharedCount} shared</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500"
        >
          Looks good, carry forward
        </button>
        <button
          onClick={onAdjust}
          className="flex-1 rounded-lg border border-stone-600 px-4 py-2.5 text-sm font-medium text-stone-300 hover:bg-stone-800"
        >
          Edit before signing
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/hub/agreement-tab.tsx components/hub/agreement-ticket-gate.tsx components/hub/agreement-confirm-adjust.tsx
git commit -m "feat: add agreement tab, ticket gate, and carry-forward UI

Agreement tab shows full checklist with progress tracking.
Ticket gate blocks sales until agreement is signed.
Carry-forward screen for recurring event agreements.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Lifecycle Hooks

**Files:**

- Create: `lib/hub/agreement-lifecycle-hooks.ts`

- [ ] **Step 1: Create the lifecycle hooks file**

Follow the pattern from `lib/hub/circle-lifecycle-hooks.ts`: internal-only hooks (no 'use server'), non-blocking, post system messages to the circle.

```typescript
import { createServerClient } from '@/lib/db/server'
import { getChefHubProfileId } from './circle-lookup'

export async function postAgreementCreatedToCircle(input: {
  groupId: string
  templateLabel: string
  tenantId: string
}): Promise<void> {
  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const db = createServerClient({ admin: true })
  await db.from('hub_messages').insert({
    group_id: input.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body: `Collaboration agreement created (${input.templateLabel}). All co-hosts will review and sign before tickets go live.`,
    metadata: {
      system_event_type: 'agreement_created',
    },
  })
}

export async function postAgreementSignedToCircle(input: {
  groupId: string
  signerName: string
  allSigned: boolean
  tenantId: string
}): Promise<void> {
  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const db = createServerClient({ admin: true })
  const body = input.allSigned
    ? `All co-hosts have signed the collaboration agreement. Tickets can now go live!`
    : `${input.signerName} signed the collaboration agreement. Waiting for remaining signatures.`

  await db.from('hub_messages').insert({
    group_id: input.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body,
    metadata: {
      system_event_type: input.allSigned ? 'agreement_active' : 'agreement_signed',
    },
  })
}

export async function postAgreementAmendedToCircle(input: {
  groupId: string
  changeDescription: string
  tenantId: string
}): Promise<void> {
  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const db = createServerClient({ admin: true })
  await db.from('hub_messages').insert({
    group_id: input.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body: `Collaboration agreement updated: ${input.changeDescription}. Re-signature required from all co-hosts.`,
    metadata: {
      system_event_type: 'agreement_amended',
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hub/agreement-lifecycle-hooks.ts
git commit -m "feat: add agreement lifecycle hooks

System messages for agreement created, signed, and amended
events posted to the dinner circle feed.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Wiring Tasks (Post-Build)

These tasks wire the new components into the existing circle UI. They require reading the current circle tab/page structure to find exact insertion points.

### Task 10: Wire Agreement Tab into Circle View

- [ ] **Step 1: Find the circle tabs component**

Read `components/hub/circles-page-tabs.tsx` to identify how tabs are registered and where to add the "Agreement" tab. The agreement tab should appear when the circle has co-hosts (`circle_co_hosts` rows exist for this group_id).

- [ ] **Step 2: Add the Agreement tab**

Import `AgreementTab` from `./agreement-tab` and add it to the tab list conditionally (only when co-hosts exist). Tab label: "Agreement". Icon: handshake or document icon.

- [ ] **Step 3: Commit**

```bash
git add components/hub/circles-page-tabs.tsx
git commit -m "feat: wire agreement tab into circle view

Agreement tab appears when circle has co-hosts. Shows full
agreement lifecycle: setup wizard or active agreement view.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 11: Wire Lifecycle Hooks into Agreement Actions

- [ ] **Step 1: Import and call lifecycle hooks**

In `lib/hub/agreement-actions.ts`:

- After `createAgreement` succeeds, call `postAgreementCreatedToCircle` (wrapped in try/catch)
- After `signAgreement` succeeds, call `postAgreementSignedToCircle` (wrapped in try/catch)
- After amendment triggers in `updateAgreementItem` or `updateCompensation`, call `postAgreementAmendedToCircle` (wrapped in try/catch)

- [ ] **Step 2: Commit**

```bash
git add lib/hub/agreement-actions.ts
git commit -m "feat: wire lifecycle hooks into agreement actions

Circle feed shows system messages on agreement create, sign,
and amend events.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Post-Build Verification

- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] Migration SQL is syntactically valid
- [ ] All server actions have: auth gate, tenant scoping, input validation, error propagation
- [ ] No `@ts-nocheck` files created
- [ ] No em dashes in any file
- [ ] Run `/wire-audit` before marking done
