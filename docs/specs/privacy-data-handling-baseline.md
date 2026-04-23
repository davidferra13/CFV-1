# Privacy Data Handling Baseline

Last updated: April 22, 2026

## Goal

ChefFlow should behave like a service operator, not a data broker. The product may process personal information to run ChefFlow, but it must not turn customer data into a separate advertising, resale, or enrichment business.

## Canonical sources

- Runtime and public-policy source of truth: `lib/compliance/privacy-policy.ts`
- Public disclosure surface: `app/(public)/privacy/page.tsx`
- Drift guard: `tests/unit/privacy-policy-contract.test.ts`

## Non-negotiable rules

1. Never sell, rent, license, trade, or broker personal information.
2. Never send ChefFlow personal data to ad networks, remarketing tools, or data brokers.
3. Only use processors that help deliver ChefFlow functionality.
4. Minimize the data sent to each processor. Strip unnecessary credentials, cookies, and free text whenever possible.
5. Require user consent before enabling analytics cookies or optional tracking.
6. Keep public disclosures aligned with real runtime integrations.

## Allowed processor model

Use these categories when planning new vendors:

- Core processors: required to operate ChefFlow itself, such as payments, email delivery, edge security, consent-based analytics, error monitoring, and map/address lookup.
- Optional integrations: only activated when a chef explicitly connects or enables them, such as Google mailbox/calendar sync or Twilio messaging/calling.

Every processor should have:

- A clear purpose tied to ChefFlow functionality.
- A data-minimization statement describing exactly what is sent.
- A public privacy-policy link.
- A decision on whether user consent is required before activation.

## Build checklist for new integrations

1. Decide whether the vendor is a core processor or an optional integration.
2. Write down the exact data elements that leave ChefFlow.
3. Confirm the vendor is acting as a processor/service provider, not using the data for its own advertising or brokerage.
4. Add the vendor to `lib/compliance/privacy-policy.ts`.
5. Update the public privacy page if the disclosure changes.
6. Add or update a unit test if the integration creates a new runtime data flow.

## Phase plan

1. Baseline truth: keep the public privacy page aligned with real runtime processors.
2. Processor inventory: maintain one shared registry instead of scattered copy.
3. Drift prevention: add tests that tie disclosed processors to actual runtime integrations.
4. Expansion: for every new communication, AI, or growth feature, decide up front whether it belongs inside or outside the no-data-sale boundary.

## What this baseline does not allow

- Adding Meta Pixel, Google Ads remarketing, LinkedIn Insight, or similar ad-tech scripts tied to ChefFlow user data.
- Exporting contact lists, usage logs, or behavioral profiles to outside marketers or brokers.
- Quietly adding new third-party processors without updating the disclosure and contract test.
