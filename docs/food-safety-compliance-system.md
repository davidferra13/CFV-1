# Food Safety & Compliance System

## What Changed

Added a two-part compliance system: (1) professional certification tracking with expiry reminders, and (2) event-level food temperature logging for HACCP-style auditing. Also added an allergen risk summary that cross-references client dietary needs against the event menu.

## Why

Private chefs carry personal liability for food safety. ServSafe certifications expire every 5 years, food handler cards expire in 2–3 years, business licenses need annual renewal. Letting any of these lapse is both a legal risk and a reputation risk. Temperature logging is the cornerstone of HACCP compliance — being able to document that food was held at safe temperatures is increasingly expected by high-end clients and required for commercial catering events.

## What Was Built

### Database

**Migration:** `supabase/migrations/20260303000011_food_safety_compliance.sql`

**`chef_certifications`**

- `cert_type` enum: `food_handler`, `servsafe_manager`, `allergen_awareness`, `llc`, `business_license`, `liability_insurance`, `cottage_food`, `other`
- `name` — descriptive label
- `issuing_body`, `issued_date`, `expiry_date`, `cert_number`
- `reminder_days_before INTEGER DEFAULT 30` — how many days before expiry to trigger notification
- `document_url` — link to scanned/digital copy
- `status` enum: `active`, `expired`, `pending_renewal`
- RLS: chef-scoped

**`event_temp_logs`**

- `event_id`, `chef_id` FKs
- `item_description`, `temp_fahrenheit NUMERIC(5,1)`
- `phase` enum: `receiving`, `cold_holding`, `hot_holding`, `cooling`, `reheating`
- `is_safe BOOLEAN` — chef-assessed pass/fail at log time (not DB-enforced, matches HACCP philosophy of chef responsibility)
- `logged_at TIMESTAMPTZ`
- RLS: chef-scoped

### Server Actions

**File:** `lib/compliance/actions.ts`

**Certifications:**
| Action | What |
|--------|------|
| `createCertification(input)` | Add a new cert record |
| `updateCertification(id, input)` | Edit existing cert |
| `deleteCertification(id)` | Remove cert record |
| `listCertifications()` | All certs, sorted by expiry date ascending |
| `getExpiringCertifications(daysAhead)` | Active certs expiring within N days (default 60) |
| `certExpiryStatus(expiryDate)` | Helper: returns `{ daysRemaining, tier }` where tier is `none/ok/warning/critical/expired` |

**Temperature Logs:**
| Action | What |
|--------|------|
| `logTemperature(input)` | Record a temperature reading for an event |
| `deleteTempLog(id)` | Remove a reading |
| `getEventTempLog(eventId)` | All readings for an event, chronological |

**Allergen Risk:**
| Action | What |
|--------|------|
| `getAllergenRiskSummary(eventId)` | Cross-references client dietary restrictions + allergies against event menu. Returns `{ clientName, dietaryRestrictions, allergies, menuDishes, hasAllergenConcerns }` |

Exports `SAFE_TEMP_RANGES` — a reference map of safe temperature rules by phase (for display in UI, not enforced by DB).

### UI

- **`app/(chef)/settings/compliance/page.tsx`** — Certifications dashboard: expiry alert banner (60-day window), active certs list with color-coded expiry badges, expired/pending section, add form
- **`app/(chef)/settings/compliance/cert-form.tsx`** — Full form: cert type, name, issuing body, dates, cert number, document URL, status, reminder days
- **`components/events/temp-log-panel.tsx`** — Temperature log panel for event detail page: log list with phase, temp, safe/unsafe badge, inline add form with safe range reference text

## Expiry Tier Logic

`certExpiryStatus()` maps days remaining to a visual tier:

- `expired` — past expiry date
- `critical` — 0–14 days remaining (red badge)
- `warning` — 15–60 days remaining (amber badge)
- `ok` — 61+ days remaining (green badge)
- `none` — no expiry date set

## Safe Temperature Reference (SAFE_TEMP_RANGES)

| Phase        | Safe Rule                                |
| ------------ | ---------------------------------------- |
| Receiving    | ≤ 40°F for cold; ≥ 140°F for hot         |
| Cold holding | ≤ 40°F                                   |
| Hot holding  | ≥ 140°F                                  |
| Cooling      | 135°F → 70°F within 2h; → 41°F within 6h |
| Reheating    | ≥ 165°F within 2 hours                   |

These follow FDA Food Code guidelines. The `is_safe` field is chef-assessed (not computed by the database) — this mirrors the HACCP philosophy that the operator is responsible for evaluation.

## Future Considerations

- Automation trigger: cert expiring within `reminder_days_before` days → chef notification
- HACCP log PDF export per event
- Allergen cross-check warning banner on event detail page
- Allergen filter on grocery list generation
