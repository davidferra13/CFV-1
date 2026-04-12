# Research: Multi-Stakeholder Workflow Reality for Architecture Refinement

> **Date:** 2026-04-09
> **Question:** How do each of ChefFlow's major stakeholder groups currently handle the class of problem ChefFlow is solving, and which of those findings should change the active architecture work?
> **Status:** complete
> **Purpose:** ground the current architecture and boundary specs in real stakeholder workflows instead of repo-only intuition

---

## Origin Context

The current architecture work is already moving from discovery into decision. The missing step was a stakeholder-by-stakeholder reality check: not "what features could exist," but how each relevant actor actually does this work today, where their workflows break, what workarounds they use, and which of those findings should materially refine the architecture work now.

This document does not try to merge every finding into one universal model. It extracts only the highest-value implications for the active work:

- runtime surface boundary enforcement
- request trust and API tenant-boundary hardening
- public, portal, and control-plane clarity

---

## Method

This pass used four evidence layers and cross-checked them against each other:

1. Existing repo research already captured from earlier deep workflow work across chefs, operators, finance, compliance, and technical users.
2. Current ChefFlow product definition and active architecture specs.
3. Official platform and regulatory documentation reviewed directly in this pass.
4. Current operator-system patterns from workflow tools that chefs and small food businesses actually use today.

This was intentionally filtered for relevance. If a finding did not materially affect ChefFlow's current architectural decisions, it was left out.

---

## Short Answer

The evidence converges on six stable conclusions:

1. Primary users do not want a single "everything" surface. They want a light public entry, a dense operator workspace, and a constrained client or staff experience.
2. Business and back-office actors need explicit control and reporting lanes, not admin shortcuts buried inside chef navigation.
3. Operational and finance work is real, but it should attach to the operator system rather than distort first-run or client flows.
4. Technical and integration users expect explicit trust boundaries, stable auth models, OAuth or API-key clarity, and retry-safe webhook behavior.
5. Compliance actors care less about visual polish than they do about auditability, actor identity, and clear document ownership.
6. Best-in-class systems do not collapse public, operator, partner, client, support, and admin into one fuzzy runtime surface. They separate them by actor, trust boundary, and decision authority.

That means the current architecture work should keep moving in two directions:

- sharpen runtime surface ownership
- harden request and tenant trust boundaries

Not because it is elegant, but because it matches how the real stakeholders surrounding ChefFlow actually work.

---

## 1. Primary Users / Experience

Targets covered:

- chef
- consumer / customer / client
- first-time / low-experience users
- operators
- power users

### Real workflow

Across the repo research and current workflow tools, the operator cycle is still remarkably consistent:

1. Discovery through Instagram, referrals, Google, or marketplace listings.
2. Lightweight first contact by phone, text, DM, or a short inquiry form.
3. Proposal and menu iteration in email, PDF, Google Docs, HoneyBook, Dubsado, or Square.
4. Booking through deposit collection, contract, and calendar confirmation.
5. Planning through shopping lists, prep notes, staff texting, and timeline documents.
6. Execution in the kitchen, mostly outside software except for reference, photos, or checklists.
7. Close-out through payment, grocery reimbursement, feedback, and repeat-booking memory.

The evidence stays consistent on one important detail: first contact is light. Most chefs collect a small set of initial fields, then gather the rest through follow-up conversation. HoneyBook and Dubsado both package proposals, contracts, invoices, and client portals into a staged clientflow rather than one giant intake up front, and repo research shows private chefs typically gather roughly 6 to 8 fields on first contact before deeper menu or event detail is collected.

First-time users and low-experience chefs are also extremely sensitive to setup burden. Repo research on adoption shows that heavy setup, empty dashboards, unclear next actions, and mid-wizard auth asks slow activation. Power users show the opposite pattern: they want batch workflows, dense views, exports, shortcuts, and automation access once the business is already running.

### Where it breaks

- Inquiry details scatter across text threads, emails, PDFs, and memory.
- Dietary and allergy context is easy to lose between intake and event day.
- Proposal and menu revision loops become document ping-pong.
- First-time chefs get overwhelmed by empty or over-configured surfaces.
- Power users hit ceilings when bulk actions, exports, saved views, and automation are thin.
- Returning clients repeat information because the system boundary between public inquiry and long-lived client memory is weak in most tools.

### Workarounds used today

- Phone notes, WhatsApp, Gmail, and Google Docs.
- HoneyBook or Dubsado for proposal-contract-invoice bundling.
- Square estimates plus invoice conversion for smaller operators.
- Spreadsheets for pricing anchors and repeatable quote logic.
- Printed binders, photo albums, and prep sheets in kitchens.
- Google Calendar as the scheduling memory layer.

### What is missing or poorly solved

- Progressive intake that stays short for new leads but becomes structured over time.
- Interactive review and approval that does not require endless static-document revision.
- Strong first-run guidance for low-experience operators.
- True power-user affordances once the business becomes multi-event and data-heavy.
- Durable cross-booking client memory without forcing the client into a full internal workspace.

### Applied implication for ChefFlow

High-value changes to the architecture work:

- Keep public discovery and inquiry lightweight. Do not pollute it with admin or deep operator complexity.
- Keep the chef surface as the dense operating workspace for real business execution.
- Keep client access constrained and relationship-specific instead of expanding it into chef-lite.
- Keep staff as a role lane inside operations, not a sixth canonical product.
- Do not let admin links live in the same primary navigation frame as the first-run chef workflow.

**Sources checked in this pass**

- [How Food Operators Deal With What ChefFlow Solves](./how-food-operators-deal-with-what-we-solve.md)
- [Chef Persona Workflow Research](./2026-04-04-chef-persona-workflow-research.md)
- [First-Time vs Power-User Chef Adoption](./2026-04-04-first-time-vs-power-user-chef-adoption.md)
- [HoneyBook Catering Management Software](https://www.honeybook.com/catering-management-software)
- [HoneyBook Catering Contract Template](https://www.honeybook.com/blog/catering-contract-template)
- [Dubsado Get Started](https://help.dubsado.com/en/articles/8076495-get-started-with-dubsado)
- [Square Estimates](https://my.squareup.com/help/us/en/article/7215-create-an-estimate-online)
- [Square Contracts](https://squareup.com/help/us/en/article/8133-create-and-send-square-contracts)

---

## 2. Business / Organization

Targets covered:

- employers
- employees
- admin
- manager
- business owners
- companies / corp
- entrepreneur

### Real workflow

These actors do not experience ChefFlow as "a chef app." They experience it as a business system or discovery system.

For employers and managers, the dominant workflow is still:

1. Staff scheduling in a dedicated app or by text.
2. Onboarding and payroll in ADP, Gusto, Homebase, or paper-plus-email combinations.
3. Competitive monitoring and vendor discovery through Google, review platforms, recruiters, and word of mouth.
4. Event or catering procurement through shortlist building, estimates, contracts, and approved-vendor memory.

For business owners and entrepreneurs, there is another workflow layered on top:

1. Claim or manage listings across multiple public directories.
2. Research market density and competitor presence manually.
3. Compare vendors, operators, or locations with scattered data.
4. Use agencies, consultants, or enterprise tools when the stakes rise.

For corporate buyers, discovery is capability-based rather than cuisine-based. They need to know whether an operator can handle volume, dietary constraints, insurance, delivery radius, or compliance needs.

### Where it breaks

- Listing and brand control is fragmented across many platforms.
- Competitive and market intelligence is manual and expensive.
- Hiring and workforce tooling is disconnected from event operations.
- Internal admin and manager tasks are often buried inside operator tools or vice versa.
- Procurement and approved-vendor knowledge live in email, spreadsheets, or one person's memory.

### Workarounds used today

- Homebase, 7shifts, Gusto, ADP, and recruiter networks.
- Yext, Moz Local, BrightLocal, or simply ignoring stale listings.
- ezCater, CaterCow, internal approved-vendor lists, and spreadsheets.
- Consultants or market reports for expansion and location decisions.

### What is missing or poorly solved

- One business-owned place to manage operator-facing and public-facing business data.
- Capability-rich discovery that works for real procurement and vendor comparison.
- Clean separation between daily operator workflow and management or control-plane work.
- Business views that do not require surfacing internal control tools in front of chefs or clients.

### Applied implication for ChefFlow

High-value changes to the architecture work:

- Preserve a clear internal admin/control plane. Managers, founders, and business owners may cross surfaces, but that does not justify admin leakage into chef navigation.
- Treat business-owner and corporate discovery needs as capability-filtering problems, not reasons to collapse public and internal surfaces.
- Keep internal business control features out of first-run operator chrome unless they are part of normal chef execution.
- Strengthen the public and directory model around operator-controlled profiles and capability data, not around exposing internal operations.

**Sources checked in this pass**

- [Employer / Employee Food Service Infrastructure Research](./2026-04-03-employer-employee-food-service-infrastructure-research.md)
- [Food Directory Persona Research: Business / Organization Users](./2026-04-05-food-directory-persona-research-business.md)
- [Cross-Persona Workflow Patterns and Breakpoints](./cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md)
- [Homebase Hiring Guide PDF](https://joinhomebase.com/The_Homebase_Guide_to_Hiring.pdf)
- [Square Catering Solution](https://squareup.com/us/en/solutions/caterers)

---

## 3. Operations / Support

Targets covered:

- back office
- operations
- finance
- accounting

### Real workflow

For ChefFlow's actual target market, these functions usually collapse into the same person until the business grows.

Operational reality today is still:

1. Calendar management in Google Calendar, whiteboards, or dedicated catering tools only after scale.
2. Staff scheduling via text and personal contact lists.
3. Procurement through direct calls, day-before shopping, and handwritten or spreadsheet lists.
4. Expense capture through paper receipts, receipt photos, or ad hoc expense tools.
5. Finance in Wave or QuickBooks only after complexity rises, with many solo chefs doing little formal bookkeeping before tax season.
6. Bookkeeper involvement once the operator hires staff or revenue and complexity cross a threshold.

Bookkeepers and accountants need structured exports, revenue-by-event mapping, category-separated expenses, and receivable visibility. Operators need the same truth but in a simpler form: "did I actually make money on this event?"

### Where it breaks

- Day-of staff cancellations are absorbed manually.
- Purchase orders usually do not exist at this scale.
- Food cost is rarely tied cleanly to a specific event.
- Receipts are lost, mixed with personal spending, or captured too late.
- Event-level financial truth is hard to reconstruct after the fact.
- Bookkeepers cannot use chef-specific systems if exports are not accounting-friendly.

### Workarounds used today

- Google Calendar and phone contacts.
- Restaurant Depot, specialty suppliers, and same-day grocery runs.
- Wave, QuickBooks Simple Start, Expensify, and spreadsheets.
- End-of-year CSV cleanup or CPA handoff.
- Verbal backups and informal run-of-show documents.

### What is missing or poorly solved

- Strong event-linked cost capture.
- Clean accountant-ready export stories.
- Backup staffing or on-call models at small-team scale.
- Structured vendor terms and delivery tracking.
- AR aging and reconciliation views that meet bookkeeper expectations without overloading the chef UI.

### Applied implication for ChefFlow

High-value changes to the architecture work:

- Keep operations and finance inside the chef workspace, but do not force that density into public or client surfaces.
- Keep support and admin concerns separate from day-to-day chef navigation.
- The request-trust and API work should protect finance-, bookkeeping-, and partner-linked IDs explicitly, because those flows are where silent cross-tenant errors become expensive.
- Do not build enterprise payroll inside ChefFlow just because payroll routes exist. Integration or export is the correct boundary for most of ChefFlow's actual market.

**Sources checked in this pass**

- [Finance / Accounting Workflow Reality](./2026-04-04-finance-accounting-and-integration-workflows.md)
- [Back Office / Scheduling / Procurement Workflow Reality](./2026-04-04-staff-backoffice-procurement-workflows.md)
- [Service Vertical Workflows](./2026-04-04-service-vertical-workflows.md)
- [Dubsado project and workflow guidance](https://help.dubsado.com/en/articles/5321996-dubsado-lingo)

---

## 4. Technical / System

Targets covered:

- dev
- IT
- system admin

### Real workflow

Technically sophisticated stakeholders do not want hidden capability. They want explicit system contracts.

Their workflow is usually:

1. Evaluate whether the platform has an API, docs, and a trustworthy auth model.
2. Connect the system to calendar, storage, email, payments, or internal dashboards.
3. Use API keys for personal scripts and OAuth for multi-tenant third-party flows.
4. Depend on webhooks, logs, retries, and token refresh to keep systems in sync.
5. For IT buyers, run a procurement checklist around SSO, audit logs, RBAC, export, and operational reliability.

The repo research shows ChefFlow already has real API and webhook infrastructure. The current weakness is not total absence; it is that the contract is not yet clear or consistently enforced.

### Where it breaks

- No public or strongly surfaced developer documentation.
- No sandbox or clearly separated test story for external builders.
- In-memory rate limiting and inconsistent request trust are not serious multi-instance boundaries.
- Session-shaped helpers leaking into API-key routes undermine the API model.
- Audit visibility is weaker than serious IT buyers expect.
- If route ownership is fuzzy, integrations inherit that ambiguity.

### Workarounds used today

- CSV exports and custom scripts.
- Browser automation and network-inspection reverse engineering.
- Zapier or Make to bridge systems.
- Buying more enterprise-grade but less chef-specific tools because they clear procurement requirements.

### What is missing or poorly solved

- Stable, documented surface and auth contracts.
- Clear distinction between operator flows, admin control plane, and external API consumers.
- Distributed rate limiting and stronger request trust boundaries.
- Developer-visible delivery logs, audit logs, and sandbox guidance.

### Applied implication for ChefFlow

High-value changes to the architecture work:

- Keep runtime surface ownership explicit and machine-readable.
- Keep admin as a true control plane.
- Keep API-key routes free of browser-session assumptions.
- Prioritize request-auth and tenant-boundary hardening because this is the prerequisite for trustworthy external integrations.
- Do not normalize current leakage simply because the monolith "works."

**Sources checked in this pass**

- [Dev / IT / Sysadmin Workflow Reality](./2026-04-04-dev-it-sysadmin-workflows.md)
- [Developer and Chef Workflow Patterns for Surface Classification](./developer-and-chef-workflow-research-for-surface-classification-2026-04-02.md)
- [Square OAuth Walkthrough](https://developer.squareup.com/docs/oauth-api/walkthrough)
- [Intuit Authorization FAQ](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/faq)
- [Google Calendar incremental sync](https://developers.google.com/workspace/calendar/api/guides/sync)
- [Gmail Push Notifications](https://developers.google.com/workspace/gmail/api/guides/push)
- [Stripe Webhooks](https://docs.stripe.com/webhooks)

---

## 5. Regulatory / Compliance

Targets covered:

- government
- regulators
- compliance officers
- auditors
- tax authorities
- legal
- lawyers
- inspectors
- licensing bodies
- copyright authorities

### Real workflow

Private chefs and small operators typically handle compliance through a mixture of:

1. ServSafe, food handler, business-license, and insurance tracking.
2. Manual document storage for contracts, permits, and COIs.
3. CPA guidance for quarterly taxes, 1099s, W-2s, and sales tax.
4. Incident handling by email, phone, and generic notes.
5. Venue-specific document requests handled ad hoc.

The regulatory environment also depends heavily on actor identity and state adoption:

- FDA Food Code is a model code, adopted unevenly by jurisdictions.
- Where the 2022 Food Code is adopted, unpackaged foods require written allergen notification.
- Worker classification is based on control and economic reality, not labels alone.
- IRS treatment of independent contractors, self-employment tax, mileage, and quarterly estimates is explicit but frequently misunderstood by small operators.

### Where it breaks

- Workers are misclassified because the business treats "one-off staff" as automatically 1099.
- Allergy, dietary, and incident documentation is incomplete or scattered.
- COI and additional-insured workflows are handled manually and late.
- State-specific sales tax and permit triggers are easy to miss.
- Insurance and compliance evidence is not tied tightly enough to the event or actor that required it.

### Workarounds used today

- Email threads with CPAs, insurers, and venues.
- Generic document storage folders.
- Payroll providers and tax preparers used as compliance proxies.
- Manual incident notes and paper binders.

### What is missing or poorly solved

- Structured incident workflows tied to the event.
- Point-of-hiring classification guidance.
- Fast COI workflows for venue-driven requirements.
- Clear actor-level audit trails across compliance-sensitive actions.
- State-specific guardrails without turning the product into a legal-advice engine.

### Applied implication for ChefFlow

High-value changes to the architecture work:

- Keep compliance and audit functions clearly separate from public and first-run operator surfaces.
- Preserve actor identity and tenant identity carefully in trust-boundary work. Compliance actors care who did what, not just which tenant a record belongs to.
- Avoid fuzzy admin/chef overlap where document ownership or auditability could be questioned later.
- Treat immutable logs, scoped access, and event-linked records as architecture requirements, not optional polish.

**Sources checked in this pass**

- [Compliance / Regulatory / Legal Workflow Reality](./2026-04-04-compliance-regulatory-and-legal-workflows.md)
- [FDA Food Code 2022](https://www.fda.gov/food/fda-food-code/food-code-2022)
- [FDA: Sesame added as the 9th major allergen](https://www.fda.gov/food/retail-food-industryregulatory-assistance-training/addition-2022-food-code-sesame-added-major-food-allergen)
- [IRS: Independent contractor defined](https://www.irs.gov/businesses/small-businesses-self-employed/independent-contractor-defined)
- [U.S. Department of Labor: 2024 independent contractor rule](https://www.dol.gov/newsroom/releases/whd/whd20240109-1)
- [IRS Publication 926](https://www.irs.gov/publications/p926)

---

## 6. External Systems / Integrations

Targets covered:

- third-party tools
- APIs
- payment processors
- email systems
- file storage
- hardware devices
- barcode scanners
- POS systems

### Real workflow

Operators usually connect systems in one of four ways:

1. Native OAuth integration to a system like Square or QuickBooks.
2. Webhooks into Stripe, Gmail, or other event sources.
3. Incremental sync loops for calendar, email, and storage state.
4. CSV export and import when native integration is weak.

In the small-operator segment, the system mix is practical rather than elegant:

- Stripe, Square, Zelle, Venmo, and checks for payment collection.
- Google Calendar and Gmail for operational coordination.
- Google Drive or Dropbox for shared files.
- QuickBooks or Wave for accounting.
- Smartphone cameras instead of dedicated scanners wherever possible.

Official integration docs checked in this pass reinforce the same architectural expectations:

- Stripe expects verified webhook signatures, raw request bodies, quick `2xx` responses, retry-aware handlers, and tolerance against out-of-order events.
- Google Calendar expects stored sync tokens and repeat incremental sync.
- Gmail push requires `watch`, Pub/Sub, renewal, and fallback sync because notifications may be delayed or dropped.
- Square and Intuit both use explicit OAuth flows with redirect URIs, scopes, sandbox-vs-production separation, and expiring or rotating tokens.
- Google Drive supports resumable uploads, pre-generated IDs, and change tracking instead of naive file assumptions.

### Where it breaks

- Webhooks arrive out of order or are retried.
- Tokens expire, rotate, or are refreshed incorrectly.
- Sync loops fall behind and need full resync behavior.
- Sandbox and production credentials get mixed.
- Integration routes assume session context instead of explicit tenant context.
- Small operators fall back to manual entry when integration contracts are weak.

### Workarounds used today

- Zapier or Make.
- CSV handoff between operational and accounting systems.
- Shared drives and email attachments.
- Smartphone barcode or QR scanning instead of dedicated hardware.
- Manual reconciliation when retries or auth drift happen.

### What is missing or poorly solved

- Stable, well-documented callback and sync behavior.
- Explicit retry and resync handling.
- Clean separation between API consumer identity and browser-session identity.
- Strong logs and troubleshooting surfaces for operators and developers.

### Applied implication for ChefFlow

High-value changes to the architecture work:

- The request-trust and API tenant-boundary hardening spec is not optional plumbing. It is the baseline for every serious integration surface ChefFlow already exposes.
- Runtime surface ownership needs to stay explicit so callback routes, control-plane routes, and portal routes do not blur together.
- Integration-heavy behavior should stay out of primary first-run operator and client flows unless it creates immediate value.
- Hardware-specific workflows should remain optional and phone-first where possible, because most independent operators are not buying dedicated devices.

**Sources checked in this pass**

- [Finance / Accounting Workflow Reality](./2026-04-04-finance-accounting-and-integration-workflows.md)
- [Dev / IT / Sysadmin Workflow Reality](./2026-04-04-dev-it-sysadmin-workflows.md)
- [Stripe Webhooks](https://docs.stripe.com/webhooks)
- [Stripe signature verification troubleshooting](https://docs.stripe.com/webhooks/signature)
- [Square OAuth Walkthrough](https://developer.squareup.com/docs/oauth-api/walkthrough)
- [Square access tokens and Sandbox](https://developer.squareup.com/docs/build-basics/access-tokens)
- [Intuit Authorization FAQ](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/faq)
- [Google Calendar incremental sync](https://developers.google.com/workspace/calendar/api/guides/sync)
- [Gmail Push Notifications](https://developers.google.com/workspace/gmail/api/guides/push)
- [Google Drive uploads](https://developers.google.com/drive/api/v3/manage-uploads)
- [Google Drive changes and revisions](https://developers.google.com/workspace/drive/api/guides/change-overview)

---

## High-Value Architecture Refinements

The research above does not justify a broad rewrite. It justifies a smaller set of clarifications.

### 1. Keep the product shape chef-first and operator-first

The repo's canonical project definition is correct. ChefFlow is an operator system with attached public, client, staff, partner, admin, and API surfaces. The research supports that structure strongly.

### 2. Keep public light, progressive, and buyer-safe

First-time and client-facing flows should remain light. Long-lived operations, finance, and admin complexity belong deeper in the operator system.

### 3. Keep admin as an internal control plane

Business, compliance, technical, and support actors need a clear control plane. They do not benefit from admin being embedded inside chef navigation.

### 4. Keep constrained portals constrained

Client, partner, and staff experiences should stay scoped to the work they actually own. Real-world workflows do not support turning them into diluted versions of the chef workspace.

### 5. Treat trust boundaries as product-critical

Integrations, finance, compliance, and audit workflows all rely on unambiguous actor and tenant identity. Session-shaped helpers inside API-key routes are not just technical debt. They are a product-boundary flaw.

### 6. Avoid enterprise cosplay

The research supports strong exports, integrations, and clear control boundaries. It does not support building full payroll or giant enterprise workflow layers directly into the core product for the current target market.

---

## Direct Application to Active Specs

### Runtime Surface Boundary Enforcement

This research strengthens four decisions already present in `docs/specs/p0-runtime-surface-boundary-enforcement.md`:

- admin must stay distinct from chef runtime ownership
- chef is the canonical operator workspace
- client and partner are constrained relationship surfaces
- staff remains a role lane inside operations, not a sixth canonical product

### Request Trust and API Tenant Boundary Hardening

This research strengthens four decisions already present in `docs/specs/p0-request-trust-and-api-tenant-boundary-hardening.md`:

- external API routes must use explicit tenant and actor identity
- integration routes cannot depend on browser-session helpers
- callback and webhook flows must assume retries, replays, ordering issues, and token refresh realities
- compliance, finance, and bookkeeping flows need correct identity and ownership, not "best effort" defaults

---

## What This Does Not Mean

- It does not mean every stakeholder needs a first-class product surface.
- It does not mean ChefFlow should turn into an enterprise suite for every food business.
- It does not mean every research finding should become a feature.
- It does mean the active boundary work is directionally correct and should be tightened, not relaxed.
