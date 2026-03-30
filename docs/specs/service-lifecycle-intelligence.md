# Spec: Service Lifecycle Intelligence Layer

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** none (builds on existing inquiry pipeline, Gmail sync, Hub system)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-30
> **Built by:** not started

---

## What This Does (Plain English)

The system watches every communication stream (email, text, inquiry forms) and automatically maps each conversation to the 10-stage Service Lifecycle Blueprint. As emails arrive and conversations progress, the system detects which lifecycle checkpoints are satisfied, auto-populates client/event/menu data, identifies what information is still missing, and surfaces a real-time progress view for both chef and client. The chef never manually enters data that already exists in a conversation. The client sees a shared status page (via Dinner Circle slug URL) showing exactly where things stand.

---

## Why It Matters

The developer has an 8-day-old unanswered email. That's a failure at checkpoint 1.17 ("Initial response sent within 24 hours"). Every manual step between inquiry and execution is a place where business gets lost. The infrastructure (Gmail sync, inquiry pipeline, Hub/Dinner Circle, FSM) is already built. What's missing is the intelligence layer that reads conversations and checks boxes automatically, so the chef's only job is creative decisions and cooking.

---

## Architecture Overview

Three components, built in this order:

### Component 1: Lifecycle Checkpoint Tracker (database + server actions)

A per-inquiry/per-event checkpoint system that maps to the Service Lifecycle Blueprint's 10 stages and 200+ checkpoints. Each checkpoint has a status (not_started, auto_detected, confirmed, skipped, not_applicable) and the evidence that satisfied it.

### Component 2: Conversation Stage Detector (intelligence engine)

Reads email threads, inquiry messages, and chat messages. Uses deterministic pattern matching first (regex, field presence checks), then Ollama for ambiguous content. Outputs: which checkpoints are satisfied, what data was extracted, and what's still missing.

### Component 3: Shared Status View (UI)

The chef sees a full operational dashboard per inquiry/event. The client sees a simplified version in the Dinner Circle. Both see real-time progress.

---

## Database Changes

### New Tables

```sql
-- Migration: 20260401000136_service_lifecycle_checkpoints.sql

-- Checkpoint definitions (the blueprint, configurable per chef)
CREATE TABLE IF NOT EXISTS service_lifecycle_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,          -- 1-10
  stage_name TEXT NOT NULL,               -- 'inquiry_received', 'discovery', etc.
  checkpoint_key TEXT NOT NULL,           -- 'dietary_per_guest', 'quote_sent', etc.
  checkpoint_label TEXT NOT NULL,         -- Human-readable: "Per-guest dietary breakdown collected"
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,  -- chef can deactivate checkpoints they don't use
  is_required BOOLEAN NOT NULL DEFAULT false, -- blocks stage completion if not done
  auto_detect_rule TEXT,                  -- which detection rule applies (null = manual only)
  client_visible BOOLEAN NOT NULL DEFAULT false, -- shows in Dinner Circle
  client_label TEXT,                      -- simplified label for client view
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, checkpoint_key)
);

CREATE INDEX idx_slt_chef_stage ON service_lifecycle_templates(chef_id, stage_number);

-- Per-inquiry/event checkpoint state (the actual progress)
CREATE TABLE IF NOT EXISTS service_lifecycle_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  checkpoint_key TEXT NOT NULL,
  stage_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'auto_detected', 'confirmed', 'skipped', 'not_applicable')),
  detected_at TIMESTAMPTZ,               -- when auto-detection found it
  confirmed_at TIMESTAMPTZ,              -- when chef or client confirmed
  confirmed_by TEXT,                      -- 'chef', 'client', 'system'
  evidence_type TEXT,                     -- 'email', 'form', 'sms', 'manual', 'system'
  evidence_source TEXT,                   -- email message ID, form submission ID, etc.
  evidence_excerpt TEXT,                  -- the actual text that satisfied this checkpoint
  extracted_data JSONB,                   -- structured data pulled from the evidence
  notes TEXT,                             -- chef's notes on this checkpoint
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_context CHECK (
    (inquiry_id IS NOT NULL AND event_id IS NULL) OR
    (inquiry_id IS NULL AND event_id IS NOT NULL) OR
    (inquiry_id IS NOT NULL AND event_id IS NOT NULL)
  ),
  UNIQUE(chef_id, inquiry_id, checkpoint_key),
  UNIQUE(chef_id, event_id, checkpoint_key)
);

CREATE INDEX idx_slp_inquiry ON service_lifecycle_progress(inquiry_id) WHERE inquiry_id IS NOT NULL;
CREATE INDEX idx_slp_event ON service_lifecycle_progress(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_slp_status ON service_lifecycle_progress(chef_id, status);

-- Detection log (what the system analyzed and what it found)
CREATE TABLE IF NOT EXISTS lifecycle_detection_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,              -- 'email', 'sms', 'form', 'chat', 'screenshot'
  source_id TEXT,                         -- gmail message ID, sms_message ID, etc.
  raw_content TEXT,                       -- the text that was analyzed
  detection_method TEXT NOT NULL,         -- 'deterministic', 'ollama', 'hybrid'
  checkpoints_detected JSONB NOT NULL,    -- array of { key, value, confidence, excerpt }
  checkpoints_missing JSONB,              -- array of checkpoint_keys still needed
  stage_assessment INTEGER,               -- which stage the conversation is currently in (1-10)
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ldl_inquiry ON lifecycle_detection_log(inquiry_id) WHERE inquiry_id IS NOT NULL;
CREATE INDEX idx_ldl_created ON lifecycle_detection_log(created_at DESC);
```

### Migration Notes

- Next available timestamp: `20260401000136`
- All additive. No existing tables modified.
- `service_lifecycle_templates` gets seeded with default checkpoints from the Service Lifecycle Blueprint on first chef login (or via a setup action)
- `service_lifecycle_progress` is the live state. One row per checkpoint per inquiry/event.
- `lifecycle_detection_log` is append-only audit trail of what the AI analyzed.

---

## Data Model

### Stage Mapping (checkpoint_key naming convention)

Every checkpoint*key follows the pattern: `s{stage}*{descriptive_name}`

```
Stage 1 (inquiry_received):
  s1_date_captured, s1_source_tracked, s1_host_name, s1_host_email,
  s1_host_phone, s1_comm_channel, s1_event_date, s1_guest_count,
  s1_location, s1_event_type, s1_how_heard, s1_initial_budget,
  s1_initial_notes, s1_auto_ack_sent, s1_personal_response_sent,
  s1_response_time_tracked

Stage 2 (discovery):
  s2_guest_list, s2_dietary_per_guest, s2_allergy_severity,
  s2_children_attending, s2_dietary_confirmed_with_guests,
  s2_cuisine_preferences, s2_cuisine_dislikes, s2_favorite_restaurants,
  s2_previous_chef_experience, s2_adventure_level, s2_course_count,
  s2_service_style, s2_budget_discussed, s2_whats_included_explained,
  s2_grocery_model_explained, s2_gratuity_policy_communicated,
  s2_client_expectations, s2_drinks_discussed, s2_wine_pairing_interest,
  s2_beverage_budget, s2_bar_setup, s2_kitchen_situation,
  s2_kitchen_visit_needed, s2_dining_space, s2_equipment_needs,
  s2_parking_access, s2_special_occasion, s2_surprise_element,
  s2_vibe_preferences, s2_dress_code, s2_table_presentation,
  s2_vendor_coordination, s2_photo_social_consent, s2_confidentiality,
  s2_primary_contact, s2_comm_preferences, s2_response_expectations,
  s2_tasting_offered, s2_tasting_scheduled, s2_tasting_completed,
  s2_tasting_feedback

Stage 3 (quote):
  s3_quote_drafted, s3_quote_sent, s3_quote_follow_up_sent,
  s3_quote_reviewed, s3_questions_answered, s3_revisions_requested,
  s3_revised_quote_sent, s3_quote_accepted, s3_deposit_terms_communicated,
  s3_deposit_invoice_sent, s3_deposit_received, s3_deposit_receipt_sent

Stage 4 (agreement):
  s4_agreement_drafted, s4_cancellation_policy, s4_reschedule_policy,
  s4_liability_terms, s4_kitchen_access_terms, s4_grocery_reimbursement,
  s4_confidentiality_clause, s4_photo_rights, s4_force_majeure,
  s4_ip_clause, s4_agreement_sent, s4_agreement_reviewed,
  s4_agreement_signed_client, s4_agreement_countersigned,
  s4_signed_copy_stored, s4_insurance_cert_provided

Stage 5 (menu_planning):
  s5_rough_draft_created, s5_dietary_accounted, s5_draft_sent,
  s5_host_feedback_received, s5_menu_revised, s5_course_timing_planned,
  s5_plating_decided, s5_pairings_selected, s5_menu_descriptions_written,
  s5_final_menu_confirmed, s5_final_menu_locked, s5_menu_shared_guests,
  s5_menu_cards_prepared

Stage 6 (pre_service):
  s6_final_guest_count, s6_final_dietary_recheck, s6_final_menu_adjustments,
  s6_arrival_time_confirmed, s6_parking_confirmed, s6_confirmation_sent,
  s6_host_reminded, s6_shopping_list_built, s6_grocery_budget_approved,
  s6_sourcing_preferences, s6_substitution_protocol, s6_specialty_ordered,
  s6_groceries_purchased, s6_grocery_receipts_saved, s6_items_verified,
  s6_equipment_checklist, s6_equipment_packed, s6_rentals_arranged,
  s6_staff_sourced, s6_staff_confirmed, s6_staff_briefed,
  s6_staff_arrival_confirmed, s6_prep_timeline_built, s6_day_before_prep,
  s6_course_timeline_built, s6_vendor_synced

Stage 7 (payment):
  s7_remaining_balance_calculated, s7_grocery_costs_finalized,
  s7_additional_charges_itemized, s7_credits_applied,
  s7_final_invoice_sent, s7_payment_method_confirmed,
  s7_payment_due_communicated, s7_final_payment_received,
  s7_payment_receipt_sent, s7_grocery_receipts_shared,
  s7_gratuity_received, s7_gratuity_distributed,
  s7_tax_docs_prepared, s7_financial_reconciliation

Stage 8 (service_day):
  s8_arrived_on_time, s8_venue_walkthrough, s8_equipment_setup,
  s8_staff_arrived, s8_welcome_interaction, s8_courses_executed,
  s8_dietary_plates_correct, s8_pacing_adjusted, s8_realtime_adjustments,
  s8_kitchen_cleaned, s8_equipment_packed, s8_trash_removed,
  s8_leftovers_packaged, s8_final_checkin_host, s8_departure_noted

Stage 9 (post_service):
  s9_thank_you_sent, s9_personal_touch_included, s9_photos_shared,
  s9_leftover_instructions, s9_review_requested, s9_review_link_sent,
  s9_review_received, s9_review_responded, s9_testimonial_permission,
  s9_negative_feedback_addressed, s9_payments_reconciled,
  s9_outstanding_balance_followed, s9_grocery_reconciliation_shared,
  s9_after_action_notes, s9_guest_preferences_noted,
  s9_venue_notes_updated, s9_staff_performance_noted,
  s9_time_tracking_completed, s9_profitability_calculated

Stage 10 (client_lifecycle):
  s10_profile_updated, s10_client_tier_classified,
  s10_preferred_menu_documented, s10_comm_style_noted,
  s10_key_dates_captured, s10_household_changes_tracked,
  s10_rebooking_follow_up_sent, s10_seasonal_outreach_sent,
  s10_anniversary_acknowledged, s10_recurring_template_created,
  s10_win_back_triggered, s10_referral_requested,
  s10_referral_tracked, s10_client_featured_marketing
```

### Auto-Detection Rules

Each checkpoint can have an `auto_detect_rule` that maps to a detection function. These are the rules the Conversation Stage Detector uses:

```
-- Rules that fire from existing data (no AI needed):
field_present:confirmed_date        -> s1_event_date
field_present:confirmed_guest_count -> s1_guest_count
field_present:confirmed_location    -> s1_location
field_present:confirmed_occasion    -> s1_event_type, s2_special_occasion
field_present:confirmed_budget_cents -> s1_initial_budget, s2_budget_discussed
field_present:confirmed_dietary_restrictions -> s2_dietary_per_guest (partial)
field_present:contact_name          -> s1_host_name
field_present:contact_email         -> s1_host_email
field_present:contact_phone         -> s1_host_phone
field_present:channel               -> s1_source_tracked
field_present:first_response_at     -> s1_personal_response_sent
field_present:auto_responded_at     -> s1_auto_ack_sent
field_present:converted_to_event_id -> event created (multiple stage 5+ checkpoints)
inquiry_status:quoted               -> s3_quote_sent
inquiry_status:confirmed            -> s3_quote_accepted
event_status:paid                   -> s7_final_payment_received
event_status:completed              -> s8_courses_executed (implicit)

-- Rules that fire from conversation text analysis (regex first, Ollama fallback):
text_match:dietary                  -> s2_dietary_per_guest, s2_allergy_severity
text_match:cuisine_preference       -> s2_cuisine_preferences
text_match:service_style            -> s2_service_style
text_match:course_count             -> s2_course_count
text_match:drinks                   -> s2_drinks_discussed
text_match:kitchen                  -> s2_kitchen_situation
text_match:vibe                     -> s2_vibe_preferences
text_match:gratuity                 -> s2_gratuity_policy_communicated
text_match:cancellation_policy      -> s4_cancellation_policy
text_match:deposit                  -> s3_deposit_terms_communicated
text_match:menu_feedback            -> s5_host_feedback_received
text_match:confirmation             -> s6_confirmation_sent
```

---

## Server Actions

### New File: `lib/lifecycle/actions.ts`

| Action                                                                  | Auth                | Input                                                              | Output                                                                                             | Side Effects                                                 |
| ----------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `getLifecycleProgress(inquiryId?, eventId?)`                            | `requireChef()`     | inquiry or event ID                                                | `{ stages: StageProgress[], overallPercent: number, currentStage: number, nextActions: string[] }` | None (read-only)                                             |
| `getLifecycleProgressForClient(groupToken)`                             | Public (token-auth) | hub group token                                                    | `{ stages: ClientStageView[] }` (filtered, client_visible only)                                    | None                                                         |
| `updateCheckpoint(inquiryId?, eventId?, checkpointKey, status, notes?)` | `requireChef()`     | checkpoint key + new status                                        | `{ success, progress? }`                                                                           | Revalidates inquiry/event page, broadcasts SSE               |
| `bulkUpdateCheckpoints(inquiryId?, eventId?, updates[])`                | `requireChef()`     | array of { key, status }                                           | `{ success, updated: number }`                                                                     | Revalidates, broadcasts SSE                                  |
| `skipCheckpoint(inquiryId?, eventId?, checkpointKey, reason)`           | `requireChef()`     | key + reason                                                       | `{ success }`                                                                                      | Logs skip reason                                             |
| `analyzeConversation(inquiryId, messageText?, fullThread?)`             | `requireChef()`     | inquiry ID + optional new text                                     | `{ detected: CheckpointDetection[], missing: string[], stageAssessment: number }`                  | Writes to lifecycle_detection_log, auto-updates progress     |
| `seedDefaultTemplate(chefId)`                                           | `requireChef()`     | chef ID                                                            | `{ success, checkpointCount: number }`                                                             | Creates ~150 template rows from blueprint                    |
| `updateTemplateCheckpoint(checkpointKey, updates)`                      | `requireChef()`     | key + { is_active?, is_required?, client_visible?, client_label? } | `{ success }`                                                                                      | Chef customizes their template                               |
| `getNextMissingInfo(inquiryId)`                                         | `requireChef()`     | inquiry ID                                                         | `{ missingCheckpoints: string[], suggestedQuestion: string }`                                      | None (used by email draft assistant)                         |
| `getMissingInfoDraftEmail(inquiryId)`                                   | `requireChef()`     | inquiry ID                                                         | `{ draft: string, missingItems: string[] }`                                                        | Uses Ollama to draft a natural email asking for missing info |

### New File: `lib/lifecycle/detector.ts` (NOT a server action file)

Core detection engine. Called by `analyzeConversation()` and by the Gmail sync pipeline.

```typescript
// Deterministic detection (instant, no AI)
export function detectFromFields(inquiry: InquiryRow): CheckpointDetection[]

// Deterministic detection from text (regex patterns)
export function detectFromText(text: string): CheckpointDetection[]

// AI-powered detection (Ollama, for ambiguous content)
export async function detectFromConversation(
  thread: string,
  existingProgress: Map<string, string>
): Promise<CheckpointDetection[]>

// Combined pipeline: fields first, then text, then AI for gaps
export async function runFullDetection(
  inquiry: InquiryRow,
  conversationThread: string
): Promise<{
  detected: CheckpointDetection[]
  missing: string[]
  stageAssessment: number
  method: 'deterministic' | 'hybrid'
}>

interface CheckpointDetection {
  checkpoint_key: string
  value: any // extracted data
  confidence: number // 0-1 (1.0 for deterministic, 0.5-0.9 for AI)
  excerpt: string // the text that triggered detection
  method: 'field' | 'regex' | 'ollama'
}
```

### Modified File: `lib/gmail/sync.ts`

**What to change:** After the existing `createInquiry()` call in the sync pipeline, add a call to `runFullDetection()` on the email content, then `bulkUpdateCheckpoints()` with the results. This means every incoming email automatically updates the lifecycle progress.

```typescript
// After existing inquiry creation/update:
const detection = await runFullDetection(inquiry, emailBody)
if (detection.detected.length > 0) {
  await bulkUpdateCheckpoints(
    inquiryId,
    null,
    detection.detected.map((d) => ({
      key: d.checkpoint_key,
      status: 'auto_detected',
      evidence_type: 'email',
      evidence_source: gmailMessageId,
      evidence_excerpt: d.excerpt,
      extracted_data: d.value,
    }))
  )
}
```

### Modified File: `lib/inquiries/actions.ts`

**What to change:**

1. In `createInquiry()`: after creating the inquiry, call `seedDefaultTemplate()` (if not already seeded for this chef) and `runFullDetection()` on the source_message to populate initial checkpoints.
2. In `updateInquiry()`: after updating confirmed fields, call `detectFromFields()` to auto-check any newly satisfied checkpoints.
3. In `transitionInquiry()`: auto-update stage-transition checkpoints (e.g., status -> quoted triggers s3_quote_sent).

---

## UI / Component Spec

### Chef View: Lifecycle Progress Panel

**Location:** New component rendered on the inquiry detail page and event detail page.

**File:** `components/lifecycle/lifecycle-progress-panel.tsx`

```
+--------------------------------------------------+
| Service Lifecycle                    72% complete |
|                                                   |
| [====Stage 1: Inquiry====] [==Stage 2: Disc==]   |
| [Stage 3: Quote] [Stage 4] [5] [6] [7] [8] [9]  |
|                                                   |
| --- Stage 2: Discovery (14/35 checkpoints) ---    |
|                                                   |
| [x] Guest list collected                          |
| [x] Per-guest dietary restrictions (auto-detected)|
|     "Sarah is gluten-free, Mike has nut allergy"  |
| [ ] Cuisine preferences gathered                  |
| [ ] Budget discussed                              |
| [~] Service style confirmed (auto-detected,       |
|     needs confirmation)                           |
| [-] Tasting dinner (skipped - casual dinner)      |
|                                                   |
| --- What's Missing (blocks next stage) ---        |
| * Cuisine preferences                             |
| * Course count                                    |
| * Kitchen situation at venue                      |
|                                                   |
| [Draft Email Asking for Missing Info]             |
+--------------------------------------------------+
```

**States:**

- `[x]` = confirmed (green check)
- `[~]` = auto_detected, awaiting chef confirmation (yellow, clickable to confirm)
- `[ ]` = not_started (empty checkbox)
- `[-]` = skipped or not_applicable (gray strikethrough)

**Interactions:**

- Click any checkbox to toggle status
- Click auto-detected item to confirm or dismiss
- Click evidence excerpt to see source (opens email/message)
- "Draft Email" button calls `getMissingInfoDraftEmail()` and opens compose
- Stage headers are collapsible (current + next stage expanded by default)
- Right-click/long-press a checkbox for "Skip" or "Not applicable" options

### Client View: Dinner Circle Progress

**Location:** Within the existing Hub/Dinner Circle page, add a "Your Dinner Status" section.

**File:** `components/hub/lifecycle-client-view.tsx`

Shows only checkpoints where `client_visible = true` in the chef's template. Simplified labels.

```
+--------------------------------------------------+
| Your Dinner Status                                |
|                                                   |
| [x] Inquiry received                             |
| [x] Menu preferences shared                      |
| [x] Dietary restrictions confirmed                |
| [ ] Menu finalized                                |
| [ ] Payment completed                             |
| [x] Date confirmed: April 12, 2026               |
|                                                   |
| Need to update anything? Reply to this thread     |
| or message Chef David directly.                   |
+--------------------------------------------------+
```

### Dashboard Integration

**File:** Modify existing dashboard to show lifecycle-aware inquiry cards.

Each inquiry card shows:

- Client name
- Stage indicator (colored dot: Stage 1 = blue, Stage 2 = yellow, Stage 3 = orange, etc.)
- Completion percentage
- Next action needed
- Days since last contact (red if > 48 hours)

---

## Edge Cases and Error Handling

| Scenario                                                                  | Correct Behavior                                                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Email contains ambiguous dietary info ("she doesn't really eat meat")     | Auto-detect as `s2_dietary_per_guest` with confidence 0.6, status `auto_detected` (requires chef confirmation)      |
| Same checkpoint detected from two different emails                        | Keep the first detection, log the second as additional evidence                                                     |
| Chef skips Stage 4 (Agreement) entirely                                   | All Stage 4 checkpoints marked `not_applicable`, stage progress jumps from 3 to 5                                   |
| Inquiry converts to event mid-lifecycle                                   | Progress records get event_id added (inquiry_id remains). Lifecycle continues seamlessly.                           |
| Chef has no template yet (first use)                                      | `seedDefaultTemplate()` auto-runs on first inquiry creation or first lifecycle panel view                           |
| Ollama is offline during detection                                        | Deterministic detection still runs (field_present + regex). AI detection is skipped. Progress is partial, not zero. |
| Client views status but chef hasn't configured client_visible checkpoints | Show a generic "Your chef is working on your dinner" message with confirmed date/guest count only                   |
| Two inquiries for the same client                                         | Each gets its own lifecycle progress. Client profile data carries over but checkpoints are per-engagement.          |

---

## Integration Points (Wire-Up Summary)

| Trigger                                  | What Fires                                            | Result                                               |
| ---------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| Gmail sync processes new email           | `runFullDetection()` on email body                    | Checkpoints auto-updated                             |
| Inquiry created (any source)             | `seedDefaultTemplate()` + `detectFromFields()`        | Initial checkpoints populated                        |
| Inquiry fields updated                   | `detectFromFields()` on new values                    | Checkpoints refreshed                                |
| Inquiry status transitions               | Stage-mapped checkpoints auto-checked                 | Quote sent, confirmed, etc.                          |
| Chef opens inquiry detail page           | `getLifecycleProgress()`                              | Panel renders current state                          |
| Chef clicks "Draft Email"                | `getNextMissingInfo()` + `getMissingInfoDraftEmail()` | Ollama drafts email asking for exactly what's needed |
| Client opens Dinner Circle               | `getLifecycleProgressForClient(token)`                | Simplified status view                               |
| Event status transitions                 | Stage 7-8 checkpoints auto-checked                    | Payment, execution tracked                           |
| Post-service actions (review sent, etc.) | Stage 9 checkpoints updated                           | Follow-up tracked                                    |
| SMS/text received (future)               | Same `runFullDetection()` pipeline                    | Same auto-detection                                  |
| Screenshot uploaded (future)             | OCR -> text -> `runFullDetection()`                   | Same auto-detection                                  |

---

## Implementation Order

1. **Migration** - create the three tables
2. **`lib/lifecycle/detector.ts`** - detection engine (deterministic first, Ollama second)
3. **`lib/lifecycle/actions.ts`** - server actions (CRUD + detection + email drafting)
4. **`lib/lifecycle/seed.ts`** - default template seeding from blueprint
5. **Wire into `lib/gmail/sync.ts`** - auto-detect on email arrival
6. **Wire into `lib/inquiries/actions.ts`** - auto-detect on inquiry create/update/transition
7. **`components/lifecycle/lifecycle-progress-panel.tsx`** - chef-facing UI
8. **`components/hub/lifecycle-client-view.tsx`** - client-facing UI in Dinner Circle
9. **Dashboard integration** - stage indicators on inquiry cards
10. **Email draft assistant** - "Draft email for missing info" button

---

## Verification Steps

1. Sign in with agent account
2. Create a new inquiry with partial information (name, date, guest count)
3. Verify: lifecycle progress panel appears, Stage 1 checkpoints auto-detected
4. Update inquiry with dietary restrictions
5. Verify: Stage 2 dietary checkpoint auto-detected with evidence excerpt
6. Transition inquiry to "quoted"
7. Verify: Stage 3 quote checkpoints auto-update
8. Click "Draft Email for Missing Info"
9. Verify: Ollama generates a natural email asking for the specific missing items
10. Open Dinner Circle as client
11. Verify: client-visible checkpoints show correct status
12. Skip a Stage 4 checkpoint
13. Verify: it shows as skipped with reason
14. Screenshot all states

---

## Out of Scope

- SMS inbound auto-detection (infrastructure exists, will be wired in a follow-up spec)
- Screenshot OCR to lifecycle detection (will use existing OCR infra, follow-up spec)
- Automated email sending (this spec drafts emails, chef sends them manually for now)
- Custom checkpoint creation by chef (they can activate/deactivate defaults, not create new ones yet)
- Multi-chef coordination on same inquiry (future spec)
- Calendar integration for Stage 6 timeline building (separate spec)

---

## Notes for Builder Agent

- **Privacy:** The detector uses Ollama (local) for all conversation analysis. Never send client data to Gemini. This is a hard rule.
- **Deterministic first:** Always run `detectFromFields()` and `detectFromText()` before Ollama. Most checkpoints can be detected without AI. Ollama is the fallback for ambiguous content only.
- **Existing patterns:** Follow the same server action patterns as `lib/inquiries/actions.ts` (auth, tenant scoping, CAS guards, error propagation, cache busting).
- **The blueprint is the source of truth:** `docs/service-lifecycle-blueprint.md` defines every checkpoint. The seed function reads from a hardcoded map that mirrors the blueprint. If the blueprint changes, the seed map must be updated.
- **Performance:** `getLifecycleProgress()` will be called on every inquiry/event page load. Use a single query that joins templates + progress. Consider `unstable_cache` with tag `lifecycle-{inquiryId}` and bust it on every checkpoint update.
- **SSE:** Broadcast checkpoint updates so the UI updates in real-time if another tab or the Gmail sync updates progress.
- **`computeReadinessScore()`** already exists in `lib/inquiries/actions.ts`. The lifecycle progress is a superset of readiness. Eventually, readiness score should be derived from lifecycle progress, but for now they can coexist. Don't break the existing readiness score.
