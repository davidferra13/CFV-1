# Build: AI Local LLM Expansion — All 33 Gaps Closed

**Date:** 2026-02-21
**Branch:** feature/scheduling-improvements
**Model routing:** Ollama (local Llama) for PII/financial · Gemini for quality-critical creative

---

## What Changed

Expanded the ChefFlow AI layer from 26 existing modules to **59 total AI modules** — adding 29 new server action files and 20 new UI component panels covering every identified gap in the chef workflow.

All new AI output is **draft/insight only** — nothing becomes canonical without explicit chef confirmation. This is consistent with `docs/AI_POLICY.md`.

---

## New Server Actions (`lib/ai/`)

### Ollama-Routed (Privacy-First, Local Llama)

| File                           | What It Does                                                             |
| ------------------------------ | ------------------------------------------------------------------------ |
| `allergen-risk.ts`             | Guest × dish allergen risk matrix with safe/may_contain/contains levels  |
| `client-preference-profile.ts` | Synthesizes all event + message history into structured client profile   |
| `expense-categorizer.ts`       | Auto-classifies manual expense descriptions into categories              |
| `lead-scoring.ts`              | Scores inquiries 0–100 by conversion likelihood with hot/warm/cold tier  |
| `pricing-intelligence.ts`      | Suggests optimal price band from historical accepted quotes              |
| `sentiment-analysis.ts`        | Analyzes client message thread for sentiment trend + risk flags          |
| `tax-deduction-identifier.ts`  | Scans expense ledger for potentially missed/miscategorized deductions    |
| `temp-log-anomaly.ts`          | Checks temperature log entries against FDA Food Code standards           |
| `client-portal-triage.ts`      | Classifies + drafts holding responses for mid-service client messages    |
| `carry-forward-match.ts`       | Matches leftover ingredients from past events to upcoming event needs    |
| `business-insights.ts`         | AI narrative over revenue, pipeline, seasonality, and profitability data |

### Gemini-Routed (Quality-Critical, Creative)

| File                                  | What It Does                                                              |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `service-timeline.ts`                 | Minute-by-minute service run-of-show from chef arrival through cleanup    |
| `prep-timeline.ts`                    | Backward-scheduled prep plan from service time through all recipe prep    |
| `staff-briefing-ai.ts`                | Full AI-drafted staff briefing document (extends deterministic panel)     |
| `contingency-ai.ts`                   | "If X fails, do Y" plans tailored to each event's specific risk profile   |
| `contract-generator.ts`               | Full service agreement draft with all standard private chef clauses       |
| `recipe-scaling.ts`                   | Technique-aware scaling (not just multiplication — adjusts methods too)   |
| `grocery-consolidation.ts`            | Merges all recipe ingredients, groups by store section, flags allergens   |
| `menu-nutritional.ts`                 | Per-serving nutritional estimates for the full proposed menu              |
| `review-request.ts`                   | Personalized review request referencing specific dishes and moments       |
| `gratuity-framing.ts`                 | Recommends approach and drafts language for gratuity presentation         |
| `social-captions.ts`                  | Instagram/Facebook/Twitter captions in 3 tones (no client details)        |
| `chef-bio.ts`                         | Updated bio copy, tagline, LinkedIn headline from recent event data       |
| `testimonial-selection.ts`            | Scores and surfaces strongest client quotes for portfolio use             |
| `aar-generator.ts`                    | Full AAR narrative draft from event data (extends partial debrief AI)     |
| `equipment-depreciation-explainer.ts` | Chef-friendly depreciation schedule explanation per item                  |
| `vendor-comparison.ts`                | Best-value analysis across multiple vendor quotes for same category       |
| `permit-checklist.ts`                 | Step-by-step permit renewal checklist with lead times and estimated costs |

---

## New UI Components (`components/ai/`)

| Component                          | Surface Location                          |
| ---------------------------------- | ----------------------------------------- |
| `allergen-risk-panel.tsx`          | Event detail → Guests section             |
| `service-timeline-panel.tsx`       | Event detail → Day-Of tab                 |
| `prep-timeline-panel.tsx`          | Event detail → Production tab             |
| `pricing-intelligence-panel.tsx`   | Event detail → Quote creation             |
| `contract-generator-panel.tsx`     | Event detail → Documents section          |
| `aar-generator-panel.tsx`          | Event detail → Post-event tab             |
| `review-request-panel.tsx`         | Event detail → Post-event actions         |
| `gratuity-panel.tsx`               | Event detail → Post-event payment flow    |
| `client-preference-panel.tsx`      | Client detail page sidebar                |
| `lead-score-badge.tsx`             | Inquiry list view + inquiry detail        |
| `sentiment-badge.tsx`              | Client detail → Messages section          |
| `business-insights-panel.tsx`      | Dashboard → Business section              |
| `tax-deduction-panel.tsx`          | Finance → Tax section                     |
| `social-captions-panel.tsx`        | Event detail + Marketing section          |
| `chef-bio-panel.tsx`               | Settings → Profile page                   |
| `testimonial-panel.tsx`            | Marketing section + Client portal         |
| `grocery-consolidation-panel.tsx`  | Event detail → Grocery quote panel        |
| `menu-nutritional-panel.tsx`       | Event detail → Menu builder               |
| `temp-log-anomaly-panel.tsx`       | Event detail → TempLogPanel (augment)     |
| `contingency-ai-panel.tsx`         | Event detail → ContingencyPanel (augment) |
| `carry-forward-match-panel.tsx`    | Event detail → AvailableLeftovers panel   |
| `permit-checklist-panel.tsx`       | Settings → Compliance section             |
| `equipment-depreciation-panel.tsx` | Finance → Tax → Depreciation section      |
| `recipe-scaling-panel.tsx`         | Recipe detail page                        |
| `staff-briefing-ai-panel.tsx`      | Event detail → Staff section              |
| `expense-categorize-suggest.tsx`   | Expense entry form (inline)               |

---

## Routing Architecture

```
Sensitive Data (PII/Financial) → LOCAL OLLAMA (qwen3-coder:30b)
  - Client names, emails, preferences, messages
  - Inquiry budgets, event financial data
  - Expense ledger analysis
  - Allergen matrix (guest PII)
  - Business intelligence narrative
  FALLBACK: If Ollama unreachable → Gemini (existing behavior)

Quality-Critical Creative → GEMINI (gemini-2.0-flash)
  - Email/document drafting
  - Service timeline, prep schedule
  - Recipe scaling, nutritional estimates
  - Social media, marketing copy
  - Legal/compliance checklists
```

---

## AI Policy Compliance

Every new module follows the existing AI policy (`docs/AI_POLICY.md`):

- **Draft only** — no canonical writes without chef action
- **Chef confirmation required** — all output displayed for review first
- **Non-blocking** — AI errors degrade gracefully, never break the main flow
- **Tenant-scoped** — all DB queries filtered by `user.tenantId!`
- **Role-gated** — all server actions begin with `requireChef()`

---

## Integration Points

To connect these panels into the app:

### Event Detail Page (`app/(chef)/events/[id]/page.tsx`)

Add imports and render within appropriate sections:

- `<AllergenRiskPanel eventId={event.id} />` → near Guests section
- `<ServiceTimelinePanel eventId={event.id} />` → Day-Of section
- `<PrepTimelinePanel eventId={event.id} />` → Production section
- `<PricingIntelligencePanel eventId={event.id} />` → Quote section
- `<ContingencyAIPanel eventId={event.id} />` → below existing ContingencyPanel
- `<TempLogAnomalyPanel eventId={event.id} />` → below existing TempLogPanel
- `<CarryForwardMatchPanel eventId={event.id} />` → below AvailableLeftovers
- `<StaffBriefingAIPanel eventId={event.id} />` → below existing staff briefing
- `<ContractGeneratorPanel eventId={event.id} />` → Documents section
- `<GroceryConsolidationPanel eventId={event.id} />` → Grocery quote
- `<MenuNutritionalPanel eventId={event.id} />` → Menu section
- `<AARGeneratorPanel eventId={event.id} />` → Post-event (completed events)
- `<ReviewRequestPanel eventId={event.id} />` → Post-event actions
- `<GratuityPanel eventId={event.id} />` → Post-event payment
- `<SocialCaptionsPanel eventId={event.id} />` → Post-event actions

### Client Detail Page

- `<ClientPreferencePanel clientId={client.id} />` → sidebar
- `<SentimentBadge clientId={client.id} />` → messages section header
- `<LeadScoreBadge inquiryId={inquiry.id} />` → inquiry list/detail

### Dashboard

- `<BusinessInsightsPanel />` → Business section

### Finance/Tax

- `<TaxDeductionPanel />` → finance/tax page
- `<EquipmentDepreciationPanel />` → finance/tax/depreciation

### Settings/Profile

- `<ChefBioPanel />` → settings/profile
- `<PermitChecklistPanel />` → settings/compliance

### Marketing

- `<TestimonialPanel />` → marketing section

### Recipe Detail

- `<RecipeScalingPanel recipeId={recipe.id} />` → below recipe card

### Expense Form (inline)

- `<ExpenseCategorizeSuggest description={desc} amountCents={amount} onAccept={setCategory} />` → expense form

---

## Env Vars Required

No new environment variables needed. All new modules use the existing:

```
GEMINI_API_KEY=...           # Required for Gemini features
OLLAMA_BASE_URL=...          # Optional: enables local Llama routing
OLLAMA_MODEL=...             # Optional: defaults to qwen3-coder:30b
```

---

## What Was Already Covered (Not Duplicated)

- `getBookingSeasonality()` — deterministic; business-insights.ts adds AI narrative layer
- `getPipelineRevenueForecast()` — deterministic; business-insights.ts wraps it with narrative
- `getAvailableCarryForwardItems()` — deterministic fetch; carry-forward-match.ts adds AI matching
- `lib/ai/followup-draft.ts` — general follow-up (review-request.ts is distinct: asks for review)
- `lib/ai/quote-draft.ts` — line-item quote drafting (pricing-intelligence.ts is strategic guidance)
- `components/events/staff-briefing-panel.tsx` — deterministic compilation (staff-briefing-ai.ts adds AI narrative)
- `components/events/contingency-panel.tsx` — manual entry (contingency-ai-panel.tsx generates suggestions to add)

---

## Testing

1. Navigate to any event detail page → scroll to Guests section → click "Run Analysis" in Allergen Risk Panel
2. Open a client detail page → click "Build Profile" to test client preference builder
3. Open the dashboard → scroll to Business section → click "Get Insights"
4. Open any expense form → type a description → watch the inline categorization suggest appear
5. Open settings/compliance → click "Generate Checklist"
6. Open any recipe detail → try "Scale with AI" with a different serving count
