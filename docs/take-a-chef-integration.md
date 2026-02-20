# Take a Chef ↔ ChefFlow Integration

## What Changed

This feature activates the TakeaChef pipeline that was latent in ChefFlow's schema since day one. No database migration was required — the `inquiry_channel`, `message_channel`, and `referral_source` enums already included `take_a_chef` in Layer 2. The work was entirely building the UI and pipeline to use what was already there.

---

## Why This Exists

Take a Chef is a two-sided marketplace (Airbnb for private chefs) that solves the chef's hardest problem — client discovery — but takes a 20–30% commission on every booking and doesn't own the operational layer. ChefFlow is the operational layer. The two systems are architecturally complementary:

- **Take a Chef** gets the chef the gig
- **ChefFlow** runs everything after the client says yes

The business flywheel: a chef captures a TakeaChef booking into ChefFlow, builds the direct relationship, and when the client rebooks — they book directly, saving the commission entirely.

---

## Files Created

### `lib/ai/import-take-a-chef-action.ts`
AI-assisted import server action. Pipeline:
1. Chef pastes booking notification email as raw text
2. `parseInquiryFromText()` extracts: client name, email, date, time, guests, location, occasion, dietary notes, channel = `take_a_chef`
3. `createClientFromLead(tenantId, { source: 'take_a_chef' })` — idempotent, deduplicates on email
4. INSERT into `inquiries` with `channel: 'take_a_chef'`
5. INSERT draft event
6. INSERT `event_state_transitions` (null → draft)
7. UPDATE `inquiries.converted_to_event_id`
8. If commission % > 0: INSERT commission expense into `expenses` with `category: 'professional_services'`, `vendor_name: 'Take a Chef'`
9. `logChefActivity()`

Pattern follows `lib/wix/process.ts` — the reference implementation for external source pipelines.

### `lib/inquiries/take-a-chef-capture-actions.ts`
Two exports:

**`captureTakeAChefBooking(input)`** — structured manual capture (no AI). Takes form fields directly and creates client + inquiry + draft event + optional commission expense. Used when the chef doesn't want to paste an email or doesn't have the notification.

**`getTakeAChefConversionData(eventId)`** — server action called from the event detail page. Checks whether an event's client was sourced from TakeaChef (by checking `client.referral_source === 'take_a_chef'` OR `inquiry.channel === 'take_a_chef'`). Returns the chef's direct booking URL (`/chef/{slug}`) and client name for the conversion banner.

### `components/import/take-a-chef-import.tsx`
Client component for the AI import tab. Two states:
- **Input state**: textarea for pasting booking email + commission % slider + "Parse & Review" button
- **Done state**: success confirmation with links to the created inquiry and a note about the commission expense

### `components/inquiries/take-a-chef-capture-form.tsx`
Manual quick-capture form (client component). Fields: full_name, email, phone (optional), event_date, serve_time, guest_count, location, occasion, total_price, commission_percent, log_commission checkbox, dietary_restrictions, additional_notes. Shows computed commission in dollars as the chef types.

### `components/events/take-a-chef-convert-banner.tsx`
Dismissable banner (client component) shown on completed TakeaChef-sourced event detail pages. Features:
- Pre-written message the chef can copy-send to the client
- One-click clipboard copy
- "Preview Link" button to open the booking URL
- Dismiss button that stores `tac_convert_dismissed_{eventId}` in localStorage — never nags after dismissal
- localStorage checked via `useEffect` to avoid hydration mismatch

---

## Files Modified

### `components/import/smart-import-hub.tsx`
- Added `'take-a-chef'` to the `ImportMode` union type
- Added tab config: `{ mode: 'take-a-chef', label: 'Take a Chef', placeholder: '', isCustomComponent: true }`
- Added render: `{isCustomMode && mode === 'take-a-chef' && <TakeAChefImport aiConfigured={aiConfigured} />}`

### `app/(chef)/import/page.tsx`
- Added `'take-a-chef'` to the `IMPORT_MODES` array

### `app/(chef)/events/[id]/page.tsx`
- On page load for completed events: fetches `getTakeAChefConversionData(eventId)` (parallel, errors are swallowed)
- If the event is TakeaChef-sourced: renders `<TakeAChefConvertBanner>` between the event header and the DOP progress section

### `lib/analytics/insights-actions.ts`
- Added `TakeAChefROI` type (exported)
- Added `getTakeAChefROI()` function that computes:
  - `tacClientCount` — clients with `referral_source = 'take_a_chef'`
  - `platformBookingsCount` — events where `inquiry.channel = 'take_a_chef'`
  - `directBookingsCount` — events from TAC clients where channel ≠ `take_a_chef`
  - `conversionRate` — % of TAC clients with at least one direct booking
  - `estimatedCommissionPaidCents` — sum of expenses with `vendor_name = 'Take a Chef'`
  - `estimatedCommissionSavedCents` — directBookings × avgEventValue × 0.25
  - `avgEventValueCents` — across all TAC client events
  - `topTacClients` — top 10 by total events, with per-client breakdown

### `app/(chef)/insights/page.tsx`
- Added `getTakeAChefROI` to the parallel `Promise.all` fetch
- Passed `tacROI` to `InsightsClient`

### `components/analytics/insights-client.tsx`
- Added `TakeAChefROI` to type imports
- Added `tacROI: TakeAChefROI` to `InsightsClientProps`
- Added `{ id: 'take-a-chef', label: 'Take a Chef ROI' }` to TABS
- Added full `TakeAChefROITab` component with stat cards, financial cards, client table, and explainer
- Added tab panel render: `{activeTab === 'take-a-chef' && <TakeAChefROITab roi={tacROI} />}`

---

## How It Connects to the System

### Schema (no changes needed)
The Layer 2 migration already defined:
- `take_a_chef` in `inquiry_channel` enum
- `take_a_chef` in `message_channel` enum
- `take_a_chef` in `referral_source` values used by `createClientFromLead()`

The Layer 2 AI parser (`lib/ai/parse-inquiry.ts`) already included `take_a_chef` in its channel schema and system prompt.

The Insights system (`getClientAcquisitionStats()`) already had `SOURCE_LABELS['take_a_chef'] = 'Take a Chef'`.

### Commission Tracking
Commission is stored as a standard expense:
- `category: 'professional_services'`
- `vendor_name: 'Take a Chef'`
- `description: 'Take a Chef commission (25%)'`
- `is_business_expense: true`

The `getTakeAChefROI()` function queries these via `vendor_name` filter. No new expense category was added — `professional_services` is the correct category per the existing constants.

### UX Flows

**Flow A — AI-assisted import:**
`/import?mode=take-a-chef` → paste booking email → AI parses → review → save → client + inquiry + draft event + commission expense created

**Flow B — Manual quick-capture:**
Quick-capture form → fill fields → save → same result as Flow A

**Flow C — Post-event direct booking prompt:**
Completed event detail page → banner appears → chef copies pre-written message → sends to client → client books directly next time

**Flow D — ROI review:**
Insights page → "Take a Chef ROI" tab → see clients sourced, conversion rate, commission saved

---

## No-Email Client Handling
The manual capture form handles the case where the chef doesn't have the client's email. In this case, the action inserts directly into the `clients` table without an email, bypassing `createClientFromLead()` which requires one. The client record is created with `source: 'take_a_chef'` and whatever contact info is available.

---

## Verification Checklist
- [ ] `/import?mode=take-a-chef` shows the new tab
- [ ] Paste a sample TakeaChef booking email → fields parse correctly (requires ANTHROPIC_API_KEY)
- [ ] Save → client with `referral_source = 'take_a_chef'`, inquiry with `channel = 'take_a_chef'`, draft event, and commission expense all created
- [ ] Navigate to created event, transition it to completed → "Convert to Direct" banner appears
- [ ] Click "Copy Message" → pre-written message + chef profile URL in clipboard
- [ ] Click Dismiss → localStorage key set, banner gone, doesn't return on reload
- [ ] Open Insights → "Take a Chef ROI" tab appears and renders (zeroes if no data)
- [ ] Clients list → client shows source as "Take a Chef"
