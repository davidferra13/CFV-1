# Prospecting Hub — Feature Documentation

> **Admin-only outbound lead generation system.** AI-powered "lead scrubbing" that generates lists of high-value targets by region, stores them permanently, and provides a daily cold-call workflow with reusable scripts.

## Overview

The Prospecting Hub replaces manual lead research with an AI pipeline that:

1. **Accepts free-form queries** — "Top 100 car dealerships in Maine," "Wealthiest business owners in Massachusetts," "Yacht clubs within 30 miles of Greenwich, CT"
2. **Generates detailed prospect dossiers** — name, contact info, gatekeeper intel, approach strategy, talking points
3. **Enriches with real web data** — scrapes actual phone numbers, emails, social profiles, and staff names from business websites
4. **Builds daily call queues** — prioritized by follow-ups due → new prospects → least recently called
5. **Tracks every interaction** — call outcomes, notes, follow-up scheduling, conversion to inquiry

---

## Access Control

- **Strictly admin-only** — NOT Pro, NOT for regular chef users
- Gated via `requireAdmin()` from `lib/auth/admin.ts`
- Nav item only visible to admins (`visibility: 'advanced'`)
- No entry in Pro feature registry — completely separate from billing tiers

---

## Database Schema

Migration: `supabase/migrations/20260322000039_prospecting_hub.sql`

### Tables

| Table                     | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `prospect_scrub_sessions` | Logs each AI scrubbing run with the exact query                |
| `prospects`               | Permanent lead database — 40+ columns of detailed dossier data |
| `prospect_notes`          | Append-only note log — every interaction timestamped           |
| `prospect_call_scripts`   | Reusable cold-calling scripts with category matching           |

### Modifications to Existing Tables

- `scheduled_calls` — added `prospect_id` FK and `'prospecting'` call type

### Key Prospect Fields

**Identity:** name, prospect_type (organization/individual), category (21 types), description

**Contact:** phone, email, website, address, city, state, zip, region

**Gatekeeper Intel:** contact_person, contact_title, contact_direct_phone, contact_direct_email, gatekeeper_name, gatekeeper_notes, best_time_to_call

**Intelligence:** social_profiles (JSONB), annual_events_estimate, membership_size, avg_event_budget, event_types_hosted, seasonal_notes, competitors_present, luxury_indicators, talking_points, approach_strategy

**Tracking:** status (7 states), call_count, last_called_at, last_outcome, next_follow_up_at, converted_to_inquiry_id

---

## AI Pipeline (3 Phases)

### Phase 1: Gemini Scrub — Identify Targets

- Chef types free-form query → Gemini interprets intent
- Generates structured prospect data with category auto-assignment
- Uses `gemini-2.0-flash` with JSON response mode
- Prompt: aggressive lead generation specialist persona

### Phase 2: Web Enrichment — Verify & Deepen

- For each prospect: `searchWeb()` → find real website URL
- `readWebPage()` → extract with regex: phone numbers, emails, social media URLs
- Second search for events/catering info
- Marks enriched prospects with `source: 'web_enriched'`

### Phase 3: AI Approach Generation

- Final Gemini pass per prospect
- Generates personalized talking points and approach strategy
- Incorporates all enriched data

### Key Files

| File                               | Purpose                                           |
| ---------------------------------- | ------------------------------------------------- |
| `lib/prospecting/scrub-prompt.ts`  | Gemini prompts (NOT 'use server')                 |
| `lib/prospecting/scrub-actions.ts` | 3-phase pipeline execution                        |
| `lib/prospecting/constants.ts`     | Categories, statuses, outcomes (NOT 'use server') |

---

## Server Actions

### CRUD (`lib/prospecting/actions.ts`)

- `getProspects(filter)` — list with status/category/region/search filters
- `getProspect(id)` — single prospect detail
- `getProspectStats()` — counts by status
- `getProspectNotes(prospectId)` — chronological note history
- `getScrubSessions()` — past scrub run history
- `addProspectManually(data)` — manual entry
- `addProspectNote(prospectId, content, type)` — append note
- `updateProspect(id, data)` — edit contact info
- `updateProspectStatus(id, status)` — pipeline movement
- `deleteProspect(id)` — remove

### AI Scrubbing (`lib/prospecting/scrub-actions.ts`)

- `scrubProspects(query)` — main 3-phase pipeline

### Call Queue (`lib/prospecting/queue-actions.ts`)

- `buildDailyQueue(count, filters?)` — prioritized queue
- `logProspectCall(prospectId, outcome, notes, followUpDays)` — log outcome + create scheduled_calls record
- `convertProspectToInquiry(prospectId)` — creates inquiry linked to prospect

### Call Scripts (`lib/prospecting/script-actions.ts`)

- `getCallScripts()` / `getCallScript(id)` — read
- `createCallScript(data)` / `updateCallScript(id, data)` / `deleteCallScript(id)` — CRUD
- `getScriptForCategory(category)` — auto-suggest matching script

---

## Pages

| Route                  | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `/prospecting`         | Main prospect database with stats cards and filterable table |
| `/prospecting/scrub`   | AI Scrub launcher — free-form query + presets                |
| `/prospecting/queue`   | Daily call queue builder and workflow                        |
| `/prospecting/scripts` | Call script CRUD                                             |
| `/prospecting/[id]`    | Prospect dossier — full intelligence profile                 |

---

## Components

| Component                 | File                                                 |
| ------------------------- | ---------------------------------------------------- |
| ProspectTable             | `components/prospecting/prospect-table.tsx`          |
| ScrubForm                 | `components/prospecting/scrub-form.tsx`              |
| QueueCard                 | `components/prospecting/queue-card.tsx`              |
| ScriptEditor + ScriptList | `components/prospecting/script-editor.tsx`           |
| ProspectDossierClient     | `app/(chef)/prospecting/[id]/dossier-client.tsx`     |
| CallQueueClient           | `app/(chef)/prospecting/queue/call-queue-client.tsx` |
| ScriptsPageClient         | `app/(chef)/prospecting/scripts/scripts-client.tsx`  |

---

## Prospect Status Flow

```
new → queued → called → follow_up → converted
                  ↓         ↓
              not_interested  dead
```

- **new** — just generated by AI scrub
- **queued** — added to a daily call queue
- **called** — contacted at least once (no answer, left message)
- **follow_up** — spoke, scheduling follow-up
- **not_interested** — declined
- **converted** — became an inquiry (linked via `converted_to_inquiry_id`)
- **dead** — wrong number, closed, irrelevant

---

## Integration with Calls System

Every call logged via `logProspectCall()` creates a `scheduled_calls` record with:

- `call_type: 'prospecting'`
- `prospect_id` FK linking back to the prospect
- `status: 'completed'` (already happened)
- Full contact info from prospect

This means all prospecting calls appear in the unified Calls & Meetings view.

---

## Environment Requirements

- `GEMINI_API_KEY` — required for AI scrubbing
- Tavily or DuckDuckGo web search configured (via `lib/ai/remy-web-actions.ts`)
- No Ollama requirement — all data is public, no PII

---

## Category System (21 Types)

**Venues & Clubs:** yacht_club, country_club, golf_club, marina, luxury_hotel, resort_concierge

**Event Industry:** wedding_planner, event_coordinator, corporate_events

**Wealth Management:** estate_manager, luxury_realtor, personal_assistant, concierge_service

**Individuals:** business_owner, ceo_executive, real_estate_developer, philanthropist, celebrity, athlete, high_net_worth

**Catch-all:** other
