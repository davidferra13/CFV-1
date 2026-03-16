# ChefFlow Communication Platform - Complete Architecture Specification

**Date:** 2026-03-15
**Status:** Draft - Pending Developer Review
**Branch:** To be implemented on `feature/communication-platform`
**Basis:** `docs/research/communication-research-synthesis.md` (60+ sources, 20+ platforms analyzed)

---

## TABLE OF CONTENTS

1. [Scope and Objectives](#1-scope-and-objectives)
2. [Existing Infrastructure Map](#2-existing-infrastructure-map)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Phase 1: Communication Foundation](#4-phase-1-communication-foundation)
5. [Phase 2: Collaboration Layer](#5-phase-2-collaboration-layer)
6. [Phase 3: Financial Automation](#6-phase-3-financial-automation)
7. [Phase 4: Scale Features](#7-phase-4-scale-features)
8. [Database Migrations](#8-database-migrations)
9. [Server Actions Registry](#9-server-actions-registry)
10. [Frontend Component Map](#10-frontend-component-map)
11. [Remy AI Integration Points](#11-remy-ai-integration-points)
12. [Privacy and Security](#12-privacy-and-security)
13. [Testing Strategy](#13-testing-strategy)
14. [Risk Analysis](#14-risk-analysis)

---

## 1. SCOPE AND OBJECTIVES

### What We're Building

A unified communication system that eliminates the 5-8 tool fragmentation private chefs suffer from. The system covers the complete client lifecycle: first inquiry through post-event follow-up, with every message, menu revision, and payment milestone tracked in one place.

### Core Objectives (Mapped to Research)

| Objective                                  | Research Pain Point                                         | Metric                                         |
| ------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------- |
| Reduce inquiry response time to <5 minutes | 40% of bookings lost to slow response (#1 client complaint) | Time from inquiry to first response            |
| Eliminate tool fragmentation               | Chef uses 5-8 disconnected tools (#3 chef pain point)       | Tools needed outside ChefFlow                  |
| Automate payment milestone tracking        | Chefs front grocery costs, chase payments for weeks (#4)    | Outstanding balance visibility                 |
| Enable interactive menu approval           | 3-15 email exchanges per menu (no competitor solves this)   | Menu approval round-trips                      |
| Persist dietary/allergen profiles          | No platform tracks this across bookings (life-safety)       | Allergy recall accuracy                        |
| Automate post-event follow-up              | Zero platforms have this (kills repeat business)            | Post-event feedback collection rate            |
| Enforce professional boundaries            | Clients text at all hours (#6)                              | Messages outside business hours auto-responded |

### What We're NOT Building

- SMS integration (deferred; email + in-app + push covers 90% of use cases)
- Video messaging (deferred; low-frequency need)
- Client-to-client communication (not a use case for private chefs)
- Chef community/peer benchmarking (requires critical mass, Phase 4+)

---

## 2. EXISTING INFRASTRUCTURE MAP

### What Already Works (Build On, Don't Replace)

| Component           | Current State                                               | Extension Needed                                       |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| **Inquiry System**  | 7-state FSM, 4 creation paths, GOLDMINE scoring             | Add auto-response trigger, template selection          |
| **Client Profiles** | 30+ preference fields, allergy records, milestones          | Add communication preferences, quiet hours             |
| **Event FSM**       | 8-state with 74 side effects, full lifecycle                | Add menu approval sub-states, guest count change flow  |
| **Quotes**          | 5-state FSM, PDF generation, email templates                | Add client-facing interactive approval                 |
| **Conversations**   | `conversations` + `chat_messages` tables, Supabase Realtime | Add context linking (inquiry/event), message templates |
| **Notifications**   | 40+ email templates, in-app bell, OneSignal push            | Add scheduled sends, business hours routing            |
| **Remy**            | Deterministic classifier + Ollama, 3-tier action system     | Add auto-response drafting, follow-up suggestions      |
| **Embed Widget**    | Public iframe, CORS-enabled, creates inquiry + client       | Add auto-acknowledge flow                              |
| **Ledger**          | Immutable append-only, computed balances                    | Add milestone definitions, automated reminders         |
| **Client Reviews**  | Rating + dimensions + feedback text                         | Add post-event automation trigger                      |

### Key Tables We'll Extend

```
clients              - Add: communication_preferences JSONB, quiet_hours_start/end, auto_response_enabled
inquiries            - Add: auto_responded_at, response_template_id
events               - Add: guest_count_change_log JSONB, menu_revision_count
conversations        - Already has context_type (standalone, inquiry, event) - sufficient
chat_messages        - Already has message_type + attachments - sufficient
notifications        - Already has category + metadata JSONB - sufficient
```

### Key Tables We'll Create

```
response_templates       - Chef-customizable templates for common communications
communication_preferences - Per-client communication settings
payment_milestones       - Configurable payment schedule per event
menu_revisions           - Version history for menu proposals
guest_count_changes      - Audit log of guest count modifications
post_event_surveys       - Survey definitions and responses
auto_response_rules      - Business hours + channel-specific auto-reply config
follow_up_sequences      - Automated follow-up chains (post-event, dormant client, etc.)
```

---

## 3. SYSTEM ARCHITECTURE OVERVIEW

### Data Flow Architecture

```
                    INBOUND CHANNELS
                    ================
    Email (Gmail)  |  Embed Widget  |  Remy Chat  |  Client Portal
         |              |                |              |
         v              v                v              v
    +---------------------------------------------------------+
    |              INQUIRY INTAKE LAYER                        |
    |  GOLDMINE extraction  |  Auto-response engine  |  Lead  |
    |  Deterministic parse  |  Template selection     |  Score |
    +---------------------------------------------------------+
                            |
                            v
    +---------------------------------------------------------+
    |              UNIFIED CONVERSATION LAYER                  |
    |  conversations table  |  chat_messages  |  Supabase RT  |
    |  Context: inquiry_id / event_id / standalone             |
    |  Templates  |  Scheduling  |  Business hours routing     |
    +---------------------------------------------------------+
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
    +---------------+ +------------+ +----------------+
    | MENU APPROVAL | | PAYMENT    | | POST-EVENT     |
    | Revisions     | | Milestones | | Follow-up      |
    | Client portal | | Reminders  | | Surveys        |
    | Version hist  | | Ledger     | | Review request |
    +---------------+ +------------+ +----------------+
              |             |             |
              v             v             v
    +---------------------------------------------------------+
    |              NOTIFICATION DISPATCH                        |
    |  Email (Resend)  |  In-App (bell)  |  Push (OneSignal)  |
    |  Business hours check  |  Quiet hours respect            |
    +---------------------------------------------------------+
```

### Component Ownership

```
lib/communication/
  ├── auto-response.ts          - Inquiry auto-response engine
  ├── business-hours.ts         - Business hours logic + quiet hours
  ├── templates/
  │   ├── actions.ts            - CRUD for response templates
  │   └── defaults.ts           - Default template library
  ├── follow-ups/
  │   ├── actions.ts            - Follow-up sequence management
  │   ├── scheduler.ts          - Cron-triggered follow-up dispatch
  │   └── sequences.ts          - Sequence definitions
  └── preferences.ts            - Per-client communication preferences

lib/menus/
  ├── revisions.ts              - Menu version history
  └── approval-portal.ts        - Client-facing approval logic

lib/payments/
  ├── milestones.ts             - Payment milestone definitions
  └── reminders.ts              - Automated payment reminders

lib/feedback/
  ├── surveys.ts                - Post-event survey engine
  ├── templates.ts              - Survey question templates
  └── review-request.ts         - Satisfaction-gated review requests

lib/guests/
  └── count-changes.ts          - Guest count change handling + recalculation
```

---

## 4. PHASE 1: COMMUNICATION FOUNDATION

**Goal:** Reduce inquiry response time from hours/days to seconds. Establish professional communication boundaries. Give chefs reusable templates.

### 4.1 Instant Inquiry Auto-Response

**Problem:** 40% of bookings lost to slow response. Solo chefs check email twice a day while platforms respond in minutes.

**Design:**

When any inquiry arrives (any of the 4 creation paths), the system immediately:

1. Creates the inquiry record (existing flow)
2. Checks if auto-response is enabled for this chef
3. Selects the appropriate response template based on channel + occasion
4. Sends a personalized auto-response via email within 5 seconds
5. Records `auto_responded_at` on the inquiry

**Auto-Response Engine (`lib/communication/auto-response.ts`):**

```typescript
// Server action - called from inquiry creation paths
export async function triggerAutoResponse(inquiryId: string, tenantId: string) {
  // 1. Check if chef has auto-response enabled
  const config = await getAutoResponseConfig(tenantId)
  if (!config.enabled) return

  // 2. Load inquiry + client data
  const inquiry = await getInquiry(inquiryId, tenantId)
  if (!inquiry.client_id) return // Can't respond without contact info

  const client = await getClient(inquiry.client_id, tenantId)
  if (!client.email) return // No email to respond to

  // 3. Select template based on channel + occasion
  const template = await selectTemplate(tenantId, {
    channel: inquiry.channel,
    occasion: inquiry.confirmed_occasion,
    hasDate: !!inquiry.confirmed_date,
    hasBudget: !!inquiry.confirmed_budget_cents,
  })

  // 4. Personalize template with Remy (local AI)
  const personalizedBody = await personalizeTemplate(template, {
    clientName: client.full_name,
    occasion: inquiry.confirmed_occasion,
    date: inquiry.confirmed_date,
    chefName: config.chefName,
    businessName: config.businessName,
    // Remy adds warmth + professionalism without changing core content
  })

  // 5. Send email
  await sendAutoResponseEmail({
    to: client.email,
    subject: template.subject,
    body: personalizedBody,
    replyTo: config.replyToEmail,
  })

  // 6. Record auto-response
  await supabase
    .from('inquiries')
    .update({ auto_responded_at: new Date().toISOString() })
    .eq('id', inquiryId)

  // 7. Create system message in conversation
  await createSystemMessage(inquiry.id, tenantId, {
    type: 'auto_response_sent',
    template_id: template.id,
    sent_to: client.email,
  })
}
```

**Template Selection Logic:**

```
Priority order:
1. Chef's custom template matching channel + occasion (exact match)
2. Chef's custom template matching channel only
3. Chef's custom default template
4. System default template (built-in)

Template variables:
  {{client_name}}     - Client's first name
  {{occasion}}        - Event occasion (if known)
  {{event_date}}      - Event date (if known)
  {{chef_name}}       - Chef's display name
  {{business_name}}   - Chef's business name
  {{response_time}}   - Expected response time ("within 24 hours")
  {{booking_link}}    - Direct booking link
```

**Integration Points:**

- `lib/inquiries/actions.ts` `createInquiry()` - Add `triggerAutoResponse()` as non-blocking side effect
- `lib/gmail/extract-inquiry-fields.ts` - Add trigger after GOLDMINE extraction
- `app/api/embed/inquiry/route.ts` - Add trigger after embed form submission
- `lib/ai/agent-actions/inquiry-actions.ts` - Add trigger after Remy creates inquiry

**Database Changes:**

```sql
-- Add to inquiries table
ALTER TABLE inquiries ADD COLUMN auto_responded_at TIMESTAMPTZ;

-- New table: auto_response_config
CREATE TABLE auto_response_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  enabled BOOLEAN NOT NULL DEFAULT false,
  default_response_time TEXT DEFAULT 'within 24 hours',
  reply_to_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id)
);

-- New table: response_templates
CREATE TABLE response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'auto_response', 'follow_up', 'menu_proposal', 'booking_confirmation', 'payment_reminder', 'post_event', 'general'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  channel_filter TEXT, -- NULL = all channels, or specific channel
  occasion_filter TEXT, -- NULL = all occasions, or specific occasion
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**UI Components:**

| Component              | Location                            | Purpose                                                |
| ---------------------- | ----------------------------------- | ------------------------------------------------------ |
| `AutoResponseSettings` | `/settings/communication`           | Enable/disable, set response time, reply-to email      |
| `TemplateEditor`       | `/settings/communication/templates` | Create/edit response templates with variable insertion |
| `TemplateSelector`     | Inquiry detail page                 | Quick-select template for manual response              |
| `AutoResponseBadge`    | Inquiry list                        | Shows "Auto-responded" badge with timestamp            |

### 4.2 Business Hours and Boundary Management

**Problem:** Clients text at all hours. No work-life boundary. Chef's phone never stops.

**Design:**

Chef configures business hours in settings. The system enforces them:

1. **During business hours:** Messages delivered normally, notifications sent immediately
2. **Outside business hours:** Auto-response acknowledges receipt, holds notification until business hours resume, queues message for morning digest
3. **Emergency channel:** Day-of-event messages always go through regardless of hours

**Business Hours Engine (`lib/communication/business-hours.ts`):**

```typescript
export interface BusinessHoursConfig {
  timezone: string // e.g., 'America/New_York'
  schedule: {
    [day: string]: {
      // 'monday' through 'sunday'
      enabled: boolean
      start: string // '09:00'
      end: string // '17:00'
    }
  }
  outsideHoursMessage: string // Auto-response text
  emergencyEnabled: boolean // Allow day-of-event bypass
  emergencyWindowHours: number // Hours before event (default: 24)
}

export function isWithinBusinessHours(config: BusinessHoursConfig, now?: Date): boolean {
  const currentTime = now ?? new Date()
  const zonedTime = toZonedTime(currentTime, config.timezone)
  const dayName = getDayName(zonedTime) // 'monday', 'tuesday', etc.
  const dayConfig = config.schedule[dayName]

  if (!dayConfig?.enabled) return false

  const currentMinutes = zonedTime.getHours() * 60 + zonedTime.getMinutes()
  const startMinutes = parseTimeToMinutes(dayConfig.start)
  const endMinutes = parseTimeToMinutes(dayConfig.end)

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

export function isEmergencyContext(config: BusinessHoursConfig, eventDate: string | null): boolean {
  if (!config.emergencyEnabled || !eventDate) return false
  const hoursUntilEvent = differenceInHours(new Date(eventDate), new Date())
  return hoursUntilEvent <= config.emergencyWindowHours && hoursUntilEvent >= 0
}

export function getNextBusinessHoursStart(config: BusinessHoursConfig): Date {
  // Returns the next time business hours begin
  // Used for scheduling held notifications
}
```

**Database Changes:**

```sql
CREATE TABLE business_hours_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  schedule JSONB NOT NULL DEFAULT '{
    "monday":    {"enabled": true,  "start": "09:00", "end": "17:00"},
    "tuesday":   {"enabled": true,  "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true,  "start": "09:00", "end": "17:00"},
    "thursday":  {"enabled": true,  "start": "09:00", "end": "17:00"},
    "friday":    {"enabled": true,  "start": "09:00", "end": "17:00"},
    "saturday":  {"enabled": false, "start": "09:00", "end": "17:00"},
    "sunday":    {"enabled": false, "start": "09:00", "end": "17:00"}
  }',
  outside_hours_message TEXT DEFAULT 'Thanks for reaching out! I am currently outside business hours and will respond when I am back. If this is about an event happening today, I will get back to you right away.',
  emergency_enabled BOOLEAN DEFAULT true,
  emergency_window_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id)
);
```

**UI Components:**

| Component               | Location                  | Purpose                                      |
| ----------------------- | ------------------------- | -------------------------------------------- |
| `BusinessHoursEditor`   | `/settings/communication` | Visual schedule editor (grid of day + hours) |
| `OutsideHoursIndicator` | Chat/messaging UI         | Shows when client is messaging outside hours |
| `BusinessHoursWidget`   | Client portal             | Shows chef's availability hours              |

### 4.3 Response Templates

**Problem:** Chefs write the same responses over and over. Inquiry acknowledgments, booking confirmations, payment reminders all start from scratch.

**Design:**

ChefFlow ships with 12 default templates. Chefs customize or create their own. Templates support variables and Remy personalization.

**Default Template Library:**

| Category               | Template Name                | When Used                                           |
| ---------------------- | ---------------------------- | --------------------------------------------------- |
| `auto_response`        | Inquiry Acknowledgment       | Auto-sent on new inquiry                            |
| `auto_response`        | Outside Business Hours       | Auto-sent outside hours                             |
| `follow_up`            | Inquiry Follow-Up (3 day)    | When inquiry goes stale                             |
| `follow_up`            | Dormant Client Re-engagement | When client hasn't booked in 90+ days               |
| `menu_proposal`        | Menu Proposal Cover Letter   | Attached to menu proposal send                      |
| `booking_confirmation` | Booking Confirmed            | After event confirmed                               |
| `payment_reminder`     | Deposit Reminder             | When deposit overdue                                |
| `payment_reminder`     | Balance Reminder             | When balance due approaching                        |
| `post_event`           | Thank You                    | 24-48 hours after event                             |
| `post_event`           | Feedback Request             | 3 days after event                                  |
| `post_event`           | Review Request               | 7 days after event (only if satisfaction confirmed) |
| `general`              | Pre-Event Checklist          | 7 days before event                                 |

**Server Action (`lib/communication/templates/actions.ts`):**

```typescript
'use server'

export async function getTemplates(category?: string) {
  const user = await requireChef()
  // Returns chef's custom templates + system defaults (merged, custom overrides system)
}

export async function createTemplate(input: CreateTemplateInput) {
  const user = await requireChef()
  // Zod validation, tenant-scoped insert
}

export async function updateTemplate(id: string, input: UpdateTemplateInput) {
  const user = await requireChef()
  // Tenant-scoped update
}

export async function deleteTemplate(id: string) {
  const user = await requireChef()
  // Soft delete (set deleted_at)
}

export async function renderTemplate(
  templateId: string,
  context: TemplateContext
): Promise<string> {
  const user = await requireChef()
  // 1. Load template
  // 2. Replace variables ({{client_name}}, {{occasion}}, etc.)
  // 3. Optionally pass through Remy for personalization (Ollama, local)
  // 4. Return rendered text
}
```

### 4.4 Client Onboarding Workflow

**Problem:** Client intake currently happens via ad-hoc messages. Critical information (allergies, kitchen constraints, preferences) gets scattered across texts and emails instead of landing in the client profile.

**Design:**

When a new client is created (from inquiry conversion or manual), the system generates a personalized intake form link. The client fills it out on their own time. Responses auto-populate their profile.

**Intake Form Fields (Progressive, Not Overwhelming):**

```
Section 1: Essential (required)
  - Dietary restrictions (multi-select + free text)
  - Allergies with severity (life-threatening / intolerance / preference)
  - Number of people in household

Section 2: Preferences (optional)
  - Favorite cuisines
  - Favorite dishes
  - Dislikes (ingredients they never want)
  - Spice tolerance (none / mild / medium / hot / very hot)

Section 3: Kitchen & Logistics (optional, for in-home service)
  - Kitchen size and constraints
  - Equipment available
  - Parking instructions
  - Access instructions
  - House rules

Section 4: Communication (optional)
  - Preferred contact method (email / phone / text)
  - Preferred response frequency
  - Any important dates (birthdays, anniversaries)
```

**Implementation:**

```typescript
// Client-facing route: app/(client)/onboarding/[token]/page.tsx
// Token is a signed JWT with client_id + tenant_id, expires in 7 days
// No login required - the link IS the auth for this specific form

export default async function OnboardingPage({ params }: { params: { token: string } }) {
  const { clientId, tenantId } = verifyOnboardingToken(params.token)
  const client = await getClientForOnboarding(clientId, tenantId)

  // Pre-populate with any data already known (from inquiry extraction)
  return <OnboardingForm client={client} token={params.token} />
}
```

**Server Action (`lib/clients/onboarding.ts`):**

```typescript
'use server'

export async function submitOnboarding(token: string, input: OnboardingInput) {
  const { clientId, tenantId } = verifyOnboardingToken(token)

  // Update client profile with all provided fields
  // Create allergy records for each allergen
  // Set onboarding_completed_at timestamp
  // Notify chef that client completed onboarding
  // Create system message in conversation
}

export async function generateOnboardingLink(clientId: string) {
  const user = await requireChef()
  // Generate signed JWT token
  // Return link: /onboarding/{token}
  // Optionally auto-send via email
}
```

**Database Changes:**

```sql
ALTER TABLE clients ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN onboarding_token TEXT; -- JWT, nullable
ALTER TABLE clients ADD COLUMN communication_preference JSONB DEFAULT '{}';
-- communication_preference schema:
-- {
--   "preferred_method": "email",
--   "preferred_frequency": "as_needed",
--   "quiet_hours_start": "21:00",
--   "quiet_hours_end": "08:00",
--   "quiet_hours_timezone": "America/New_York"
-- }
```

---

## 5. PHASE 2: COLLABORATION LAYER

**Goal:** Replace the 3-15 email exchange menu approval process with interactive, version-tracked collaboration. Handle guest count changes without chaos.

### 5.1 Interactive Menu Proposal and Approval

**Problem:** Menu approval is the highest-friction communication touchpoint. Every competitor uses static PDFs. Chefs and clients exchange 3-15 emails per menu.

**Design:**

The chef creates a menu proposal in ChefFlow (existing menu system). Instead of exporting a PDF and emailing it, the chef sends a **proposal link** to the client. The client opens a web view where they can:

1. View the full menu with course structure
2. See dietary flags per dish (auto-cross-referenced against their profile)
3. Approve the entire menu or flag individual dishes
4. Leave comments on specific dishes ("Can we swap the salmon for chicken?")
5. See pricing (if chef enables cost visibility)
6. Accept or request changes with one click

Every interaction creates a **menu revision** with full version history.

**Client-Facing Approval Portal:**

```
Route: app/(client)/proposals/[eventId]/page.tsx
Auth: Client must be logged in (requireClient)
```

**Page Structure:**

```
+--------------------------------------------------+
|  Menu Proposal from [Chef Name]                   |
|  Event: [Occasion] - [Date] - [Guest Count]      |
+--------------------------------------------------+
|                                                    |
|  COURSE 1: Appetizers                              |
|  +----------------------------------------------+  |
|  | Seared Scallops with Citrus Beurre Blanc      |  |
|  | [DAIRY] [SHELLFISH warning - matches profile] |  |
|  | [Approve] [Flag] [Comment]                    |  |
|  +----------------------------------------------+  |
|  | Heirloom Tomato Tartare                       |  |
|  | [VEGAN] [No allergen conflicts]               |  |
|  | [Approve] [Flag] [Comment]                    |  |
|  +----------------------------------------------+  |
|                                                    |
|  COURSE 2: Main                                    |
|  +----------------------------------------------+  |
|  | Pan-Roasted Halibut                           |  |
|  | [FISH] [No allergen conflicts]                |  |
|  | [Approve] [Flag] [Comment]                    |  |
|  +----------------------------------------------+  |
|                                                    |
|  Pricing: $150/person x 12 guests = $1,800        |
|                                                    |
|  [Approve Entire Menu]  [Request Changes]          |
+--------------------------------------------------+
```

**Menu Revision System:**

```sql
CREATE TABLE menu_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id),
  event_id UUID NOT NULL REFERENCES events(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  version INTEGER NOT NULL DEFAULT 1,
  revision_type TEXT NOT NULL, -- 'initial', 'chef_update', 'client_feedback'
  snapshot JSONB NOT NULL, -- Full menu state at this version
  changes_summary TEXT, -- Human-readable summary of what changed
  created_by UUID, -- NULL for system
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(menu_id, version)
);

CREATE TABLE menu_dish_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_revision_id UUID NOT NULL REFERENCES menu_revisions(id),
  dish_id UUID NOT NULL REFERENCES dishes(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'approved', 'flagged', 'pending'
  comment TEXT,
  allergen_conflict BOOLEAN DEFAULT false,
  allergen_details TEXT, -- Which allergens conflict
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Allergen Cross-Reference Engine:**

```typescript
// lib/menus/allergen-check.ts

export async function crossReferenceAllergens(
  menuId: string,
  clientId: string,
  tenantId: string
): Promise<AllergenConflict[]> {
  // 1. Load client's allergy records (from client_allergy_records table)
  const allergyRecords = await getClientAllergyRecords(clientId, tenantId)

  // 2. Load all dishes in the menu with their ingredient lists
  const dishes = await getMenuDishesWithIngredients(menuId, tenantId)

  // 3. For each dish, check each ingredient against client allergens
  const conflicts: AllergenConflict[] = []
  for (const dish of dishes) {
    for (const ingredient of dish.ingredients) {
      for (const allergy of allergyRecords) {
        if (ingredientMatchesAllergen(ingredient.name, allergy.allergen)) {
          conflicts.push({
            dishId: dish.id,
            dishName: dish.name,
            ingredientName: ingredient.name,
            allergen: allergy.allergen,
            severity: allergy.severity,
            confirmedByChef: allergy.confirmed_by_chef,
          })
        }
      }
    }
  }

  return conflicts
}

// Deterministic matching - no AI needed
function ingredientMatchesAllergen(ingredient: string, allergen: string): boolean {
  // Uses a lookup table of allergen groups
  // e.g., "shellfish" matches: shrimp, crab, lobster, crayfish, etc.
  // e.g., "dairy" matches: milk, cream, butter, cheese, yogurt, etc.
  const allergenGroups = ALLERGEN_INGREDIENT_MAP[allergen.toLowerCase()]
  if (!allergenGroups) return false
  return allergenGroups.some((term) => ingredient.toLowerCase().includes(term))
}
```

**Server Actions (`lib/menus/approval-portal.ts`):**

```typescript
'use server'

export async function sendMenuProposal(eventId: string, menuId: string) {
  const user = await requireChef()
  // 1. Create initial menu_revision (version 1, snapshot current state)
  // 2. Run allergen cross-reference
  // 3. Update event.menu_sent_at
  // 4. Send email to client with proposal link
  // 5. Create notification for client
  // 6. Create system message in event conversation
}

export async function submitMenuFeedback(eventId: string, feedback: DishFeedback[]) {
  const user = await requireClient()
  // 1. Validate client owns this event
  // 2. Insert menu_dish_feedback records
  // 3. If all dishes approved: update event.menu_approval_status = 'approved'
  // 4. If any flagged: update event.menu_approval_status = 'revision_requested'
  // 5. Create new menu_revision with type 'client_feedback'
  // 6. Notify chef of feedback
  // 7. Create system message in event conversation
}

export async function approveEntireMenu(eventId: string) {
  const user = await requireClient()
  // 1. Mark all dishes as approved
  // 2. Update event.menu_approval_status = 'approved'
  // 3. Update event.menu_approved_at
  // 4. Notify chef
  // 5. Create system message
}
```

**Event Table Extensions:**

```sql
-- menu_approval_status already exists on events table
-- Add tracking for revisions
ALTER TABLE events ADD COLUMN menu_revision_count INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN menu_last_client_feedback_at TIMESTAMPTZ;
```

### 5.2 Menu Change Version History

Every modification to a menu after the initial proposal creates a revision record. The chef and client can view the full evolution.

**UI: Revision Timeline (sidebar on menu detail page)**

```
v3 - Client Feedback (Mar 10)
  "Swapped salmon for chicken on Course 2. Added vegetarian option."
  [View this version]

v2 - Chef Update (Mar 8)
  "Updated appetizer course. Added scallop dish."
  [View this version]

v1 - Initial Proposal (Mar 5)
  "Original menu sent to client."
  [View this version]
```

**Diff View:** When comparing versions, highlight added dishes in green, removed in red, modified in yellow.

### 5.3 Smart Guest Count Change Handling

**Problem:** Guest count changes close to the event cause chaos: portion recalculation, grocery list changes, cost recalculation, frantic market runs.

**Design:**

When the client updates the guest count through the portal, the system:

1. Records the change with timestamp in an audit log
2. Auto-recalculates the quote (if pricing is per-person)
3. Auto-adjusts grocery list quantities (if recipes are linked)
4. Notifies the chef with a clear diff ("12 guests changed to 16, +$600")
5. Enforces a configurable cutoff window (e.g., changes within 72 hours incur surcharge)
6. Requires client acknowledgment of price change before confirming

**Database Changes:**

```sql
CREATE TABLE guest_count_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  previous_count INTEGER NOT NULL,
  new_count INTEGER NOT NULL,
  requested_by UUID NOT NULL, -- client or chef user ID
  requested_by_role TEXT NOT NULL, -- 'chef' or 'client'
  price_impact_cents INTEGER, -- Positive = increase, negative = decrease
  surcharge_applied BOOLEAN DEFAULT false,
  surcharge_cents INTEGER DEFAULT 0,
  acknowledged_by_client BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Server Action (`lib/guests/count-changes.ts`):**

```typescript
'use server'

export async function requestGuestCountChange(eventId: string, newCount: number, notes?: string) {
  const user = await requireClient() // Or requireChef for chef-initiated
  const event = await getEvent(eventId, user.tenantId ?? user.entityId)

  // 1. Calculate price impact
  const priceImpact = calculatePriceImpact(event, newCount)

  // 2. Check cutoff window
  const surcharge = calculateSurcharge(event, newCount)

  // 3. Record change request
  const change = await insertGuestCountChange({
    event_id: eventId,
    tenant_id: event.tenant_id,
    previous_count: event.guest_count,
    new_count: newCount,
    requested_by: user.id,
    requested_by_role: user.role,
    price_impact_cents: priceImpact,
    surcharge_applied: surcharge > 0,
    surcharge_cents: surcharge,
    notes,
  })

  // 4. If chef-initiated, apply immediately
  // If client-initiated and price increases, require chef acknowledgment
  if (user.role === 'chef' || priceImpact <= 0) {
    await applyGuestCountChange(change.id)
  } else {
    // Notify chef for approval
    await notifyChefOfGuestCountChange(change)
  }
}

async function applyGuestCountChange(changeId: string) {
  // 1. Update event.guest_count
  // 2. Update event.guest_count_confirmed
  // 3. Recalculate quote if per-person pricing
  // 4. Recalculate grocery quantities if recipes linked
  // 5. Notify both parties
  // 6. Create system message in event conversation
  // 7. Log in guest_count_change_log JSONB on events table
}
```

**Cutoff/Surcharge Configuration:**

```sql
-- Part of the chef's booking settings (existing booking_config or new)
-- Stored as JSONB in chef's settings
-- {
--   "guest_count_cutoff_hours": 72,
--   "guest_count_surcharge_percentage": 20,
--   "guest_count_max_increase_percentage": 50,
--   "require_chef_approval_for_increase": true
-- }
```

---

## 6. PHASE 3: FINANCIAL AUTOMATION

**Goal:** Eliminate payment chasing. Automate the deposit-to-balance-to-reimbursement lifecycle. Close the post-event loop that kills repeat business.

### 6.1 Payment Milestone Tracking

**Problem:** Chefs use spreadsheets to track who owes what. They front grocery costs and wait weeks for reimbursement. No platform handles the private chef payment lifecycle.

**Design:**

Each event gets a configurable set of payment milestones. The system tracks progress against milestones and sends automated reminders.

**Default Milestone Template (Private Chef Standard):**

```
1. Deposit (25%) - Due at booking confirmation
2. Grocery Advance (estimated food cost) - Due 7 days before event
3. Balance (remaining labor + service) - Due day of event
4. Grocery Reconciliation (actual - estimate) - Due 3 days after event
5. Tip (optional) - Open-ended
```

**Database Changes:**

```sql
CREATE TABLE payment_milestone_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  name TEXT NOT NULL, -- 'Standard Event', 'Multi-Day', 'Recurring Weekly'
  is_default BOOLEAN DEFAULT false,
  milestones JSONB NOT NULL,
  -- milestones schema: [
  --   {
  --     "name": "Deposit",
  --     "percentage": 25,       -- OR fixed_amount_cents
  --     "due_trigger": "on_confirmation",  -- 'on_confirmation', 'days_before_event', 'day_of_event', 'days_after_event'
  --     "due_offset_days": 0,
  --     "reminder_days_before": [3, 1],
  --     "required": true
  --   }
  -- ]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  milestone_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reminded', 'paid', 'overdue', 'waived'
  ledger_entry_id UUID REFERENCES ledger_entries(id), -- Link to actual payment
  reminder_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Server Actions (`lib/payments/milestones.ts`):**

```typescript
'use server'

export async function createMilestonesForEvent(eventId: string, templateId?: string) {
  const user = await requireChef()
  // 1. Load template (or default)
  // 2. Calculate amounts from event quoted_price_cents
  // 3. Calculate due dates from event_date
  // 4. Insert event_payment_milestones records
  // 5. Schedule first reminder
}

export async function recordMilestonePayment(milestoneId: string, ledgerEntryId: string) {
  const user = await requireChef()
  // 1. Link milestone to ledger entry
  // 2. Update milestone status to 'paid'
  // 3. Notify client of payment received
  // 4. Check if all milestones paid - if so, update event
  // 5. Create system message
}

export async function sendMilestoneReminder(milestoneId: string) {
  const user = await requireChef()
  // 1. Load milestone + event + client
  // 2. Select reminder template based on milestone type
  // 3. Send email
  // 4. Update reminder_sent_at
  // 5. Create notification
}
```

**Automated Reminder Engine (Cron):**

```typescript
// app/api/scheduled/payment-reminders/route.ts
// Called by Vercel Cron or external scheduler

export async function GET() {
  // 1. Find all milestones where:
  //    - status = 'pending'
  //    - due_date is within reminder window
  //    - reminder not yet sent for this window
  // 2. For each: send reminder email, update milestone
  // 3. Find all milestones where:
  //    - status = 'pending' or 'reminded'
  //    - due_date is past
  // 4. Mark as 'overdue', notify chef
}
```

**Client Portal Payment View:**

```
+--------------------------------------------------+
|  Payment Schedule - Birthday Dinner (Mar 20)      |
+--------------------------------------------------+
|                                                    |
|  [PAID]    Deposit (25%)           $450    Mar 5  |
|  [DUE]     Grocery Advance         $350    Mar 13 |
|  [UPCOMING] Balance               $1,000   Mar 20 |
|  [PENDING]  Grocery Reconciliation  TBD    Mar 23 |
|                                                    |
|  Total Quoted: $1,800                              |
|  Total Paid:   $450                                |
|  Remaining:    $1,350                              |
|                                                    |
|  [Pay Now - $350 Grocery Advance]                  |
+--------------------------------------------------+
```

### 6.2 Post-Event Feedback Loop

**Problem:** Zero platforms handle post-event feedback. Chef disappears after the event. Kills repeat business and referrals.

**Design:**

After an event transitions to `completed`, the system triggers a timed sequence:

```
Day 0 (completion):  Chef completes event
Day 1 (24 hours):    Auto-send thank-you email (warm, personal, Remy-drafted)
Day 3:               Auto-send feedback survey (5-7 questions)
Day 7:               IF satisfaction >= 4/5: Auto-send review request
Day 14:              Auto-send referral ask (only if feedback was positive)
Day 30:              If no re-booking: Send re-engagement message
```

**This sequence already partially exists** in the event FSM side effects (`post_event_survey`, Inngest sequence for 3d/7d/14d). We extend it with structured surveys and satisfaction-gated review requests.

**Database Changes:**

```sql
CREATE TABLE post_event_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  -- Ratings (1-5)
  food_quality INTEGER CHECK (food_quality BETWEEN 1 AND 5),
  portion_size INTEGER CHECK (portion_size BETWEEN 1 AND 5),
  punctuality INTEGER CHECK (punctuality BETWEEN 1 AND 5),
  communication INTEGER CHECK (communication BETWEEN 1 AND 5),
  presentation INTEGER CHECK (presentation BETWEEN 1 AND 5),
  cleanup INTEGER CHECK (cleanup BETWEEN 1 AND 5),
  overall INTEGER CHECK (overall BETWEEN 1 AND 5),
  -- Open text
  what_they_loved TEXT,
  what_could_improve TEXT,
  would_book_again BOOLEAN,
  -- Specific dish feedback
  dish_feedback JSONB, -- [{dish_id, dish_name, rating, comment}]
  -- Survey delivery
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  survey_token TEXT NOT NULL, -- Signed JWT for unauthenticated access
  -- Follow-up
  review_request_sent_at TIMESTAMPTZ,
  review_request_eligible BOOLEAN, -- overall >= 4
  referral_ask_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);
```

**Survey Delivery:**

```typescript
// Client receives email with link: /feedback/[token]
// Token is a signed JWT: { survey_id, event_id, client_id, tenant_id, exp: 30 days }
// No login required - the link IS the auth

// Route: app/(public)/feedback/[token]/page.tsx
export default async function FeedbackPage({ params }: { params: { token: string } }) {
  const { surveyId } = verifySurveyToken(params.token)
  const survey = await getSurveyWithEventDetails(surveyId)

  return <PostEventSurveyForm survey={survey} token={params.token} />
}
```

**Review Request Gate:**

```typescript
export async function processCompletedSurvey(surveyId: string) {
  const survey = await getSurvey(surveyId)

  // Only request review if overall satisfaction >= 4
  if (survey.overall >= 4) {
    await markReviewEligible(surveyId)
    // Schedule review request for Day 7
    await scheduleFollowUp(survey.event_id, 'review_request', 7)
  }

  // Store feedback on client profile for Remy context
  await updateClientFromFeedback(survey.client_id, survey.tenant_id, {
    lastFeedback: {
      overall: survey.overall,
      lovedDishes: extractLovedDishes(survey.dish_feedback),
      improvements: survey.what_could_improve,
      wouldBookAgain: survey.would_book_again,
    },
  })

  // Notify chef of feedback received
  await notifyChefOfFeedback(survey)
}
```

### 6.3 Repeat Client Intelligence

**Problem:** Repeat clients hate re-stating preferences. They feel devalued when treated like a new booking.

**Design:**

When a repeat client books (or an inquiry comes in from a known client), Remy surfaces their full history:

```
Repeat Client Intelligence Panel (shown on inquiry/event detail):
+--------------------------------------------------+
|  Sarah Johnson - VIP (5 events)                   |
|  Last event: Feb 14, 2026 (Anniversary Dinner)    |
+--------------------------------------------------+
|  PREFERENCES:                                      |
|  - Loves: Scallops, Risotto, Chocolate Souffl     |
|  - Dislikes: Cilantro, Blue cheese                |
|  - Allergy: Shellfish (severe - confirmed)        |
|                                                    |
|  HISTORY:                                          |
|  - 5 events, avg $2,200/event                     |
|  - Always tips 20%+                               |
|  - Feedback: 4.8/5 avg (communication: 5.0)       |
|  - Last feedback: "Portions were very generous"   |
|                                                    |
|  UPCOMING:                                         |
|  - Anniversary: Feb 14 (12 days away)             |
|  - Birthday (partner): Mar 8                       |
|                                                    |
|  REMY SUGGESTION:                                  |
|  "Sarah mentioned generous portions last time.    |
|   Consider slightly smaller plates. Her           |
|   anniversary is coming up - great rebooking      |
|   opportunity."                                    |
+--------------------------------------------------+
```

**Implementation:**

This is primarily a **context aggregation** feature, not new data. The data already exists across:

- `clients` table (preferences, milestones, relationship intelligence)
- `events` table (history, spending)
- `client_reviews` / `post_event_surveys` (feedback)
- `client_allergy_records` (allergens)
- `client_preferences` (dish ratings)
- `event_financial_summary` view (spending patterns)

**Server Action (`lib/clients/intelligence.ts`):**

```typescript
'use server'

export async function getRepeatClientIntelligence(clientId: string) {
  const user = await requireChef()

  // Parallel queries
  const [client, events, feedback, allergens, preferences, financials] = await Promise.all([
    getClient(clientId, user.tenantId!),
    getClientEvents(clientId, user.tenantId!),
    getClientFeedback(clientId, user.tenantId!),
    getClientAllergyRecords(clientId, user.tenantId!),
    getClientPreferences(clientId, user.tenantId!),
    getClientFinancialSummary(clientId, user.tenantId!),
  ])

  // Compute derived insights (deterministic, no AI)
  const lovedDishes = preferences.filter((p) => p.rating === 'loved').map((p) => p.item_name)

  const averageFeedback = computeAverageFeedback(feedback)

  const upcomingMilestones = (client.personal_milestones ?? []).filter((m) =>
    isWithinDays(m.date, 30)
  )

  const lastFeedbackHighlights = feedback[0]
    ? {
        overall: feedback[0].overall,
        whatTheyLoved: feedback[0].what_they_loved,
        improvements: feedback[0].what_could_improve,
      }
    : null

  return {
    client,
    eventCount: events.length,
    totalSpent: financials.lifetime_value_cents,
    averageSpend: financials.average_spend_cents,
    lovedDishes,
    allergens,
    averageFeedback,
    upcomingMilestones,
    lastFeedbackHighlights,
    daysSinceLastEvent: financials.days_since_last_event,
    tippingPattern: client.tipping_pattern,
  }
}
```

**Remy Context Injection:**

```typescript
// lib/ai/remy-context.ts - extend existing context builder

export async function buildRemyContext(tenantId: string, clientId?: string) {
  // ... existing context loading ...

  // Add repeat client intelligence when client is known
  if (clientId) {
    const intelligence = await getRepeatClientIntelligence(clientId)
    context.clientIntelligence = {
      isRepeat: intelligence.eventCount > 1,
      lovedDishes: intelligence.lovedDishes,
      allergens: intelligence.allergens.map((a) => a.allergen),
      averageFeedback: intelligence.averageFeedback,
      lastFeedback: intelligence.lastFeedbackHighlights,
      upcomingMilestones: intelligence.upcomingMilestones,
      daysSinceLastEvent: intelligence.daysSinceLastEvent,
    }
  }
}
```

---

## 7. PHASE 4: SCALE FEATURES

### 7.1 Multi-Stakeholder Event Coordination

**Problem:** Weddings and corporate events have multiple contacts (couple, planner, venue manager). Currently, events have one client.

**Design:**

Add an `event_contacts` table allowing multiple stakeholders per event with different roles and visibility levels.

```sql
CREATE TABLE event_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  role TEXT NOT NULL, -- 'primary', 'planner', 'venue_manager', 'host', 'coordinator'
  visibility TEXT NOT NULL DEFAULT 'full', -- 'full', 'logistics_only', 'day_of_only'
  receives_notifications BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.2 Professional Communication Templates (Extended)

Beyond auto-response templates, add a full template engine for all communication types with Remy personalization.

**Template Categories:**

- Pre-event checklist (sent 7 days before)
- Day-of timeline (sent morning of event)
- Grocery receipt summary (sent with grocery reconciliation)
- Seasonal menu suggestion (for dormant client re-engagement)
- Referral thank-you (when referral converts)
- Holiday greetings (Thanksgiving, New Year, etc.)

### 7.3 Client-Facing Chef Profile / Portfolio

**Extends the existing embed widget** with a full portfolio page:

```
Route: app/(public)/chef/[slug]/page.tsx

Sections:
  - Chef bio + photo
  - Cuisine specialties
  - Sample menus (from is_showcase menus)
  - Reviews (from client_reviews with display_consent)
  - Availability calendar (read-only)
  - Inquiry form (embed widget, inline mode)
  - Dietary specialties
  - Service areas
```

### 7.4 Kitchen Assessment Tool

```sql
CREATE TABLE kitchen_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  client_id UUID REFERENCES clients(id),
  event_id UUID REFERENCES events(id),
  location_name TEXT NOT NULL,
  -- Equipment checklist
  has_oven BOOLEAN,
  has_stovetop BOOLEAN,
  burner_count INTEGER,
  has_microwave BOOLEAN,
  has_food_processor BOOLEAN,
  has_blender BOOLEAN,
  has_stand_mixer BOOLEAN,
  has_grill BOOLEAN,
  -- Space
  counter_space TEXT, -- 'limited', 'adequate', 'spacious'
  refrigerator_space TEXT,
  freezer_space TEXT,
  -- Constraints
  constraints TEXT[], -- 'no_gas', 'electric_only', 'small_oven', 'no_dishwasher'
  equipment_to_bring TEXT[],
  -- Notes
  photos JSONB, -- [{url, caption}]
  notes TEXT,
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 8. DATABASE MIGRATIONS

### Migration Execution Order

All migrations must follow the project's timestamp collision prevention rule (check existing migration files first, pick timestamp strictly higher than highest existing).

| Phase | Migration                                     | Tables Created/Modified                                                                                                                                   |
| ----- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `2026XXXX000001_communication_foundation.sql` | `auto_response_config`, `response_templates`, `business_hours_config`, ALTER `inquiries` (add auto_responded_at), ALTER `clients` (add onboarding fields) |
| 2     | `2026XXXX000002_menu_collaboration.sql`       | `menu_revisions`, `menu_dish_feedback`, `guest_count_changes`, ALTER `events` (add revision tracking)                                                     |
| 3     | `2026XXXX000003_financial_automation.sql`     | `payment_milestone_templates`, `event_payment_milestones`, `post_event_surveys`                                                                           |
| 4     | `2026XXXX000004_scale_features.sql`           | `event_contacts`, `kitchen_assessments`                                                                                                                   |

### RLS Policies

All new tables follow the existing pattern:

```sql
-- Standard chef-scoped RLS
ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_access" ON [table]
  FOR ALL
  USING (tenant_id IN (
    SELECT id FROM chefs WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT id FROM chefs WHERE auth_user_id = auth.uid()
  ));

-- Client access (read-only where applicable)
CREATE POLICY "client_read" ON [table]
  FOR SELECT
  USING (client_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'client'
  ));
```

---

## 9. SERVER ACTIONS REGISTRY

### New Server Action Files

| File                                      | Actions                                                                                             | Tier                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------- |
| `lib/communication/auto-response.ts`      | `triggerAutoResponse`, `getAutoResponseConfig`, `updateAutoResponseConfig`                          | Free                       |
| `lib/communication/business-hours.ts`     | `getBusinessHours`, `updateBusinessHours`, `isWithinBusinessHours`                                  | Free                       |
| `lib/communication/templates/actions.ts`  | `getTemplates`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `renderTemplate`              | Free (basic), Pro (custom) |
| `lib/communication/follow-ups/actions.ts` | `scheduleFollowUp`, `cancelFollowUp`, `getFollowUpQueue`                                            | Pro                        |
| `lib/clients/onboarding.ts`               | `generateOnboardingLink`, `submitOnboarding`, `getOnboardingStatus`                                 | Free                       |
| `lib/menus/approval-portal.ts`            | `sendMenuProposal`, `submitMenuFeedback`, `approveEntireMenu`, `getMenuRevisions`                   | Free                       |
| `lib/menus/allergen-check.ts`             | `crossReferenceAllergens`                                                                           | Free                       |
| `lib/menus/revisions.ts`                  | `createRevision`, `getRevisionHistory`, `compareRevisions`                                          | Free                       |
| `lib/guests/count-changes.ts`             | `requestGuestCountChange`, `applyGuestCountChange`, `getGuestCountHistory`                          | Free                       |
| `lib/payments/milestones.ts`              | `createMilestonesForEvent`, `recordMilestonePayment`, `sendMilestoneReminder`, `getMilestoneStatus` | Free                       |
| `lib/payments/reminders.ts`               | `processPaymentReminders` (cron)                                                                    | Free                       |
| `lib/feedback/surveys.ts`                 | `createPostEventSurvey`, `submitSurveyResponse`, `processCompletedSurvey`                           | Free                       |
| `lib/feedback/review-request.ts`          | `sendReviewRequest`, `checkReviewEligibility`                                                       | Free                       |
| `lib/clients/intelligence.ts`             | `getRepeatClientIntelligence`                                                                       | Free                       |

### Cron/Scheduled Endpoints

| Endpoint                                       | Schedule       | Purpose                                                    |
| ---------------------------------------------- | -------------- | ---------------------------------------------------------- |
| `app/api/scheduled/auto-response/route.ts`     | Every 1 min    | Process queued auto-responses (fallback for sync failures) |
| `app/api/scheduled/payment-reminders/route.ts` | Daily 9am      | Send payment milestone reminders                           |
| `app/api/scheduled/follow-ups/route.ts`        | Already exists | Extend with new follow-up types                            |
| `app/api/scheduled/survey-dispatch/route.ts`   | Daily 10am     | Send post-event surveys at correct timing                  |
| `app/api/scheduled/dormant-clients/route.ts`   | Weekly         | Identify dormant clients, queue re-engagement              |

---

## 10. FRONTEND COMPONENT MAP

### New Pages

| Route                                    | Route Group | Component                   | Purpose                                  |
| ---------------------------------------- | ----------- | --------------------------- | ---------------------------------------- |
| `/settings/communication`                | `(chef)`    | `CommunicationSettingsPage` | Auto-response, business hours, templates |
| `/settings/communication/templates`      | `(chef)`    | `TemplateLibraryPage`       | Create/edit response templates           |
| `/settings/communication/templates/[id]` | `(chef)`    | `TemplateEditorPage`        | Edit single template with preview        |
| `/settings/payments/milestones`          | `(chef)`    | `MilestoneTemplatesPage`    | Configure payment milestone templates    |
| `/proposals/[eventId]`                   | `(client)`  | `MenuProposalPage`          | Client views/approves menu               |
| `/payments/[eventId]`                    | `(client)`  | `PaymentSchedulePage`       | Client views payment milestones          |
| `/onboarding/[token]`                    | `(client)`  | `OnboardingFormPage`        | New client intake form (token-authed)    |
| `/feedback/[token]`                      | `(public)`  | `PostEventSurveyPage`       | Post-event feedback (token-authed)       |

### New Components

| Component                      | Directory                   | Used By                      |
| ------------------------------ | --------------------------- | ---------------------------- |
| `AutoResponseSettings`         | `components/communication/` | Settings page                |
| `BusinessHoursEditor`          | `components/communication/` | Settings page                |
| `TemplateEditor`               | `components/communication/` | Template pages               |
| `TemplateVariableInserter`     | `components/communication/` | Template editor              |
| `TemplatePreview`              | `components/communication/` | Template editor              |
| `MenuProposalView`             | `components/menus/`         | Client proposal page         |
| `DishFeedbackCard`             | `components/menus/`         | Client proposal page         |
| `AllergenConflictBadge`        | `components/menus/`         | Menu views                   |
| `MenuRevisionTimeline`         | `components/menus/`         | Menu detail page (chef)      |
| `GuestCountChangeForm`         | `components/events/`        | Event detail (client portal) |
| `GuestCountChangeLog`          | `components/events/`        | Event detail (chef)          |
| `PaymentMilestoneTracker`      | `components/payments/`      | Event detail, client portal  |
| `MilestoneTemplateEditor`      | `components/payments/`      | Settings page                |
| `PostEventSurveyForm`          | `components/feedback/`      | Public survey page           |
| `FeedbackSummaryCard`          | `components/feedback/`      | Client detail page (chef)    |
| `RepeatClientPanel`            | `components/clients/`       | Inquiry/event detail         |
| `OnboardingForm`               | `components/clients/`       | Onboarding page              |
| `CommunicationPreferencesForm` | `components/clients/`       | Client profile               |

### Nav Config Additions

```typescript
// components/navigation/nav-config.tsx

// Add to "Clients" group:
{
  label: 'Communication',
  href: '/settings/communication',
  icon: MessageSquare,
  coreFeature: true,
}

// Add to Settings shortcuts:
{
  label: 'Communication Settings',
  href: '/settings/communication',
  description: 'Auto-response, business hours, templates',
}
{
  label: 'Payment Milestones',
  href: '/settings/payments/milestones',
  description: 'Configure payment schedules',
}
```

---

## 11. REMY AI INTEGRATION POINTS

### New Remy Capabilities

All use Ollama (local AI, private data stays on machine).

| Capability                        | Trigger                            | What Remy Does                                                                                                 |
| --------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Auto-response personalization** | Inquiry arrives, template selected | Adds warmth and personalization to template while preserving structure                                         |
| **Follow-up suggestion**          | Inquiry stale for 3+ days          | "Sarah's inquiry from Monday hasn't been answered. Want me to draft a follow-up?"                              |
| **Repeat client context**         | Known client books again           | Surfaces preferences, history, upcoming milestones in conversation                                             |
| **Menu feedback interpretation**  | Client flags a dish                | "Sarah flagged the scallops. She has a confirmed shellfish allergy. This is a safety issue, not a preference." |
| **Post-event thank-you draft**    | Event completes                    | Drafts a personalized thank-you based on event details, menu served, client preferences                        |
| **Re-engagement draft**           | Client dormant 90+ days            | Drafts a warm re-engagement message using milestone data and past preferences                                  |
| **Payment reminder tone**         | Milestone overdue                  | Drafts a professional, non-confrontational reminder                                                            |

### Remy Classifier Updates

Add new command patterns to `lib/ai/remy-classifier.ts`:

```typescript
const NEW_COMMAND_PATTERNS = [
  /^(send|draft|write)\s+(auto.?response|follow.?up|thank.?you|reminder)/i,
  /^(check|show|what).*(payment|milestone|balance|outstanding)/i,
  /^(send|create)\s+(onboarding|intake)\s+(form|link)/i,
  /^(show|get|what).*(feedback|survey|review)/i,
  /^(enable|disable|set|update)\s+(business\s+hours|auto.?response)/i,
]
```

### Remy Context Extensions (`lib/ai/remy-context.ts`)

```typescript
// Add to existing context builder:

// Payment milestone status for active events
context.paymentMilestones = await getActiveMilestones(tenantId)

// Recent feedback from completed events
context.recentFeedback = await getRecentFeedback(tenantId, 30) // last 30 days

// Stale inquiries needing follow-up
context.staleInquiries = await getStaleInquiries(tenantId)

// Dormant clients eligible for re-engagement
context.dormantClients = await getDormantClients(tenantId, 90) // 90+ days
```

---

## 12. PRIVACY AND SECURITY

### Data Classification

| Data Type                       | Privacy Level             | AI Backend  | Storage                      |
| ------------------------------- | ------------------------- | ----------- | ---------------------------- |
| Client names, emails, phones    | PRIVATE                   | Ollama only | Supabase (encrypted at rest) |
| Dietary restrictions, allergies | PRIVATE + SAFETY-CRITICAL | Ollama only | Supabase                     |
| Payment amounts, invoices       | PRIVATE                   | Ollama only | Supabase + Ledger            |
| Survey responses, feedback      | PRIVATE                   | Ollama only | Supabase                     |
| Response templates (chef's)     | SEMI-PRIVATE              | Ollama only | Supabase                     |
| Business hours config           | NON-SENSITIVE             | N/A (no AI) | Supabase                     |
| System default templates        | PUBLIC                    | N/A         | Code                         |

### Token-Based Access (Onboarding + Surveys)

Both the onboarding form and post-event survey use signed JWTs for access without login:

```typescript
// Token creation
const token = jwt.sign({ surveyId, clientId, tenantId, type: 'survey' }, process.env.JWT_SECRET!, {
  expiresIn: '30d',
})

// Token verification
const payload = jwt.verify(token, process.env.JWT_SECRET!)
// Validate type matches expected ('onboarding' or 'survey')
// Validate clientId + tenantId exist in database
```

**Security constraints:**

- Tokens expire (7 days for onboarding, 30 days for surveys)
- Tokens are single-purpose (type field prevents cross-use)
- Tokens don't grant access to any other data
- Rate-limited endpoints (10 requests per 5 minutes per IP)
- CSRF protection via origin checking

### Tenant Isolation

All new tables include `tenant_id` with RLS policies. No cross-tenant data access is possible. Server actions always derive tenant from session, never from request body.

---

## 13. TESTING STRATEGY

### Unit Tests

| Area                  | Test File                                | What's Tested                                                    |
| --------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| Business hours        | `tests/unit/business-hours.test.ts`      | Timezone handling, edge cases (midnight, DST), emergency bypass  |
| Template rendering    | `tests/unit/template-rendering.test.ts`  | Variable substitution, missing variables, XSS prevention         |
| Allergen matching     | `tests/unit/allergen-check.test.ts`      | Ingredient-to-allergen mapping, false positives, severity levels |
| Price recalculation   | `tests/unit/guest-count-pricing.test.ts` | Per-person math, surcharge calculation, rounding                 |
| Milestone calculation | `tests/unit/payment-milestones.test.ts`  | Due date calculation, percentage math, edge cases                |
| Survey eligibility    | `tests/unit/review-eligibility.test.ts`  | Rating thresholds, timing windows                                |
| Token verification    | `tests/unit/token-auth.test.ts`          | Expiry, type validation, tampering detection                     |

### Integration Tests

| Area                   | Test File                                      | What's Tested                                                          |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| Auto-response flow     | `tests/integration/auto-response.test.ts`      | Inquiry creation triggers response, template selection, email dispatch |
| Menu approval flow     | `tests/integration/menu-approval.test.ts`      | Proposal send, client feedback, revision creation, approval            |
| Payment milestone flow | `tests/integration/payment-milestones.test.ts` | Milestone creation, payment recording, reminder dispatch               |
| Post-event sequence    | `tests/integration/post-event.test.ts`         | Survey send, response, review gate, re-engagement                      |
| Onboarding flow        | `tests/integration/client-onboarding.test.ts`  | Link generation, form submission, profile population                   |

### Existing Test Compatibility

These features don't break any existing tests because:

- Auto-response is a non-blocking side effect (existing inquiry creation unchanged)
- Menu revisions are additive (existing menu system unchanged)
- Payment milestones are separate from the ledger (existing financial flow unchanged)
- Post-event surveys are separate from client_reviews (existing review system unchanged)

---

## 14. RISK ANALYSIS

### Technical Risks

| Risk                                     | Likelihood | Impact            | Mitigation                                                                 |
| ---------------------------------------- | ---------- | ----------------- | -------------------------------------------------------------------------- |
| Auto-response sends duplicate emails     | Medium     | Medium            | Idempotency key on `auto_responded_at`, check before sending               |
| Allergen cross-reference false negatives | Low        | Critical (safety) | Conservative matching (flag uncertain matches), chef confirmation required |
| Survey token brute-force                 | Low        | Low               | Rate limiting, short tokens with high entropy                              |
| Business hours timezone bugs             | Medium     | Low               | Use established library (date-fns-tz), comprehensive unit tests            |
| Template variable injection (XSS)        | Low        | Medium            | Sanitize all template output, escape HTML in variables                     |
| Guest count change race condition        | Low        | Medium            | Optimistic locking on event.guest_count                                    |

### Product Risks

| Risk                                        | Mitigation                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Chefs don't enable auto-response (adoption) | Default OFF, but prompt during onboarding. Show stats: "You responded in 6 hours avg. Auto-response would reply in 5 seconds." |
| Survey fatigue (clients skip surveys)       | Keep to 5-7 questions max. Allow skip. Incentivize with loyalty points.                                                        |
| Menu approval portal too complex            | Progressive disclosure: show simplified view first, advanced features on demand                                                |
| Payment reminders feel pushy                | Chef controls tone via templates. Default is warm/professional. Option to disable per client.                                  |

### Build Order Rationale

**Phase 1 first** because:

- Auto-response has the highest ROI (40% booking recovery)
- Business hours are zero-effort after setup
- Templates are reused across all later phases
- Onboarding populates client profiles that Phases 2-3 depend on

**Phase 2 before Phase 3** because:

- Menu approval is the #1 communication friction point
- Guest count changes happen before payment milestones matter
- Menu revisions feed into pricing (which milestones track)

**Phase 3 before Phase 4** because:

- Payment automation directly addresses a top-5 pain point
- Post-event feedback creates the data that repeat client intelligence uses
- Both have clear retention impact ($$)

**Phase 4 last** because:

- Multi-stakeholder is important but less frequent (weddings/corporate only)
- Chef portfolio is marketing (lower urgency than operations)
- Kitchen assessment is nice-to-have (chefs manage this informally today)

---

## APPENDIX: FILE TREE (New Files Only)

```
lib/
  communication/
    auto-response.ts
    business-hours.ts
    preferences.ts
    templates/
      actions.ts
      defaults.ts
    follow-ups/
      actions.ts
      scheduler.ts
      sequences.ts
  menus/
    approval-portal.ts
    allergen-check.ts
    revisions.ts
  payments/
    milestones.ts
    reminders.ts
  feedback/
    surveys.ts
    templates.ts
    review-request.ts
  guests/
    count-changes.ts
  clients/
    onboarding.ts
    intelligence.ts

app/
  (chef)/
    settings/
      communication/
        page.tsx
        templates/
          page.tsx
          [id]/
            page.tsx
      payments/
        milestones/
          page.tsx
  (client)/
    proposals/
      [eventId]/
        page.tsx
    payments/
      [eventId]/
        page.tsx
    onboarding/
      [token]/
        page.tsx
  (public)/
    feedback/
      [token]/
        page.tsx
  api/
    scheduled/
      payment-reminders/
        route.ts
      survey-dispatch/
        route.ts
      dormant-clients/
        route.ts

components/
  communication/
    auto-response-settings.tsx
    business-hours-editor.tsx
    template-editor.tsx
    template-variable-inserter.tsx
    template-preview.tsx
  menus/
    menu-proposal-view.tsx
    dish-feedback-card.tsx
    allergen-conflict-badge.tsx
    menu-revision-timeline.tsx
  payments/
    payment-milestone-tracker.tsx
    milestone-template-editor.tsx
  feedback/
    post-event-survey-form.tsx
    feedback-summary-card.tsx
  clients/
    repeat-client-panel.tsx
    onboarding-form.tsx
    communication-preferences-form.tsx
  events/
    guest-count-change-form.tsx
    guest-count-change-log.tsx

tests/
  unit/
    business-hours.test.ts
    template-rendering.test.ts
    allergen-check.test.ts
    guest-count-pricing.test.ts
    payment-milestones.test.ts
    review-eligibility.test.ts
    token-auth.test.ts
  integration/
    auto-response.test.ts
    menu-approval.test.ts
    payment-milestones.test.ts
    post-event.test.ts
    client-onboarding.test.ts

supabase/
  migrations/
    2026XXXX000001_communication_foundation.sql
    2026XXXX000002_menu_collaboration.sql
    2026XXXX000003_financial_automation.sql
    2026XXXX000004_scale_features.sql
```
