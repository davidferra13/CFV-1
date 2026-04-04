# Research: Dev / IT / System Admin Workflow Reality

> **Date:** 2026-04-04
> **Question:** What do technically sophisticated users need from a food ops platform like ChefFlow?
> **Status:** complete

---

## Origin Context

This report investigates three distinct populations who interact with food ops software from a technical angle: chefs with programming or systems backgrounds who want extensibility; IT staff at larger catering operations who manage software procurement and compliance; and developers building integrations or extensions on top of a platform API. The goal is to understand what they actually need, where ChefFlow currently sits, and what the gaps are.

Research sources: ChefFlow source code audit, public product research, industry comparison against platforms like CaterZen, Flex Catering, Craftable, and Perfect Venue.

---

## Summary

ChefFlow has a real, complete API layer (v2 REST with scoped API keys, rate limiting, webhooks, and Zapier integration) that exceeds what most competing catering tools offer. The limitation is not capability: it is discovery, documentation, and surface area. A technically capable chef can use the API today. An IT evaluator trying to qualify ChefFlow for a multi-operator deployment would find no SSO, no multi-tenant user management, no SOC 2 certification, and no audit log available to non-admin users. A developer building on top of the platform would find no public docs, no sandbox, no SDK, and no developer portal. The infrastructure exists; the developer-facing product layer does not.

---

## Tech-Capable Chef Reality

### Who these people are

A subset of independent personal and private chefs have technical backgrounds: former software engineers who changed careers, chefs who taught themselves to code to solve ops problems, or food entrepreneurs who run Shopify stores and are comfortable with APIs and automation tools. This archetype is rare but disproportionately vocal and influential as early adopters.

The defining frustration is tool sprawl. A typical setup before ChefFlow or similar tools: Google Sheets for client tracking, Square for payments, Wave or FreshBooks for accounting, Notion for menus, Gmail for everything else. The pain is not that any one tool is bad. The pain is that nothing talks to anything.

### What they actually want

**Automation bridges.** The workflow that comes up repeatedly is: "when I confirm a new event, I want it to appear in my Google Calendar, create a folder in Google Drive, and send me a Slack notification." None of this is exotic. Zapier or Make handles it if the source platform has proper webhook/trigger support. The technical chef does not want to build the automation from scratch on every booking. They want to plug ChefFlow into the automation graph they already have.

**CSV and JSON export that is complete.** A tech-capable chef treats their client list as an asset. They want to export it fully (name, email, phone, tags, event history, dietary restrictions) to work with it in Airtable, run analytics in Python, or migrate away if needed. Partial exports (name/email only) create frustration. Financial exports to reconcile in a spreadsheet before sending to a bookkeeper are equally important.

**Direct API access for custom scripts.** A chef running their own scripts to pull booking data for analytics, generate custom reports, or push data into a custom dashboard needs a token-based API. They are not building a product; they want a personal API key to issue ad hoc queries.

**Self-hosting interest is real but niche.** A small segment wants to run the tool on their own infrastructure for privacy or cost reasons. This is more philosophical than practical for most: they want to know their data is not being sold or shared, and "self-hosted" feels like a proxy for "I control my data." For most of them, strong data export and clear privacy commitments address the underlying concern without requiring a self-hosted deployment.

### Current behavior as workaround

Without an API, tech-capable chefs write browser automation scripts, screen-scrape their own dashboards, or manually export CSVs and write transformation scripts. These workarounds are brittle and frustrating. They do not increase loyalty; they increase churn risk to tools with better API access.

---

## IT/Sysadmin at Scale Reality

### Who these people are

A catering company operating multiple locations, a hotel food service operation, a stadium concessions group, or a corporate chef-staffing firm. These organizations have 10 to 200+ users on their ops platform. They have an IT person or team who approves software procurement and handles user access management.

### Evaluation checklist at procurement

Based on industry research into how food service IT departments evaluate hospitality software, the standard questions are:

1. **SSO/SAML support.** Most mid-size operations are on Google Workspace or Microsoft 365 and expect to provision accounts through their identity provider. "We manage logins in Okta" is a non-negotiable. Platforms that require per-user password management are friction at procurement.
2. **Role-based access control (RBAC).** Front-of-house staff should not see financials. A scheduler should not be able to delete clients. The IT evaluator wants to define roles and assign them, not trust every user with admin access.
3. **Audit logs.** "Who changed this price? When was that client record modified? Who approved this payment?" are questions that come up in every food service operation after a dispute or error. Log access is a procurement requirement, not a nice-to-have.
4. **SOC 2 or equivalent compliance.** Enterprise food service groups put vendors through a security review. SOC 2 Type II is the baseline credential. Without it, the vendor gets deprioritized in favor of something that has been audited.
5. **Data residency and export.** Where is data stored? Can the organization export all of it? What happens to data if they cancel? These are standard GDPR/CCPA-adjacent questions even for organizations that are not strictly regulated.
6. **SLA and uptime guarantees.** A catering operation running a Saturday wedding needs the software to be up. IT wants a contractual SLA and a status page they can bookmark.
7. **Multi-tenant user management.** The ability to add, remove, and modify users without contacting support. Automated deprovisioning when staff leave.
8. **Integration with existing financial systems.** QuickBooks for accounting, ADP for payroll, Square or Toast for POS. These are not optional integrations; they are the operational backbone. If ChefFlow cannot sync into the accounting system, it adds reconciliation work, which is a procurement blocker.

### How they currently solve this

Most catering-scale operations in this bracket use Caterease, Total Party Planner, or enterprise event management platforms that have SSO and audit capabilities even if the UX is dated. They accept poor user experience in exchange for IT compliance features. Platforms like Craftable (which is SOC 2 and SSO-capable) have found success precisely because they cleared the IT procurement bar.

The gap ChefFlow needs to clear to serve this segment is not features: it is infrastructure credentials and multi-user governance.

---

## Developer/API Consumer Reality

### Who these people are

Agency developers building workflow automation for catering companies; developers at booking platforms integrating a chef's availability; corporate IT engineers building internal dashboards that pull event data; Make and Zapier power users building complex multi-step automations.

### What they expect from a platform API

Based on industry practice and comparison against platforms with published developer programs:

1. **Public documentation.** An OpenAPI/Swagger spec or equivalent. Examples for every endpoint. Clear error codes. Without docs, the API is effectively non-existent to an external developer.
2. **Sandbox environment.** The ability to develop and test against non-production data. Developers will not point test scripts at live client records. Without a sandbox, integration development is risky.
3. **Stable versioning.** The v2 naming convention signals awareness of this. Developers need confidence that endpoints will not break without notice.
4. **Webhook reliability.** HMAC-signed payloads, retry logic on delivery failure, delivery logs accessible to the developer. These are the minimum bar for trusting an event-driven integration.
5. **Reasonable rate limits.** 100 requests per minute per tenant is workable for low-volume automations but constraining for batch operations or syncs. Developers want to know the limits before they hit them.
6. **OAuth for third-party app flows.** An API key is fine for personal scripts. A developer building a reusable integration (like a "connect your ChefFlow account" button in another app) needs OAuth 2.0 so they can obtain tokens on behalf of users without handling their credentials.
7. **SDK or at least typed client.** A TypeScript types package or even just a well-documented OpenAPI spec that developers can use to generate a client. The faster the integration is to build, the more developers build it.

### Integration patterns developers actually build

The five automations that come up repeatedly in catering and food service developer contexts:

- **New inquiry to CRM push.** When a new inquiry comes in, push a contact record to HubSpot, Salesforce, or Airtable.
- **Event confirmation to calendar and communication tools.** Trigger a Slack message, add to Google Calendar, send a customized email sequence via Mailchimp.
- **Payment received to accounting.** Push a payment record to QuickBooks or Xero when a payment is recorded.
- **Contract signed notification.** Alert a team channel or trigger a prep workflow when a contract is signed.
- **Weekly financial summary.** Pull ledger data on a schedule and post a summary digest to Slack or email.

All five of these are already possible with ChefFlow's Zapier event types. The capability exists. The gap is the integration surface being discoverable and documented.

---

## Breakpoints

These are the moments where technically sophisticated users hit a wall:

**Breakpoint 1: No public documentation.**
A developer landing on app.cheflowhq.com looking for API docs finds nothing publicly accessible. They have to request access or reverse-engineer the API by watching network requests. Most developers stop here.

**Breakpoint 2: No sandbox.**
A developer who does get API access cannot test safely. The rate of integration development drops immediately when every test call touches production data.

**Breakpoint 3: No OAuth for third-party flows.**
An agency developer building a "connect ChefFlow" button for a client's dashboard cannot do it with API keys alone. OAuth 2.0 for delegated access is missing.

**Breakpoint 4: No SSO.**
An IT evaluator at a 30-person catering company encounters the "email + password" login and immediately flags it as a procurement concern. The conversation ends before the product is evaluated.

**Breakpoint 5: Audit log is admin-only and not exposed via API.**
A compliance-conscious operator cannot pull audit logs programmatically. The admin audit page exists but is behind the admin panel, not accessible to the chef's own account or via API.

**Breakpoint 6: Rate limit is in-memory.**
The 100 req/min rate limiter is stored in process memory (`windowMap`). It resets on server restart, is not shared across multiple server instances, and cannot be inspected via the API. This is adequate for a single-instance deployment but breaks in any horizontally scaled setup.

**Breakpoint 7: CSV exports are thin.**
Events CSV exports 7 fields. Clients CSV exports 6 fields. Financial export exists but covers ledger entries. There is no full data dump endpoint that produces everything a chef owns in a machine-readable format. A chef who wants to migrate tools or run deep analytics is limited.

---

## ChefFlow Match Analysis

| Capability                  | Industry Baseline      | ChefFlow Today        | Notes                                              |
| --------------------------- | ---------------------- | --------------------- | -------------------------------------------------- |
| REST API with auth          | Required               | Present               | v2 with Bearer token, scoped API keys              |
| Webhook delivery            | Common                 | Present               | HMAC-signed, 19 event types, delivery logs         |
| Zapier integration          | Common                 | Present               | 17 trigger types, subscribe/unsubscribe endpoints  |
| API key management UI       | Common                 | Present               | `/settings/api-keys` with scope selection          |
| CSV export                  | Common                 | Partial               | Events, clients, finance covered. Not a full dump. |
| QuickBooks integration      | Common                 | Present (OAuth wired) | OAuth flow implemented, sync depth unclear         |
| Square integration          | Common                 | Present (OAuth wired) | OAuth flow wired, depth unclear                    |
| DocuSign integration        | Common                 | Present (OAuth wired) | OAuth flow wired                                   |
| Webhooks for inbound events | Common                 | Present               | Stripe, DocuSign, Resend, Twilio, Wix, Square      |
| Public API documentation    | Expected               | Absent                | No public-facing docs                              |
| Sandbox environment         | Expected               | Absent                | No test environment                                |
| SSO/SAML                    | IT requirement         | Absent                | Not implemented                                    |
| Multi-user role management  | IT requirement         | Partial               | Staff portal exists; not full RBAC for chef-team   |
| User-accessible audit log   | IT requirement         | Admin-only            | Only accessible at `/admin/audit`                  |
| SOC 2                       | Enterprise requirement | Not certified         |                                                    |
| OAuth for third-party apps  | Developer expectation  | Absent                | API keys only, no delegated auth flow              |
| Rate limit (distributed)    | Developer expectation  | In-memory only        | Breaks across instances                            |
| Typed SDK or OpenAPI spec   | Developer convenience  | Absent                |                                                    |
| GDPR data export tool       | Privacy requirement    | Present               | `/settings/compliance/gdpr`                        |
| Data retention controls     | Privacy requirement    | Partial               | Delete account exists; no retention policy config  |

---

## Gaps and Unknowns

**Known gaps (confirmed absent from codebase):**

- Public API documentation / developer portal
- Sandbox environment or test account type
- OAuth 2.0 delegated authorization (third-party app flows)
- SSO / SAML integration
- Distributed rate limiting (current implementation is in-memory, single-process)
- User-accessible audit log (currently admin-only)
- Full data dump / account export endpoint
- SOC 2 or equivalent security certification

**Unknown depth (implemented but not fully verified):**

- QuickBooks sync: OAuth flow exists but it is unclear how much data syncs (invoices? expenses? both directions?)
- Square sync: OAuth wired, actual sync behavior not confirmed
- DocuSign: OAuth wired, workflow integration depth not confirmed
- Staff role granularity: staff portal exists but the permission model for chef-team-member vs. owner access is not fully documented in source

**Unknown demand split:**

Research does not establish what percentage of ChefFlow's target user base (solo private chefs) needs any of the IT/enterprise-tier features. The tech-capable chef wanting API access and Zapier integrations is a real segment. The IT evaluator managing a 50-person catering company is a different buyer with a different budget and a different sales motion. The degree to which ChefFlow wants to serve the latter is a product strategy question, not a capability question.

---

## Recommendations

Ordered by effort vs. impact for the solo-chef and small-team majority:

**High impact, lower effort:**

1. **Publish an OpenAPI spec.** The v2 API exists. Documenting it (even auto-generating from the route handlers and Zod schemas) turns invisible infrastructure into a visible feature. This single change converts the API from "technically present" to "developer-accessible."

2. **Add a "Developer" section to Settings.** Surface API key creation, webhook configuration, and Zapier setup in one place with onboarding text that explains what each does. Most chefs don't know ChefFlow has an API; they don't know to look for it.

3. **Expand CSV exports to full field coverage.** The current exports are minimal. A complete client export (including dietary restrictions, tags, event history count, total revenue) and a complete event export (all fields, not just the 7 currently exported) would serve the data ownership need without API complexity.

4. **Expose delivery logs for webhooks in the UI.** The delivery log infrastructure (`DeliveryLogEntry` type, log table) exists. Surfacing this to the chef in the Webhooks settings page (last X deliveries, success/fail, response code) would make webhook debugging self-service.

**Medium impact, higher effort:**

5. **Distributed rate limiting.** Replace the in-memory rate limiter with Redis or a database-backed implementation. Required before any horizontal scale or multi-instance deployment. This is an infrastructure reliability issue, not just a developer experience issue.

6. **Expand audit log access.** Make the audit log available to the chef for their own account (not just the platform admin). An operator should be able to see "who on my team changed this event" without contacting support.

7. **OAuth 2.0 for third-party app flows.** Required to support agency developers building reusable integrations. The Zapier integration already uses a form of this pattern; extending it to a general OAuth server would unlock the developer ecosystem.

**Lower priority for current user base (relevant if product expands to teams or venues):**

8. SSO / SAML support
9. Granular RBAC for team accounts
10. SOC 2 certification
11. Data residency configuration

---

_Sources consulted: ChefFlow source code (app/api/v2, lib/api, lib/integrations, lib/webhooks, app/(chef)/settings/api-keys, app/(chef)/settings/webhooks, app/(chef)/settings/zapier, app/(chef)/settings/integrations); industry research on catering platform integrations and hospitality IT requirements._
