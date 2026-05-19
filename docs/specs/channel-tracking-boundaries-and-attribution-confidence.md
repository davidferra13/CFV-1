# Channel Tracking Boundaries And Attribution Confidence

Date: 2026-05-19
Status: verified research note
Queue item: BQ-20260519T171825Z-channel-tracking-boundaries-and-attribution-confidence-resea
Run: RUN-20260519T211804Z-growth-remy-stragglers

## Purpose

ChefFlow may help chefs understand where demand appears to come from, but it must not overstate attribution from Wix, marketplaces, referrals, direct inquiry, review links, or later booking and payment evidence.

This note defines the boundary for future attribution UI, reporting, Remy summaries, review command-center work, Dinner Circle growth work, and analytics build items. The product should show evidence and confidence, not fake certainty.

## Existing Internal Context

- `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md` already shows that ChefFlow has multiple intake lanes, not one generic website lead.
- `docs/specs/p1-source-provenance-and-conversion-analytics-correction.md` defines a helper-oriented path for real intake-lane provenance.
- `docs/specs/privacy-data-handling-baseline.md` says ChefFlow must behave like a service operator, not a data broker.
- `docs/specs/p1-pipeline-analytics-truth-and-honesty.md` establishes the same product rule for analytics: unavailable or uncertain is not the same as zero or true.

## Official External Guardrails Checked

- FTC business guidance for endorsements, reviews, and testimonials: https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews
- FTC Consumer Reviews and Testimonials Rule Q&A: https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers
- Google Business Profile prohibited and restricted review content: https://support.google.com/business/answer/2622994
- Google Analytics consent mode overview: https://support.google.com/analytics/answer/10000067

These sources do not make ChefFlow's implementation decisions for us, but they constrain the shape of safe claims: reviews must not be manipulated or misrepresented, consent-aware measurement must respect visitor choices, and marketing copy must not imply stronger proof than the evidence supports.

## Allowed Evidence Sources

Use these as the only accepted evidence families for attribution and source claims.

| Evidence                           | Examples                                                                                               | Notes                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| First-party intake record          | inquiry route, form source, embed source, Wix submission id, kiosk device event, instant-book metadata | Best evidence when persisted at creation time and tenant-scoped.                                      |
| Preserved campaign context         | UTM source/medium/campaign, referral token, source landing URL                                         | Evidence of visit context, not proof of purchase causality by itself.                                 |
| Linked business record chain       | inquiry -> event -> quote -> payment -> completed event                                                | Stronger when the IDs are explicit and the chain is not reconstructed from time proximity alone.      |
| Explicit self-report               | client says "I found you on Google" or chef records "planner referral"                                 | Useful, but distinguish reported source from observed source.                                         |
| External platform source link      | Google, Airbnb, TakeAChef, Yelp, TripAdvisor, Thumbtack, Bark, Nextdoor, Instagram, website review URL | Link proves a source artifact exists. It does not automatically prove that source caused the booking. |
| Human-confirmed import             | chef confirms a manual review, referral, or lead came from a platform                                  | Requires audit metadata: who confirmed, when, original source, and what changed.                      |
| Assistant extraction with evidence | Remy parsed a source from a message and points to the message                                          | Must remain suggested or needs-review until a human or deterministic link confirms it.                |

## Prohibited Tracking Assumptions

ChefFlow must not do the following in growth, attribution, analytics, Remy, review, or reputation surfaces.

- Claim a platform "caused" revenue from UTM, referrer, or last-click evidence alone.
- Merge multiple people across devices by fingerprinting, probabilistic identity, hidden IDs, or brokered enrichment.
- Scrape private marketplace, Airbnb, TakeAChef, Google, email, SMS, or social data to build attribution unless the chef explicitly connected the integration and the platform terms allow the use.
- Treat a review link as proof that the reviewer booked from that platform.
- Treat a later Google review as proof that Google generated the dinner.
- Treat Remy extraction from free text as a fact without exposing the source message and confidence.
- Use ad-tech, remarketing tags, or third-party behavioral profiling outside the existing privacy baseline and consent model.
- Store raw URLs, query strings, email bodies, screenshots, or platform payloads in public surfaces.
- Display private referral names, guest names, message content, or booking details in public discovery or structured data.
- Hide uncertainty behind rounded percentages, revenue totals, or confident language like "won from Google" when the source journey is mixed or incomplete.

## Consent And Privacy Constraints

Attribution data should follow least-collection rules.

- Collect only the source fields needed for ChefFlow functionality and reporting.
- Separate public-safe source labels from private evidence payloads.
- Require explicit opt-in before enabling optional analytics cookies or optional platform integrations.
- Keep Gmail, calendar, SMS, marketplace, and review integrations purpose-bound to the connected chef's ChefFlow workflow.
- Do not use client, guest, or reviewer data for ad targeting, resale, enrichment, brokered audiences, or unrelated marketing.
- Public output may show a source label only when the record is public-approved and the source URL is safe to expose.
- Internal analytics may show more provenance than public pages, but must remain tenant-scoped.
- Remy and automation outputs must include the evidence pointer and confidence level when making attribution recommendations.

## Confidence Labels

Every attribution surface should expose one of these labels. Do not hide confidence in a tooltip-only surface if the claim affects business decisions.

| Label     | Meaning                                                                                                                                                                                            | Allowed UX claim                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Confirmed | A deterministic ChefFlow-created source marker or referral token is linked through the same tenant's inquiry/event/payment chain, or a human confirmed an imported source with preserved evidence. | "Confirmed source: Wix form. Linked to paid event."                 |
| Strong    | Multiple independent signals agree, such as source route plus UTM plus linked event, but no single end-to-end deterministic token exists.                                                          | "Strong signal: Google Business Profile inquiry."                   |
| Reported  | The source is self-reported by the client, chef, guest, or planner.                                                                                                                                | "Reported source: planner referral."                                |
| Suggested | Remy or a heuristic found a likely source in messages, notes, timing, or partial campaign data.                                                                                                    | "Suggested source: Instagram DM. Needs confirmation."               |
| Unknown   | No reliable source evidence exists.                                                                                                                                                                | "Source unknown."                                                   |
| Mixed     | Multiple plausible sources exist and cannot be separated.                                                                                                                                          | "Mixed journey: Google search, website form, and planner referral." |

Do not use "High/Medium/Low" in UI if it encourages numeric certainty. Use the labels above and optionally map them internally to high, medium, low, unknown for analytics.

## Example Journeys

### Direct Site Inquiry

Evidence: public chef inquiry route, preserved UTM, inquiry id, later event and payment.

Safe claim: "Confirmed source: direct chef inquiry. Campaign: spring tasting menu."

Unsafe claim: "This campaign caused $4,200" unless the attribution model explicitly says it is source-linked revenue, not causal incrementality.

### Marketplace Lead

Evidence: chef logs TakeAChef source URL and attaches it to an inquiry; client later books in ChefFlow.

Safe claim: "Reported marketplace source: TakeAChef. Linked event and payment found."

Unsafe claim: "TakeAChef generated the booking" unless the marketplace source was deterministically imported or confirmed with platform-safe evidence.

### Referral

Evidence: signed referral token or chef-confirmed planner referral attached to inquiry.

Safe claim: "Confirmed referral source: planner token" or "Reported referral: Sarah P."

Unsafe claim: showing the referrer's full identity on a public page without explicit consent.

### Assistant Handoff

Evidence: Remy parses "found you on Google" from a message and links to the source message.

Safe claim: "Suggested source from message: Google. Needs confirmation."

Unsafe claim: "Google source confirmed" before human confirmation or deterministic route evidence.

### Mixed Source Journey

Evidence: visitor arrives from Google, returns through a direct URL, then books after a planner email.

Safe claim: "Mixed journey: Google search, direct return, planner email. Revenue should not be assigned to one source without a selected model."

Unsafe claim: "Planner email won 100% of the revenue" or "Google won 100% of the revenue" by default.

## Implementation Guidance

Future code should add a small shared attribution contract instead of scattering source language.

Suggested shape:

```ts
type AttributionConfidence = 'confirmed' | 'strong' | 'reported' | 'suggested' | 'mixed' | 'unknown'

type AttributionEvidence = {
  sourceLabel: string
  confidence: AttributionConfidence
  evidenceKinds: Array<
    | 'first_party_intake'
    | 'campaign_context'
    | 'linked_business_chain'
    | 'self_report'
    | 'external_source_link'
    | 'human_confirmed_import'
    | 'assistant_extraction'
  >
  publicSafe: boolean
  evidenceSummary: string
  privateEvidenceRef?: string
  sourceUrl?: string
  requiresConsentReview?: boolean
}
```

Required behavior:

- Internal analytics can aggregate by source label and confidence.
- Public pages can only show `publicSafe` evidence.
- Remy summaries must cite `evidenceSummary` and never upgrade `suggested` to fact.
- Review/reputation surfaces must preserve direct source links only when the URL is safe and public-approved.
- Pricing, client contribution, and growth recommendations may use attribution as one input, but must show freshness and confidence before recommending price or campaign changes.

## Queue References

This note is ready to be referenced by these active or future areas:

- Dinner Circle Growth Engine: Google Reviews, Guest Leads, Follows, Rebooking, Consent, and Full Tracking.
- Unified Review Command Center With Source Links.
- Public Discovery Rail work that exposes source or trust claims.
- Client contribution acquisition-source ROI work.
- Remy Client Business Briefing for Contribution Intelligence.
- Pricing, quote fallback, and quote-change impact work when it uses source or campaign profitability.
- Native analytics memory layer after the blocked foundation is unblocked.

## Verification Matrix

| Acceptance point                | Evidence in this note                 |
| ------------------------------- | ------------------------------------- |
| Allowed evidence sources        | `Allowed Evidence Sources` table      |
| Prohibited tracking assumptions | `Prohibited Tracking Assumptions`     |
| Consent and privacy constraints | `Consent And Privacy Constraints`     |
| Confidence labels               | `Confidence Labels`                   |
| UX language                     | Confidence table and example journeys |
| Direct site example             | `Direct Site Inquiry`                 |
| Marketplace example             | `Marketplace Lead`                    |
| Referral example                | `Referral`                            |
| Assistant handoff example       | `Assistant Handoff`                   |
| Mixed-source example            | `Mixed Source Journey`                |

## Runtime Impact

None. This is a docs-only research item. No routes, server actions, API handlers, jobs, database queries, or UI files changed.
