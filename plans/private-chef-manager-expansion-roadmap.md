# Private Chef Manager Expansion Roadmap

Implementation spec: [private-chef-manager-build-spec.md](./private-chef-manager-build-spec.md)

**Date:** March 6, 2026

## Scope

Private Chef Manager is the real integration surface.

Take a Chef is only one upstream demand source that flows through it.

ChefFlow should treat:

- **PCM** as the operating layer we need to mirror
- **Take a Chef** as one acquisition channel inside that layer
- **ChefFlow** as the chef-owned CRM, ops system, client memory, and direct-booking engine

## External Reality

Based on current public/help materials, PCM currently covers much more than simple lead emails:

- inquiry/request intake and a request dashboard
- proposal sending and menu sharing
- single-service and multiple-service booking flows
- calendar / availability management
- pre-booking communication on-platform
- guest contact reveal after booking
- chef website tools
- chef performance / ranking metrics
- commission + payout handling

Operationally, that means ChefFlow cannot stop at "new inquiry came in." It needs to mirror the full PCM lifecycle.

## What ChefFlow Already Has

ChefFlow already has a solid first layer for PCM / Take a Chef:

- Gmail OAuth connection, sync cron, and historical scan
- sender detection for `privatechefmanager.com` / `takeachef.com`
- deterministic TAC/PCM email parsing in [lib/gmail/take-a-chef-parser.ts](/Users/david/Documents/CFv1/lib/gmail/take-a-chef-parser.ts)
- inquiry/client/event creation in [lib/gmail/sync.ts](/Users/david/Documents/CFv1/lib/gmail/sync.ts)
- manual import and manual capture flows in [components/import/take-a-chef-import.tsx](/Users/david/Documents/CFv1/components/import/take-a-chef-import.tsx) and [components/inquiries/take-a-chef-capture-form.tsx](/Users/david/Documents/CFv1/components/inquiries/take-a-chef-capture-form.tsx)
- Take a Chef command-center widget in [components/dashboard/tac-dashboard-widget.tsx](/Users/david/Documents/CFv1/components/dashboard/tac-dashboard-widget.tsx)
- inquiry-level workflow helpers: stagnancy, transcript paste, menu nudge, likelihood override
- ROI analytics and direct-conversion banner in [lib/analytics/insights-actions.ts](/Users/david/Documents/CFv1/lib/analytics/insights-actions.ts) and [components/events/take-a-chef-convert-banner.tsx](/Users/david/Documents/CFv1/components/events/take-a-chef-convert-banner.tsx)
- communication pipeline awareness for platform emails

That is a real base. It is not enough for PCM parity.

## What Is Missing

### 1. PCM page-state capture

Right now ChefFlow mostly depends on notification emails.

That is too narrow for PCM because the actual working state lives on PCM pages:

- request detail page
- proposal/menu page
- conversation thread
- booking detail page
- guest contact page
- calendar / request settings

**Missing build:** a PCM browser extension or bookmarklet that lets the chef capture the active PCM page into ChefFlow with one click.

What it should capture:

- raw page snapshot or HTML excerpt
- request ID / order ID / URL fingerprint
- request status
- proposal/menu version
- message history snapshot
- schedule details for multi-service requests
- partner/source metadata

This is the highest-value missing piece.

### 2. Proposal and menu lifecycle mirror

ChefFlow currently nudges toward the final menu after booking. That is useful, but incomplete.

PCM uses proposals and menu revisions as part of the live sales process. ChefFlow needs to store:

- proposal created at
- proposal sent at
- proposal version history
- menu revisions
- quoted price changes
- included vs excluded groceries
- service type and extras
- last client reply after a proposal

Without this, ChefFlow sees the beginning and the end but misses the actual closing process.

### 3. Multi-service booking ingestion

PCM explicitly supports multiple services. ChefFlow already has broader multi-day booking work elsewhere, but the current TAC/PCM booking path collapses platform bookings too aggressively.

Current risk:

- new inquiry parsing stores only a single canonical date
- booking confirmation stores `serviceDates` as raw text
- event creation in [lib/gmail/sync.ts](/Users/david/Documents/CFv1/lib/gmail/sync.ts) creates one draft event from the first date-like value

**Missing build:** a PCM-to-series mapper that turns platform schedules into:

- one event series
- child services or dated service instances
- correct breakfast/lunch/dinner schedule blocks
- correct payout / grocery / labor rollups

### 4. Matching needs to get much stronger

This is a real operational risk.

Current matching still falls back to client-name-based logic in [lib/gmail/platform-dedup.ts](/Users/david/Documents/CFv1/lib/gmail/platform-dedup.ts). That is not strong enough for a platform workflow.

Top problems:

- booking confirmation may match by name only
- customer-info emails do not appear to use a stable order ID
- repeated guests or common names can collide
- multi-service requests create ambiguous context

**Missing build:**

- normalize and persist request/order identifiers at every stage
- parse identifiers from every PCM CTA link
- create a `platform_threads` or `platform_records` table keyed by canonical platform ID
- match future emails and page captures to that canonical row first, never by name if an ID exists

### 5. Payment and payout reconciliation

This is still shallow.

In [lib/gmail/sync.ts](/Users/david/Documents/CFv1/lib/gmail/sync.ts), `handleTacPayment()` is effectively a notification stub. That means ChefFlow does not fully reconcile:

- booking gross amount
- platform commission
- payout amount
- payout date
- payout status
- dispute / refund adjustments

**Missing build:**

- parse payout/payment emails
- support per-booking commission rate
- record pending payout vs paid payout
- reconcile payout date against event completion
- surface exceptions on the finance dashboard

### 6. Commission logic is too hardcoded

The current UI and import flows still assume a default 25% commission in several places, including [components/integrations/take-a-chef-setup.tsx](/Users/david/Documents/CFv1/components/integrations/take-a-chef-setup.tsx) and manual capture/import flows.

That is not robust enough for PCM reality.

**Missing build:**

- tenant-level default commission setting
- per-platform default
- per-booking override
- partner-source override
- net payout preview before save

### 7. No outbound PCM operating surface

ChefFlow currently helps the chef decide what to do, but it does not meaningfully support doing it inside the PCM workflow beyond opening a link.

**Missing build:**

- "Open in PCM" deep links with status-aware actions
- one-click "proposal sent", "message answered", "declined", "booked" logging
- optional user-driven browser extension actions to capture the page state after the chef finishes the action in PCM

Important: this should stay user-mediated unless terms clearly allow more automation.

### 8. Availability parity is missing

PCM has request settings / calendar / availability concepts.

ChefFlow has its own event calendar and Google Calendar sync.

Those two systems can drift.

**Missing build:**

- PCM availability snapshot capture
- ChefFlow vs PCM availability diff
- alert when ChefFlow is booked but PCM still appears open
- alert when PCM has a request window or block not reflected in ChefFlow

### 9. Contact unlock automation is incomplete

PCM reveals guest contact details after booking. ChefFlow already updates client records when customer info arrives. That is good, but the downstream automation is too light.

**Missing build after contact reveal:**

- create direct contact card
- verify / merge email and phone
- prompt portal invite
- create post-booking outreach sequence
- mark direct-booking readiness
- schedule rebook / anniversary reminders

### 10. Review flywheel is missing

PCM / Take a Chef reviews are strategically important for both ranking and future direct conversion.

ChefFlow currently has review-related infrastructure, but not a focused PCM review loop.

**Missing build:**

- import PCM / Take a Chef review counts and review text
- show platform review stats on public profile
- create post-event reminder task for review ask
- log whether a review was received
- draft response suggestions for the chef

### 11. PCM-specific scorecard is missing

ChefFlow has referral and ROI analytics, but not a real PCM operating scorecard.

**Missing dashboard:**

- median response time to new PCM requests
- proposal-sent rate
- request-to-book conversion
- stale request count
- direct-conversion rate after first PCM booking
- gross booked via PCM
- commission paid
- commission saved by repeat direct bookings
- bookings by partner/source inside PCM

### 12. Naming and product model need to shift

Internally, a lot of the product still frames this as a "Take a Chef integration."

That framing is now too small.

Recommended product model:

- **PCM Inbox / PCM Hub** as the parent feature
- **Take a Chef** as one source chip inside it
- future-compatible with other PCM-fed or marketplace-fed traffic

## Recommended Build Order

### P0: Must Build First

1. PCM browser extension / bookmarklet capture
2. canonical PCM request/order identity model
3. multi-service booking ingestion
4. payout / commission reconciliation
5. PCM scorecard for response time and proposal velocity

### P1: Immediate Growth Layer

1. proposal/menu version history mirror
2. contact-unlock automations
3. availability parity monitor
4. partner-source attribution
5. review import + review workflow

### P2: Competitive Advantage

1. source-aware post-event conversion sequences
2. direct-booking playbooks for PCM-sourced clients
3. win/loss analysis by request type, budget, location, and proposal speed
4. smart reminders for dormant PCM-origin clients

## Suggested Data Model Additions

- `platform_records`
  - `platform`
  - `platform_request_id`
  - `platform_order_id`
  - `platform_source`
  - `platform_url`
  - `status`
  - `partner_name`

- `platform_snapshots`
  - `platform_record_id`
  - `snapshot_type` (`request`, `proposal`, `thread`, `booking`, `calendar`)
  - `captured_at`
  - `raw_text`
  - `raw_html`
  - `parsed_json`

- `platform_proposals`
  - `platform_record_id`
  - `version_number`
  - `sent_at`
  - `menu_summary`
  - `price_cents`
  - `grocery_policy`
  - `status`

- `platform_payouts`
  - `platform_record_id`
  - `gross_cents`
  - `commission_cents`
  - `net_cents`
  - `payout_date`
  - `payout_status`

## 30-Day Execution Plan

### Week 1

- harden identity matching for PCM records
- remove hardcoded commission assumptions from UI/logic
- spec multi-service parser inputs from real PCM samples

### Week 2

- build the browser extension / bookmarklet capture MVP
- support request page and booking page capture first

### Week 3

- add proposal history and page snapshot storage
- wire contact-unlock automations

### Week 4

- add payout reconciliation
- add PCM scorecard
- add review and direct-conversion workflows

## Recommended Operating Principle

ChefFlow should not try to replace PCM where PCM is still the required marketplace surface.

ChefFlow should do three things better than PCM:

- remember everything
- connect marketplace activity to real business ops
- convert marketplace clients into chef-owned repeat business

That is the right tandem model.

## Immediate Repo Follow-Ups

These are the most important concrete follow-ups from this audit:

- replace "TakeAChef-only" framing with "Private Chef Manager / marketplace" framing where appropriate
- remove fixed 25% commission assumptions
- strengthen booking/contact matching so it does not rely on names
- stop collapsing multi-service bookings into one draft event
- build a user-driven PCM page capture tool
- add payout parsing instead of notification-only stubs

## Sources

- Take a Chef Help Center for chefs: https://helpcenter.takeachef.com/take-a-chef-for-chefs-en/
- Key Features of Private Chef Manager: https://www.takeachef.com/en-us/landing-page/experience/private-chef-manager
- Understanding Take a Chef's 18% Commission and other fees: https://helpcenter.takeachef.com/take-a-chef-for-chefs-en/articles/understanding-take-a-chefs-18-commission-and-other-fees
- Single Services and Multiple Services: https://helpcenter.takeachef.com/take-a-chef-for-chefs-en/articles/single-services-and-multiple-services

I did not find public PCM API or webhook documentation in the official public/help materials above, so the browser-extension / user-mediated capture recommendation is an inference from the currently visible docs and should be treated that way.
