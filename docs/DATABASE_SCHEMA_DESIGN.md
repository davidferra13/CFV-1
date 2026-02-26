# ChefFlow Database Schema Design

**Version 1.0 — February 15, 2026**
**Based On:** [STATISTICS_INVENTORY.md](./STATISTICS_INVENTORY.md)

This document defines the complete database schema for ChefFlow, mapping every measurement requirement to concrete database structures.

---

## Design Principles

1. **Measurement-First Design** - Every table, column, view, and function exists to support specific metrics from the statistics inventory
2. **Ledger Immutability** - Financial records are append-only, enforced by triggers
3. **Multi-Tenant Isolation** - Every table scoped by `chef_id`, enforced by RLS
4. **Audit Trail** - All state transitions logged with timestamp and actor
5. **Progressive Timestamps** - Document readiness gates tracked explicitly
6. **JSONB for Arrays, Tables for Relationships** - Use JSONB for simple lists, normalized tables for queryable relationships
7. **Computed Fields via Views** - Expensive calculations pre-computed in materialized views
8. **Timezone Awareness** - All timestamps in `timestamptz`

---

## Core Tables

### 1. `chefs` (Tenant Root)

**Purpose:** Multi-tenant isolation root. Each chef is a separate tenant.

```sql
CREATE TABLE chefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  chef_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,

  -- Business Profile
  bio TEXT,
  specialties TEXT[], -- e.g., ['Italian', 'French', 'Molecular']
  service_radius_miles INTEGER, -- for inquiry filtering
  minimum_guest_count INTEGER, -- for inquiry filtering
  minimum_event_price_cents INTEGER, -- for inquiry filtering

  -- Preferences
  default_grocery_store TEXT,
  default_liquor_store TEXT,
  preferred_cash_back_card TEXT, -- e.g., "Amex Blue Cash 4%"

  -- Business Metrics (cached from views)
  lifetime_revenue_cents INTEGER DEFAULT 0,
  total_events_completed INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chefs_user_id ON chefs(user_id);
CREATE INDEX idx_chefs_email ON chefs(email);

COMMENT ON TABLE chefs IS 'Tenant root - each chef is a separate tenant with isolated data';
COMMENT ON COLUMN chefs.service_radius_miles IS 'Supports inquiry auto-decline if location too far';
COMMENT ON COLUMN chefs.minimum_guest_count IS 'Supports inquiry filtering (STATISTICS_INVENTORY: anti-time-waster guardrails)';
```

---

### 2. `clients`

**Purpose:** Client relationship records with household, preferences, site notes, and relationship intelligence.

**Supports Metrics:**

- Client lifetime value, total events, average spend
- Repeat client percentage, rebooking frequency
- Seasonal booking patterns, days since last event
- Loyalty tier, points balance

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Identity
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('text', 'email', 'phone', 'instagram')),

  -- Acquisition
  acquisition_source TEXT CHECK (acquisition_source IN ('take_a_chef', 'referral', 'instagram', 'google', 'direct', 'other')),
  referral_source_name TEXT, -- if acquisition_source = 'referral'

  -- Household (JSONB for flexible structure)
  household JSONB DEFAULT '{}'::jsonb,
  /* Example household structure:
  {
    "partner_name": "Kelly",
    "children": ["Emily", "Jack"],
    "regular_guests": [
      {"name": "Evan", "relationship": "friend", "preferences": "picky eater"},
      {"name": "Lindsay", "relationship": "friend"}
    ]
  }
  */

  -- Dietary & Preferences
  dietary_restrictions TEXT[] DEFAULT '{}', -- e.g., ['vegetarian', 'gluten-free']
  allergies TEXT[] DEFAULT '{}', -- e.g., ['nuts', 'shellfish'] -- FLAGGED PROMINENTLY
  dislikes TEXT[] DEFAULT '{}',
  spice_tolerance INTEGER CHECK (spice_tolerance BETWEEN 1 AND 5),
  favorite_cuisines TEXT[] DEFAULT '{}',
  favorite_dishes TEXT[] DEFAULT '{}', -- from past events
  wine_beverage_preferences TEXT,

  -- Site Information
  primary_address TEXT,
  primary_city TEXT,
  primary_state TEXT,
  primary_zip TEXT,
  parking_instructions TEXT,
  access_instructions TEXT, -- e.g., "enter through garage"
  kitchen_size_constraints TEXT,
  house_rules TEXT[] DEFAULT '{}', -- e.g., ['no shoes', 'quiet after 9pm']
  equipment_available TEXT[] DEFAULT '{}',
  equipment_must_bring TEXT[] DEFAULT '{}',

  -- Relationship Intelligence
  relationship_vibe TEXT, -- free-form chef notes
  tipping_pattern TEXT CHECK (tipping_pattern IN ('generous', 'standard', 'minimal', 'none')),
  payment_behavior TEXT, -- e.g., "always cash", "Venmo immediately", "pays late"
  generosity_rating INTEGER CHECK (generosity_rating BETWEEN 1 AND 5),
  personal_milestones JSONB DEFAULT '[]'::jsonb,
  /* Example milestones:
  [
    {"type": "birthday", "date": "1985-06-15", "notes": "Always books birthday dinner"},
    {"type": "anniversary", "date": "2010-09-20"},
    {"type": "child_birth", "date": "2015-03-10", "name": "Emily"}
  ]
  */

  -- Status & Loyalty
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'active', 'dormant', 'repeat_ready', 'vip', 'churned')),
  loyalty_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  loyalty_points_balance INTEGER NOT NULL DEFAULT 0,

  -- Computed Fields (updated by triggers from events/payments)
  lifetime_revenue_cents INTEGER DEFAULT 0,
  lifetime_tips_cents INTEGER DEFAULT 0,
  total_events_booked INTEGER DEFAULT 0,
  total_events_completed INTEGER DEFAULT 0,
  total_guests_served INTEGER DEFAULT 0,
  last_event_date DATE,
  first_event_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT clients_chef_tenant UNIQUE (chef_id, email) -- email unique per chef
);

CREATE INDEX idx_clients_chef_id ON clients(chef_id);
CREATE INDEX idx_clients_status ON clients(chef_id, status);
CREATE INDEX idx_clients_loyalty_tier ON clients(chef_id, loyalty_tier);
CREATE INDEX idx_clients_last_event_date ON clients(chef_id, last_event_date DESC);
CREATE INDEX idx_clients_email ON clients(chef_id, email);

COMMENT ON TABLE clients IS 'Client records with household, preferences, site notes, relationship intelligence';
COMMENT ON COLUMN clients.allergies IS 'CRITICAL: Must be flagged prominently in all menus and execution sheets';
COMMENT ON COLUMN clients.household IS 'JSONB: partner, children, regular_guests (supports Michel + Kelly + Evan + Lindsay pattern)';
COMMENT ON COLUMN clients.personal_milestones IS 'JSONB: birthdays, anniversaries, child births (supports outreach triggers)';
COMMENT ON COLUMN clients.loyalty_points_balance IS 'Points = total_guests_served (1 point per guest)';
```

---

### 3. `inquiries`

**Purpose:** Inquiry pipeline tracking from initial contact through conversion or decline.

**Supports Metrics:**

- Conversion rate, decline rate, expiry rate
- Time to first response, time to quote
- Inquiries by channel, conversion by channel
- Overdue responses, follow-up flags

```sql
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- may be stub client

  -- Source
  source_channel TEXT NOT NULL CHECK (source_channel IN ('text', 'email', 'instagram', 'take_a_chef', 'phone', 'referral', 'website')),
  verbatim_message TEXT, -- raw initial message

  -- Confirmed Facts (nullable until confirmed)
  confirmed_date DATE,
  confirmed_guest_count INTEGER,
  confirmed_location TEXT,
  confirmed_city TEXT,
  confirmed_occasion TEXT,
  confirmed_budget_cents INTEGER,
  confirmed_dietary_restrictions TEXT[] DEFAULT '{}',
  confirmed_service_style TEXT,

  -- Blocking Questions
  blocking_questions JSONB DEFAULT '[]'::jsonb,
  /* Example:
  [
    {"question": "What date did you have in mind?", "added_at": "2026-02-10T10:00:00Z"},
    {"question": "How many guests?", "added_at": "2026-02-10T10:00:00Z"}
  ]
  */

  -- Status & Workflow
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'awaiting_client', 'awaiting_chef', 'quoted', 'confirmed', 'declined', 'expired')),
  status_history JSONB DEFAULT '[]'::jsonb,
  /* Example:
  [
    {"status": "new", "timestamp": "2026-02-10T09:30:00Z"},
    {"status": "awaiting_client", "timestamp": "2026-02-10T10:00:00Z", "changed_by": "chef_user_id"}
  ]
  */
  next_action_required_by TEXT CHECK (next_action_required_by IN ('chef', 'client', 'none')),

  -- Response Tracking
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_response_at TIMESTAMPTZ,
  follow_up_timer_started_at TIMESTAMPTZ,
  follow_up_flagged_at TIMESTAMPTZ, -- set if no response in 24h

  -- Quote
  quoted_at TIMESTAMPTZ,
  quoted_price_cents INTEGER,
  quote_accepted_at TIMESTAMPTZ,
  quote_rejected_at TIMESTAMPTZ,

  -- Outcomes
  declined_reason TEXT,
  converted_to_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inquiries_chef_id ON inquiries(chef_id);
CREATE INDEX idx_inquiries_status ON inquiries(chef_id, status);
CREATE INDEX idx_inquiries_received_at ON inquiries(chef_id, received_at DESC);
CREATE INDEX idx_inquiries_client_id ON inquiries(client_id);
CREATE INDEX idx_inquiries_follow_up_flagged ON inquiries(chef_id, follow_up_flagged_at) WHERE follow_up_flagged_at IS NOT NULL;

COMMENT ON TABLE inquiries IS 'Inquiry pipeline from initial contact through conversion/decline';
COMMENT ON COLUMN inquiries.follow_up_flagged_at IS 'Auto-set by cron if no response in 24h (supports overdue response tracking)';
COMMENT ON COLUMN inquiries.status_history IS 'Audit log of all status changes (supports conversion velocity analysis)';
```

---

### 4. `events`

**Purpose:** Core event records with full lifecycle tracking, financial snapshot, and terminal state verification.

**Supports Metrics:**

- Revenue per guest, food cost %, gross margin %, effective hourly rate
- Days from inquiry to booking, lead time days
- On-time arrival %, calm rating trend, terminal state %
- Events by month, revenue by month, guests served by month

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,

  -- Event Details
  event_name TEXT, -- e.g., "Valentine's Day 2026 for Michel"
  event_date DATE NOT NULL,
  serve_time TIME NOT NULL, -- primary anchor time
  arrival_time TIME, -- at client location
  departure_time_planned TIME,
  departure_time_actual TIME,

  guest_count INTEGER NOT NULL,
  guest_count_confirmed_at TIMESTAMPTZ,

  -- Location
  location_address TEXT NOT NULL,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,

  -- Event Context
  occasion TEXT, -- birthday, anniversary, valentine's day, casual, etc.
  service_style TEXT, -- seated dinner, buffet, family-style, etc.
  dietary_restrictions_snapshot TEXT[] DEFAULT '{}', -- snapshot at event time
  allergies_snapshot TEXT[] DEFAULT '{}', -- snapshot at event time
  special_requests TEXT,

  -- Status & Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  status_history JSONB DEFAULT '[]'::jsonb,
  /* Example:
  [
    {"status": "draft", "timestamp": "2026-02-01T10:00:00Z", "changed_by": "chef_user_id"},
    {"status": "proposed", "timestamp": "2026-02-02T14:00:00Z", "changed_by": "chef_user_id"},
    {"status": "accepted", "timestamp": "2026-02-03T09:00:00Z", "changed_by": "client_user_id"}
  ]
  */

  -- Financial Snapshot (immutable after acceptance)
  quoted_price_cents INTEGER NOT NULL,
  deposit_amount_cents INTEGER,
  deposit_due_date DATE,
  deposit_received_at TIMESTAMPTZ,
  final_payment_due_date DATE,
  final_payment_received_at TIMESTAMPTZ,

  -- Financial State (computed from ledger)
  total_paid_cents INTEGER DEFAULT 0, -- updated by trigger from ledger_entries
  total_tips_cents INTEGER DEFAULT 0, -- updated by trigger from ledger_entries
  outstanding_balance_cents INTEGER, -- quoted_price - total_paid
  payment_status TEXT CHECK (payment_status IN ('unpaid', 'deposit_paid', 'partial', 'paid', 'overpaid', 'refunded')),

  -- Food Cost & Expenses (computed from expenses table)
  grocery_budget_target_cents INTEGER, -- auto-calculated from margin target
  grocery_actual_spend_cents INTEGER DEFAULT 0,
  total_food_cost_cents INTEGER DEFAULT 0, -- includes groceries + liquor + specialty
  leftover_value_carried_forward_cents INTEGER DEFAULT 0, -- to next event
  leftover_value_received_cents INTEGER DEFAULT 0, -- from previous event
  adjusted_food_cost_cents INTEGER, -- total_food_cost - leftover_received

  -- Time Tracking
  shopping_time_minutes INTEGER,
  prep_time_minutes INTEGER,
  travel_time_minutes INTEGER,
  service_time_minutes INTEGER,
  cleanup_time_minutes INTEGER,
  reset_time_minutes INTEGER,
  total_time_invested_minutes INTEGER, -- sum of all phases

  -- Menu Structure
  course_count INTEGER,
  total_component_count INTEGER,
  course_breakdown JSONB DEFAULT '[]'::jsonb,
  /* Example:
  [
    {"course_number": 1, "course_name": "Charcuterie Board", "component_count": 24},
    {"course_number": 2, "course_name": "Bib Lettuce Salad", "component_count": 3},
    {"course_number": 3, "course_name": "Steak Diane with Sides", "component_count": 5},
    {"course_number": 4, "course_name": "Chocolate Layer Cake", "component_count": 7}
  ]
  */

  -- Progressive Document Timestamps
  menu_locked_at TIMESTAMPTZ,
  grocery_list_ready_at TIMESTAMPTZ,
  prep_list_ready_at TIMESTAMPTZ,
  packing_list_ready_at TIMESTAMPTZ,
  timeline_ready_at TIMESTAMPTZ,
  execution_sheet_printed_at TIMESTAMPTZ,

  -- Terminal State Tracking
  event_completed_at TIMESTAMPTZ,
  follow_up_sent_at TIMESTAMPTZ,
  financial_closed_at TIMESTAMPTZ,
  reset_completed_at TIMESTAMPTZ,
  after_action_review_filed_at TIMESTAMPTZ,
  terminal_state_reached_at TIMESTAMPTZ, -- set when all close-out complete

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_chef_id ON events(chef_id);
CREATE INDEX idx_events_event_date ON events(chef_id, event_date DESC);
CREATE INDEX idx_events_client_id ON events(client_id);
CREATE INDEX idx_events_status ON events(chef_id, status);
CREATE INDEX idx_events_upcoming ON events(chef_id, event_date) WHERE status IN ('accepted', 'paid', 'confirmed') AND event_date > CURRENT_DATE;
CREATE INDEX idx_events_terminal_state ON events(chef_id, terminal_state_reached_at) WHERE terminal_state_reached_at IS NOT NULL;

COMMENT ON TABLE events IS 'Core event records with full lifecycle, financial snapshot, terminal state tracking';
COMMENT ON COLUMN events.status_history IS 'Audit log of all state transitions (immutable append-only)';
COMMENT ON COLUMN events.total_paid_cents IS 'Computed from ledger_entries SUM (updated by trigger)';
COMMENT ON COLUMN events.adjusted_food_cost_cents IS 'True food cost after leftover value transfers (Feb 14→15 pattern)';
COMMENT ON COLUMN events.terminal_state_reached_at IS 'Set when: follow_up sent, financial closed, reset done, AAR filed';
COMMENT ON COLUMN events.course_breakdown IS 'Component counts per course (supports packing verification: "Course 3 = 5 components")';
```

---

### 5. `menus`

**Purpose:** Menu records with course hierarchy, component tracking, and lock state.

**Supports Metrics:**

- Menus locked by month, average component count
- Template usage, revision count
- Time to lock, recipes missing

```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Menu Identity
  menu_name TEXT NOT NULL,
  menu_type TEXT NOT NULL CHECK (menu_type IN ('custom', 'template', 'draft')),
  is_template BOOLEAN DEFAULT FALSE,
  template_name TEXT, -- if is_template = true

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'shared', 'locked', 'archived')),
  status_history JSONB DEFAULT '[]'::jsonb,

  -- Structure
  course_count INTEGER NOT NULL,
  total_component_count INTEGER NOT NULL,
  courses JSONB NOT NULL DEFAULT '[]'::jsonb,
  /* Example courses structure:
  [
    {
      "course_number": 1,
      "course_name": "Charcuterie Board",
      "component_count": 24,
      "components": [
        {
          "component_id": "uuid",
          "component_name": "Gouda",
          "category": "cheese",
          "recipe_id": null,
          "is_flexible": false,
          "is_high_risk": false,
          "prep_timing": "day-of",
          "allergen_flags": ["dairy"]
        },
        ...
      ]
    },
    ...
  ]
  */

  -- Client-Facing vs Internal
  client_facing_version TEXT, -- what client sees
  internal_version TEXT, -- chef's notes, shortcuts, reminders

  -- Compliance Flags
  allergen_flags TEXT[] DEFAULT '{}', -- aggregated from all components
  dietary_compliance TEXT[] DEFAULT '{}', -- vegetarian, vegan, gluten-free, etc.

  -- Revision Tracking
  revision_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shared_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Template Usage
  times_used INTEGER DEFAULT 0 -- for templates
);

CREATE INDEX idx_menus_chef_id ON menus(chef_id);
CREATE INDEX idx_menus_event_id ON menus(event_id);
CREATE INDEX idx_menus_status ON menus(chef_id, status);
CREATE INDEX idx_menus_templates ON menus(chef_id, is_template) WHERE is_template = TRUE;
CREATE INDEX idx_menus_locked_at ON menus(chef_id, locked_at DESC) WHERE locked_at IS NOT NULL;

COMMENT ON TABLE menus IS 'Menu records with course hierarchy, component tracking, lock state';
COMMENT ON COLUMN menus.courses IS 'JSONB: array of courses with nested components (supports component-level tracking)';
COMMENT ON COLUMN menus.locked_at IS 'Once locked, triggers event.grocery_list_ready_at unlock';
COMMENT ON COLUMN menus.times_used IS 'For templates: COUNT of events using this template';
```

---

### 6. `recipes` (Recipe Bible)

**Purpose:** Recipe library that builds over time from real events.

**Supports Metrics:**

- Total recipes, recipes by category
- Most used recipes, signature dishes
- Recipe coverage rate, cost per recipe
- Recipe library growth by month

```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Recipe Identity
  component_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sauce', 'protein', 'starch', 'vegetable', 'dessert', 'bread', 'condiment', 'garnish', 'other')),
  description TEXT,

  -- Method
  method TEXT NOT NULL, -- concise outcomes, not step-by-step (chef knows how to cook)

  -- Yield
  yield_amount NUMERIC NOT NULL,
  yield_unit TEXT NOT NULL, -- cups, servings, portions, grams, etc.
  base_guest_count INTEGER NOT NULL, -- e.g., "serves 4"

  -- Ingredients (JSONB for flexibility)
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  /* Example:
  [
    {"name": "shallots", "quantity": 2, "unit": "whole", "cost_per_unit_cents": 50, "is_pantry_staple": false, "allergen_flags": []},
    {"name": "heavy cream", "quantity": 1, "unit": "cup", "cost_per_unit_cents": 150, "is_pantry_staple": false, "allergen_flags": ["dairy"]},
    {"name": "cognac", "quantity": 0.25, "unit": "cup", "cost_per_unit_cents": 500, "is_pantry_staple": false, "allergen_flags": []},
    ...
  ]
  */

  -- Costing (computed from ingredients)
  total_ingredient_cost_cents INTEGER NOT NULL,
  cost_per_batch_cents INTEGER NOT NULL,
  cost_per_portion_cents INTEGER NOT NULL,

  -- Flags
  allergen_flags TEXT[] DEFAULT '{}',
  dietary_flags TEXT[] DEFAULT '{}', -- vegetarian, vegan, gluten-free, etc.

  -- Make-Ahead
  can_make_ahead BOOLEAN DEFAULT FALSE,
  make_ahead_window_hours INTEGER,
  storage_instructions TEXT,

  -- Adaptations
  adaptations TEXT, -- shortcuts, variations

  -- Media
  photo_url TEXT,

  -- Usage Tracking
  source_event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- where first captured
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Feedback
  client_feedback_rating NUMERIC(3,2) CHECK (client_feedback_rating BETWEEN 1.00 AND 5.00),
  is_favorite BOOLEAN DEFAULT FALSE, -- chef flag
  would_make_again BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipes_chef_id ON recipes(chef_id);
CREATE INDEX idx_recipes_category ON recipes(chef_id, category);
CREATE INDEX idx_recipes_times_used ON recipes(chef_id, times_used DESC);
CREATE INDEX idx_recipes_component_name ON recipes(chef_id, component_name);
CREATE INDEX idx_recipes_signature_dishes ON recipes(chef_id) WHERE times_used > 10 AND client_feedback_rating >= 4.5;

COMMENT ON TABLE recipes IS 'Recipe bible that builds from real events (organic growth, not written upfront)';
COMMENT ON COLUMN recipes.source_event_id IS 'Event where recipe was first captured (post-event prompt)';
COMMENT ON COLUMN recipes.times_used IS 'Reuse tracking (updated when menu component links to this recipe)';
COMMENT ON COLUMN recipes.ingredients IS 'JSONB array with cost tracking (supports projected food cost calculation)';
COMMENT ON COLUMN recipes.client_feedback_rating IS 'AVG rating from events using this recipe';
```

---

### 7. `ledger_entries` (Immutable Financial Ledger)

**Purpose:** Append-only financial record. All payments, deposits, tips, refunds.

**Supports Metrics:**

- Total revenue, total tips, outstanding balances
- Revenue by month, payment method distribution
- Gross margin, net profit, effective hourly rate

```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,

  -- Entry Details
  entry_type TEXT NOT NULL CHECK (entry_type IN ('deposit', 'installment', 'final_payment', 'tip', 'refund', 'adjustment', 'add_on')),
  amount_cents INTEGER NOT NULL, -- positive for credits, negative for refunds

  -- Payment Details
  payment_method TEXT CHECK (payment_method IN ('cash', 'venmo', 'paypal', 'stripe', 'card', 'check', 'other')),
  card_used TEXT, -- e.g., "Amex Blue Cash 4%" (for cash-back optimization)
  cash_back_earned_cents INTEGER DEFAULT 0,

  -- Dates
  transaction_date TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ, -- when chef actually got the money

  -- Documentation
  receipt_photo_url TEXT,
  notes TEXT,

  -- Metadata (IMMUTABLE)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- IMMUTABILITY TRIGGER: Prevent UPDATE/DELETE
CREATE TRIGGER prevent_ledger_modification
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_modification();

CREATE INDEX idx_ledger_chef_id ON ledger_entries(chef_id);
CREATE INDEX idx_ledger_event_id ON ledger_entries(event_id);
CREATE INDEX idx_ledger_client_id ON ledger_entries(client_id);
CREATE INDEX idx_ledger_transaction_date ON ledger_entries(chef_id, transaction_date DESC);
CREATE INDEX idx_ledger_entry_type ON ledger_entries(chef_id, entry_type);

COMMENT ON TABLE ledger_entries IS 'IMMUTABLE append-only financial ledger (no UPDATE/DELETE allowed)';
COMMENT ON COLUMN ledger_entries.amount_cents IS 'Positive for credits (payments), negative for debits (refunds)';
COMMENT ON COLUMN ledger_entries.cash_back_earned_cents IS 'Tracks card optimization (Amex 4% on groceries, etc.)';
```

---

### 8. `expenses`

**Purpose:** Event expenses (groceries, liquor, gas, specialty items) with receipt tracking and business/personal separation.

**Supports Metrics:**

- Food cost %, budget adherence, cost variance
- Expense by type, business vs personal spend
- Most substituted items

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Expense Details
  expense_type TEXT NOT NULL CHECK (expense_type IN ('groceries', 'liquor', 'gas', 'specialty_item', 'other')),
  vendor TEXT, -- e.g., "Market Basket", "One Stop Liquor"
  amount_cents INTEGER NOT NULL,

  -- Business Separation
  is_business_expense BOOLEAN DEFAULT TRUE, -- false for personal items in mixed shopping

  -- Payment
  card_used TEXT, -- e.g., "Amex Blue Cash 4%"
  cash_back_earned_cents INTEGER DEFAULT 0,

  -- Documentation
  receipt_photo_url TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  /* Example (if receipt parsed):
  [
    {"item_name": "NY Strip Steak", "quantity": 4, "unit_price_cents": 1299, "total_cents": 5196, "is_business": true},
    {"item_name": "Personal shampoo", "quantity": 1, "unit_price_cents": 899, "total_cents": 899, "is_business": false},
    ...
  ]
  */

  -- Timestamps
  purchased_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_chef_id ON expenses(chef_id);
CREATE INDEX idx_expenses_event_id ON expenses(event_id);
CREATE INDEX idx_expenses_expense_type ON expenses(chef_id, expense_type);
CREATE INDEX idx_expenses_purchased_at ON expenses(chef_id, purchased_at DESC);

COMMENT ON TABLE expenses IS 'Event expenses with receipt tracking and business/personal separation';
COMMENT ON COLUMN expenses.is_business_expense IS 'Supports mixed shopping separation (business vs personal items)';
COMMENT ON COLUMN expenses.line_items IS 'JSONB: parsed receipt line items (if receipt scanning implemented)';
```

---

### 9. `grocery_lists`

**Purpose:** Shopping lists with item-level tracking, substitutions, and cost variance.

**Supports Metrics:**

- Planned vs actual cost, substitution rate
- Most substituted items

```sql
CREATE TABLE grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'skeleton' CHECK (status IN ('skeleton', 'quantified', 'finalized', 'shopped')),

  -- Items (JSONB for flexibility)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  /* Example:
  [
    {
      "item_name": "NY Strip Steak",
      "category": "protein",
      "quantity": 4,
      "unit": "steaks",
      "is_staple_already_owned": false,
      "is_flexible": false,
      "is_insurance_item": false,
      "preferred_store": "Market Basket",
      "planned_cost_cents": 5200,
      "actual_cost_cents": 5196,
      "was_substituted": false,
      "substitution_reason": null,
      "substituted_with": null
    },
    {
      "item_name": "parchment paper",
      "category": "supplies",
      "quantity": 1,
      "unit": "roll",
      "is_staple_already_owned": false,
      "is_flexible": false,
      "is_insurance_item": false,
      "preferred_store": "Market Basket",
      "planned_cost_cents": 400,
      "actual_cost_cents": 0,
      "was_substituted": true,
      "substitution_reason": "store out of stock",
      "substituted_with": "none (cake stuck to pan)"
    },
    ...
  ]
  */

  -- Computed Totals
  total_line_items INTEGER NOT NULL,
  total_planned_cost_cents INTEGER,
  total_actual_cost_cents INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  shopped_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grocery_lists_chef_id ON grocery_lists(chef_id);
CREATE INDEX idx_grocery_lists_event_id ON grocery_lists(event_id);

COMMENT ON TABLE grocery_lists IS 'Shopping lists with item-level substitution tracking and cost variance';
COMMENT ON COLUMN grocery_lists.items IS 'JSONB array of grocery items (supports planned vs actual cost, substitution tracking)';
```

---

### 10. `packing_lists`

**Purpose:** Equipment and packing checklists with forgotten items tracking.

**Supports Metrics:**

- Most forgotten items (drives non-negotiables checklist)

```sql
CREATE TABLE packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'packed', 'verified')),

  -- Items (JSONB)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  /* Example:
  [
    {
      "item_name": "gloves",
      "category": "non_negotiable",
      "bin": "dry",
      "is_fragile": false,
      "quantity": 2,
      "was_forgotten": true
    },
    {
      "item_name": "parchment paper",
      "category": "must_bring",
      "bin": "dry",
      "is_fragile": false,
      "quantity": 1,
      "was_forgotten": true
    },
    {
      "item_name": "ice cream machine",
      "category": "must_bring",
      "bin": "tools",
      "is_fragile": true,
      "quantity": 1,
      "was_forgotten": false
    },
    ...
  ]
  */

  -- Computed
  total_items INTEGER NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  packed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_packing_lists_chef_id ON packing_lists(chef_id);
CREATE INDEX idx_packing_lists_event_id ON packing_lists(event_id);

COMMENT ON TABLE packing_lists IS 'Equipment/packing checklists with forgotten items tracking';
COMMENT ON COLUMN packing_lists.items IS 'JSONB array (supports forgotten item frequency aggregation)';
```

---

### 11. `timelines`

**Purpose:** Day-of schedules working backwards from arrival time.

```sql
CREATE TABLE timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Anchor Times
  serve_time TIME NOT NULL,
  arrival_time TIME NOT NULL,

  -- Backwards-Calculated Schedule
  leave_house_time TIME NOT NULL,
  car_packed_by_time TIME NOT NULL,
  finish_prep_by_time TIME NOT NULL,
  start_prep_time TIME NOT NULL,
  home_from_shopping_time TIME NOT NULL,
  leave_for_shopping_time TIME NOT NULL,
  wake_up_time TIME NOT NULL, -- absolute latest

  -- Route Stops
  route_stops JSONB DEFAULT '[]'::jsonb,
  /* Example:
  [
    {"stop_name": "Market Basket", "address": "123 Main St, Haverhill MA", "stop_type": "grocery"},
    {"stop_name": "One Stop Liquor", "address": "456 Oak St, Haverhill MA", "stop_type": "liquor"},
    {"stop_name": "Client Location", "address": "789 Elm St, Haverhill MA", "stop_type": "client"}
  ]
  */

  -- Buffers
  total_prep_time_allocated_minutes INTEGER,
  total_buffer_time_minutes INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timelines_chef_id ON timelines(chef_id);
CREATE INDEX idx_timelines_event_id ON timelines(event_id);

COMMENT ON TABLE timelines IS 'Day-of schedules working backwards from arrival time';
COMMENT ON COLUMN timelines.wake_up_time IS 'Absolute latest wake time (supports wake time variance tracking from AAR)';
```

---

### 12. `after_action_reviews`

**Purpose:** Post-event retrospectives. Required for terminal state.

**Supports Metrics:**

- Calm rating trend, preparation rating trend
- Items forgotten frequency
- Stress level tracking, service improvement

```sql
CREATE TABLE after_action_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Ratings
  calm_rating INTEGER NOT NULL CHECK (calm_rating BETWEEN 1 AND 5),
  preparation_rating INTEGER NOT NULL CHECK (preparation_rating BETWEEN 1 AND 5),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),

  -- Analysis
  could_have_been_done_earlier TEXT[] DEFAULT '{}', -- e.g., ['grocery list', 'prep list', 'shopping']
  items_forgotten TEXT[] DEFAULT '{}',
  what_went_well TEXT,
  what_went_wrong TEXT,
  menu_performance_notes TEXT,
  client_behavior_notes TEXT,
  site_notes TEXT,

  -- Flags
  would_repeat_menu BOOLEAN,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT one_aar_per_event UNIQUE (event_id)
);

CREATE INDEX idx_aar_chef_id ON after_action_reviews(chef_id);
CREATE INDEX idx_aar_event_id ON after_action_reviews(event_id);
CREATE INDEX idx_aar_calm_rating ON after_action_reviews(chef_id, calm_rating);
CREATE INDEX idx_aar_created_at ON after_action_reviews(chef_id, created_at DESC);

COMMENT ON TABLE after_action_reviews IS 'Post-event retrospectives (required for terminal state)';
COMMENT ON COLUMN after_action_reviews.calm_rating IS 'PRIMARY KPI: Did this dinner feel calm? (1-5)';
COMMENT ON COLUMN after_action_reviews.items_forgotten IS 'Drives non-negotiables checklist (aggregated across all events)';
```

---

### 13. `messages`

**Purpose:** Contextual communication tied to events or inquiries.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Message Details
  sender_role TEXT NOT NULL CHECK (sender_role IN ('chef', 'client', 'system')),
  message_content TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'text', 'email', 'instagram', 'phone_log')),

  -- Status (for system-generated messages)
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'approved', 'sent', 'logged')),
  is_system_generated BOOLEAN DEFAULT FALSE,
  template_used TEXT, -- e.g., "mid-service auto-reply"

  -- Workflow
  requires_response BOOLEAN DEFAULT FALSE,
  flagged_for_follow_up BOOLEAN DEFAULT FALSE,

  -- Timestamps
  drafted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ, -- chef approval if system-generated
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT message_context_check CHECK (
    (event_id IS NOT NULL) OR (inquiry_id IS NOT NULL)
  )
);

CREATE INDEX idx_messages_chef_id ON messages(chef_id);
CREATE INDEX idx_messages_event_id ON messages(event_id);
CREATE INDEX idx_messages_inquiry_id ON messages(inquiry_id);
CREATE INDEX idx_messages_client_id ON messages(client_id);
CREATE INDEX idx_messages_requires_response ON messages(chef_id, requires_response) WHERE requires_response = TRUE;

COMMENT ON TABLE messages IS 'Contextual communication tied to events or inquiries';
COMMENT ON COLUMN messages.is_system_generated IS 'If TRUE, requires chef approval before sending (no auto-send in chef voice)';
```

---

### 14. `loyalty_rewards`

**Purpose:** Service-denominated rewards (never cash). Points = guests served.

```sql
CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Reward Details
  reward_type TEXT NOT NULL, -- e.g., "$20 off", "50% off dinner for two", "free dinner", "bonus course"
  reward_description TEXT NOT NULL,
  points_cost INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired')),

  -- Usage
  redeemed_at TIMESTAMPTZ,
  redeemed_on_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  expiry_date TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_rewards_chef_id ON loyalty_rewards(chef_id);
CREATE INDEX idx_loyalty_rewards_client_id ON loyalty_rewards(client_id);
CREATE INDEX idx_loyalty_rewards_status ON loyalty_rewards(chef_id, status);

COMMENT ON TABLE loyalty_rewards IS 'Service-denominated rewards (never cash). Points = total guests served.';
COMMENT ON COLUMN loyalty_rewards.points_cost IS '1 point per guest served lifetime (client.total_guests_served)';
```

---

## Computed Views

### View: `client_lifetime_metrics`

**Purpose:** Pre-computed client aggregations for dashboard performance.

```sql
CREATE MATERIALIZED VIEW client_lifetime_metrics AS
SELECT
  c.id AS client_id,
  c.chef_id,
  c.first_name,
  c.last_name,
  c.email,
  c.status,
  c.loyalty_tier,
  c.loyalty_points_balance,

  -- Event Counts
  COUNT(e.id) FILTER (WHERE e.status IN ('accepted', 'paid', 'confirmed', 'in_progress', 'completed')) AS total_events_booked,
  COUNT(e.id) FILTER (WHERE e.status = 'completed') AS total_events_completed,
  COUNT(e.id) FILTER (WHERE e.status = 'cancelled') AS total_events_cancelled,

  -- Revenue
  COALESCE(SUM(e.total_paid_cents) FILTER (WHERE e.status = 'completed'), 0) AS lifetime_revenue_cents,
  COALESCE(SUM(e.total_tips_cents) FILTER (WHERE e.status = 'completed'), 0) AS lifetime_tips_cents,
  COALESCE(SUM(e.total_paid_cents + e.total_tips_cents) FILTER (WHERE e.status = 'completed'), 0) AS lifetime_combined_value_cents,

  -- Guests
  COALESCE(SUM(e.guest_count) FILTER (WHERE e.status = 'completed'), 0) AS total_guests_served,
  COALESCE(AVG(e.guest_count) FILTER (WHERE e.status = 'completed'), 0) AS avg_guests_per_event,

  -- Financial Metrics
  CASE
    WHEN COUNT(e.id) FILTER (WHERE e.status = 'completed') > 0
    THEN COALESCE(SUM(e.total_paid_cents) FILTER (WHERE e.status = 'completed'), 0) / COUNT(e.id) FILTER (WHERE e.status = 'completed')
    ELSE 0
  END AS avg_spend_per_event_cents,

  CASE
    WHEN COALESCE(SUM(e.total_paid_cents) FILTER (WHERE e.status = 'completed'), 0) > 0
    THEN (COALESCE(SUM(e.total_tips_cents) FILTER (WHERE e.status = 'completed'), 0)::NUMERIC / SUM(e.total_paid_cents) FILTER (WHERE e.status = 'completed')) * 100
    ELSE 0
  END AS avg_tip_percentage,

  -- Dates
  MIN(e.event_date) FILTER (WHERE e.status IN ('accepted', 'paid', 'confirmed', 'in_progress', 'completed')) AS first_event_date,
  MAX(e.event_date) FILTER (WHERE e.status = 'completed') AS last_event_date,

  -- Repeat Client Flag
  (COUNT(e.id) FILTER (WHERE e.status = 'completed') > 1) AS is_repeat_client,

  -- Outstanding Balance
  COALESCE(SUM(e.outstanding_balance_cents), 0) AS outstanding_balance_cents

FROM clients c
LEFT JOIN events e ON c.id = e.client_id
GROUP BY c.id, c.chef_id, c.first_name, c.last_name, c.email, c.status, c.loyalty_tier, c.loyalty_points_balance;

CREATE UNIQUE INDEX idx_client_lifetime_metrics_client_id ON client_lifetime_metrics(client_id);
CREATE INDEX idx_client_lifetime_metrics_chef_id ON client_lifetime_metrics(chef_id);

COMMENT ON MATERIALIZED VIEW client_lifetime_metrics IS 'Pre-computed client aggregations (refresh after events close)';
```

---

### View: `event_financial_summary`

**Purpose:** Computed financial metrics per event.

```sql
CREATE VIEW event_financial_summary AS
SELECT
  e.id AS event_id,
  e.chef_id,
  e.client_id,
  e.event_date,
  e.status,

  -- Revenue
  e.quoted_price_cents,
  e.total_paid_cents,
  e.total_tips_cents,
  (e.total_paid_cents + e.total_tips_cents) AS total_revenue_cents,
  e.outstanding_balance_cents,

  -- Costs
  e.adjusted_food_cost_cents,

  -- Derived Metrics
  CASE
    WHEN e.guest_count > 0 THEN (e.total_paid_cents + e.total_tips_cents) / e.guest_count
    ELSE 0
  END AS revenue_per_guest_cents,

  CASE
    WHEN e.guest_count > 0 THEN e.adjusted_food_cost_cents / e.guest_count
    ELSE 0
  END AS food_cost_per_guest_cents,

  CASE
    WHEN (e.total_paid_cents + e.total_tips_cents) > 0
    THEN (e.adjusted_food_cost_cents::NUMERIC / (e.total_paid_cents + e.total_tips_cents)) * 100
    ELSE 0
  END AS food_cost_percentage,

  ((e.total_paid_cents + e.total_tips_cents) - e.adjusted_food_cost_cents) AS gross_profit_cents,

  CASE
    WHEN (e.total_paid_cents + e.total_tips_cents) > 0
    THEN (((e.total_paid_cents + e.total_tips_cents) - e.adjusted_food_cost_cents)::NUMERIC / (e.total_paid_cents + e.total_tips_cents)) * 100
    ELSE 0
  END AS gross_margin_percentage,

  CASE
    WHEN e.total_time_invested_minutes > 0
    THEN (((e.total_paid_cents + e.total_tips_cents) - e.adjusted_food_cost_cents)::NUMERIC / (e.total_time_invested_minutes / 60.0))
    ELSE 0
  END AS effective_hourly_rate_cents,

  CASE
    WHEN e.total_paid_cents > 0
    THEN (e.total_tips_cents::NUMERIC / e.total_paid_cents) * 100
    ELSE 0
  END AS tip_percentage

FROM events e;

COMMENT ON VIEW event_financial_summary IS 'Computed financial metrics per event (revenue, margins, hourly rate)';
```

---

### View: `monthly_revenue_summary`

**Purpose:** Monthly revenue vs $10K target.

```sql
CREATE VIEW monthly_revenue_summary AS
SELECT
  chef_id,
  DATE_TRUNC('month', event_date) AS month,
  COUNT(*) AS events_count,
  SUM(guest_count) AS total_guests,
  SUM(total_paid_cents + total_tips_cents) AS total_revenue_cents,
  SUM(adjusted_food_cost_cents) AS total_food_cost_cents,
  SUM((total_paid_cents + total_tips_cents) - adjusted_food_cost_cents) AS total_gross_profit_cents,
  AVG((adjusted_food_cost_cents::NUMERIC / NULLIF(total_paid_cents + total_tips_cents, 0)) * 100) AS avg_food_cost_percentage,
  ((SUM(total_paid_cents + total_tips_cents)::NUMERIC / 1000000) * 100) AS revenue_vs_10k_target_percentage,
  (1000000 - SUM(total_paid_cents + total_tips_cents)) AS revenue_shortfall_cents
FROM events
WHERE status = 'completed'
GROUP BY chef_id, DATE_TRUNC('month', event_date);

COMMENT ON VIEW monthly_revenue_summary IS 'Monthly revenue vs $10K target with food cost tracking';
```

---

### View: `forgotten_items_frequency`

**Purpose:** Aggregated forgotten items to drive non-negotiables checklist.

```sql
CREATE VIEW forgotten_items_frequency AS
SELECT
  chef_id,
  jsonb_array_elements_text(items::jsonb) AS item_data,
  (jsonb_array_elements(items::jsonb)->>'item_name')::TEXT AS item_name,
  (jsonb_array_elements(items::jsonb)->>'was_forgotten')::BOOLEAN AS was_forgotten,
  COUNT(*) FILTER (WHERE (jsonb_array_elements(items::jsonb)->>'was_forgotten')::BOOLEAN = TRUE) AS times_forgotten,
  COUNT(*) AS total_occurrences,
  (COUNT(*) FILTER (WHERE (jsonb_array_elements(items::jsonb)->>'was_forgotten')::BOOLEAN = TRUE)::NUMERIC / NULLIF(COUNT(*), 0)) * 100 AS forget_rate_percentage
FROM packing_lists
GROUP BY chef_id, item_name
HAVING COUNT(*) FILTER (WHERE (jsonb_array_elements(items::jsonb)->>'was_forgotten')::BOOLEAN = TRUE) > 0
ORDER BY times_forgotten DESC;

COMMENT ON VIEW forgotten_items_frequency IS 'Most commonly forgotten items (drives non-negotiables checklist auto-update)';
```

---

## Database Functions

### Function: `update_event_financial_totals()`

**Purpose:** Trigger function to update `events.total_paid_cents` and `events.total_tips_cents` when ledger entries are added.

```sql
CREATE OR REPLACE FUNCTION update_event_financial_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events
  SET
    total_paid_cents = (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM ledger_entries
      WHERE event_id = NEW.event_id
        AND entry_type IN ('deposit', 'installment', 'final_payment')
    ),
    total_tips_cents = (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM ledger_entries
      WHERE event_id = NEW.event_id
        AND entry_type = 'tip'
    ),
    outstanding_balance_cents = quoted_price_cents - (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM ledger_entries
      WHERE event_id = NEW.event_id
        AND entry_type IN ('deposit', 'installment', 'final_payment')
    ),
    updated_at = NOW()
  WHERE id = NEW.event_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_event_financial_totals
AFTER INSERT ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION update_event_financial_totals();

COMMENT ON FUNCTION update_event_financial_totals IS 'Auto-update event.total_paid_cents from ledger entries (maintains consistency)';
```

---

### Function: `prevent_modification()`

**Purpose:** Prevent UPDATE/DELETE on immutable tables (ledger_entries, event status_history).

```sql
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'This table is append-only. UPDATE and DELETE operations are not allowed.';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_modification IS 'Enforces immutability on ledger_entries (no UPDATE/DELETE)';
```

---

### Function: `log_status_change()`

**Purpose:** Audit log for event status transitions.

```sql
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_history = OLD.status_history || jsonb_build_object(
      'status', NEW.status,
      'timestamp', NOW(),
      'changed_by', current_setting('app.current_user_id', TRUE)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_event_status_change
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION log_status_change();

COMMENT ON FUNCTION log_status_change IS 'Audit log all status transitions (who changed what, when)';
```

---

### Function: `update_client_loyalty_tier()`

**Purpose:** Auto-update client loyalty tier based on total_guests_served.

```sql
CREATE OR REPLACE FUNCTION update_client_loyalty_tier()
RETURNS TRIGGER AS $$
DECLARE
  total_guests INTEGER;
BEGIN
  -- Calculate total guests served
  SELECT COALESCE(SUM(guest_count), 0) INTO total_guests
  FROM events
  WHERE client_id = NEW.client_id
    AND status = 'completed';

  -- Update loyalty tier
  UPDATE clients
  SET
    total_guests_served = total_guests,
    loyalty_points_balance = total_guests, -- 1 point per guest
    loyalty_tier = CASE
      WHEN total_guests >= 100 THEN 'platinum'
      WHEN total_guests >= 50 THEN 'gold'
      WHEN total_guests >= 20 THEN 'silver'
      ELSE 'bronze'
    END,
    updated_at = NOW()
  WHERE id = NEW.client_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_client_loyalty_tier
AFTER INSERT OR UPDATE OF status ON events
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION update_client_loyalty_tier();

COMMENT ON FUNCTION update_client_loyalty_tier IS 'Auto-calculate loyalty tier from total guests served';
```

---

### Function: `unlock_grocery_list_on_menu_lock()`

**Purpose:** When menu locks, trigger `event.grocery_list_ready_at` unlock.

```sql
CREATE OR REPLACE FUNCTION unlock_grocery_list_on_menu_lock()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.locked_at IS NULL AND NEW.locked_at IS NOT NULL THEN
    UPDATE events
    SET
      grocery_list_ready_at = NEW.locked_at,
      updated_at = NOW()
    WHERE menu_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_unlock_grocery_list
AFTER UPDATE OF locked_at ON menus
FOR EACH ROW
EXECUTE FUNCTION unlock_grocery_list_on_menu_lock();

COMMENT ON FUNCTION unlock_grocery_list_on_menu_lock IS 'Progressive document unlocking: menu locked → grocery list ready';
```

---

## Row-Level Security (RLS) Policies

**Multi-Tenant Isolation:** Every table must enforce `chef_id` scoping.

### Example: `clients` RLS

```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_isolation ON clients
  USING (chef_id = current_setting('app.current_chef_id')::UUID);

COMMENT ON POLICY clients_isolation ON clients IS 'Multi-tenant isolation: chef can only see their own clients';
```

### Apply to All Tables

- `chefs` (user can only see their own chef record)
- `clients` (scoped by chef_id)
- `inquiries` (scoped by chef_id)
- `events` (scoped by chef_id)
- `menus` (scoped by chef_id)
- `recipes` (scoped by chef_id)
- `ledger_entries` (scoped by chef_id)
- `expenses` (scoped by chef_id)
- `grocery_lists` (scoped by chef_id)
- `packing_lists` (scoped by chef_id)
- `timelines` (scoped by chef_id)
- `after_action_reviews` (scoped by chef_id)
- `messages` (scoped by chef_id)
- `loyalty_rewards` (scoped by chef_id)

---

## Migration Strategy

### Layer 1: Foundation (20260215000001)

- `chefs`, `clients`, `inquiries`, `events`
- Basic RLS policies
- Immutability triggers

### Layer 2: Financial (20260215000002)

- `ledger_entries`, `expenses`
- Financial computation triggers
- Views: `event_financial_summary`, `monthly_revenue_summary`

### Layer 3: Menu & Recipe (20260215000003)

- `menus`, `recipes`
- Menu lock → grocery unlock trigger

### Layer 4: Operations (20260215000004)

- `grocery_lists`, `packing_lists`, `timelines`, `after_action_reviews`
- Forgotten items view

### Layer 5: Communication & Loyalty (20260215000005)

- `messages`, `loyalty_rewards`
- Client loyalty tier trigger

### Layer 6: Materialized Views (20260215000006)

- `client_lifetime_metrics` (materialized)
- Refresh policies

---

## Type Generation

After migrations run, generate TypeScript types:

```bash
npx supabase gen types typescript --local > types/database.ts
```

**Expected Output:**

- Table types (Client, Event, Menu, Recipe, etc.)
- View types (ClientLifetimeMetrics, EventFinancialSummary, etc.)
- Enum types (EventStatus, InquiryStatus, etc.)
- Function return types

---

## Index Strategy

**Time-Series Queries:**

- `events(chef_id, event_date DESC)` — events by date
- `ledger_entries(chef_id, transaction_date DESC)` — revenue by date
- `inquiries(chef_id, received_at DESC)` — inquiry pipeline

**Dashboard Queries:**

- `events(chef_id, status)` — filter by status
- `clients(chef_id, status)` — active/dormant clients
- `events(chef_id) WHERE terminal_state_reached_at IS NOT NULL` — terminal state tracking

**Aggregation Optimization:**

- Materialized view: `client_lifetime_metrics` (refresh after event close)
- Regular views for real-time calculations (event_financial_summary)

---

## Measurement Coverage Checklist

| Metric Category | Raw Data Tracked | Derived Calculations | Aggregations | Time-Series  |
| --------------- | ---------------- | -------------------- | ------------ | ------------ |
| **Client**      | ✅ 38 fields     | ✅ 21 calcs          | ✅ 28 aggs   | ✅ 8 trends  |
| **Event**       | ✅ 68 fields     | ✅ 37 calcs          | ✅ 51 aggs   | ✅ 13 trends |
| **Menu**        | ✅ 18 fields     | ✅ 11 calcs          | ✅ 11 aggs   | ✅ 4 trends  |
| **Recipe**      | ✅ 28 fields     | ✅ 5 calcs           | ✅ 19 aggs   | ✅ 5 trends  |
| **Inquiry**     | ✅ 26 fields     | ✅ 8 calcs           | ✅ 21 aggs   | ✅ 6 trends  |
| **Financial**   | ✅ 31 fields     | ✅ 27 calcs          | ✅ 23 aggs   | ✅ 8 trends  |
| **Message**     | ✅ 15 fields     | ✅ 3 calcs           | ✅ 8 aggs    | ✅ 3 trends  |
| **Grocery**     | ✅ 8 fields      | ✅ 9 calcs           | ✅ 5 aggs    | —            |
| **Packing**     | ✅ 5 fields      | ✅ 5 calcs           | ✅ 3 aggs    | —            |
| **Timeline**    | ✅ 12 fields     | ✅ 4 calcs           | —            | —            |
| **Loyalty**     | ✅ 6 fields      | ✅ 3 calcs           | —            | —            |
| **AAR**         | ✅ 13 fields     | —                    | ✅ 8 aggs    | ✅ 2 trends  |

---

## Next Steps

1. **Create Migration Files** - Translate this schema into Supabase SQL migrations
2. **Run Migrations Locally** - Test on local Supabase instance
3. **Generate Types** - Create TypeScript types from schema
4. **Build Server Actions** - Map CRUD operations to server actions
5. **Build Dashboard Queries** - Connect views to dashboard UI
6. **Test Immutability** - Verify ledger cannot be modified
7. **Test Multi-Tenancy** - Verify RLS isolation works
8. **Seed Test Data** - Use Feb 14 observation as test case

---

**END OF DATABASE SCHEMA DESIGN**
