# Chef Portal Non-Goals (V1 Scope Boundary)

This document explicitly defines what the Chef Portal **will not do** in V1. These are not future features—these are explicit boundaries that prevent scope drift and maintain the integrity of the V1 scope lock.

---

## 1) Non-Goals: Business Model

### 1.1 Marketplace or discovery

- ❌ **No public chef browsing**
- ❌ **No lead marketplace**
- ❌ **No chef directory or search**
- ❌ **No ratings/reviews system**
- ❌ **No "find a chef" features**

**Why:** ChefFlow V1 is an operational tool for chefs who already have clients. It is not a marketplace platform. Discovery and lead generation are out of scope.

### 1.2 Social or community features

- ❌ **No chef-to-chef networking**
- ❌ **No forums or community boards**
- ❌ **No social sharing or activity feeds**
- ❌ **No follower/following mechanics**

**Why:** The Chef Portal is a business operations tool, not a social platform.

### 1.3 Marketing automation

- ❌ **No email campaign builders**
- ❌ **No automated client nurture sequences**
- ❌ **No SMS blast features**
- ❌ **No newsletter management**

**Why:** Marketing tools are outside V1 scope. Chefs use external tools for marketing.

---

## 2) Non-Goals: Financial Complexity

### 2.1 Full accounting suite

- ❌ **No general ledger / double-entry bookkeeping**
- ❌ **No P&L statements**
- ❌ **No balance sheets**
- ❌ **No tax calculation or reporting**
- ❌ **No payroll management**
- ❌ **No vendor invoice management**

**Why:** ChefFlow maintains an event-centric append-only ledger for payment truth. It is not an accounting system. Chefs export data to QuickBooks or similar tools for full accounting.

### 2.2 Multi-currency or international payments

- ❌ **No multi-currency support**
- ❌ **No currency conversion**
- ❌ **No international tax handling**

**Why:** V1 assumes USD-only. International support is a future consideration.

### 2.3 Complex payment splits

- ❌ **No automatic vendor payouts**
- ❌ **No sub-contractor payment automation**
- ❌ **No affiliate or referral fee automation**

**Why:** V1 tracks payments from clients to chefs only. Internal cost allocation is manual or external.

### 2.4 Subscription or recurring billing

- ❌ **No subscription plans**
- ❌ **No recurring invoices**
- ❌ **No membership tiers**

**Why:** ChefFlow V1 is event-based. Each event is a one-time financial transaction.

---

## 3) Non-Goals: Client Experience (handled by Client Portal)

### 3.1 Client-initiated booking flow

- ❌ **No self-service booking calendar (in Chef Portal)**
- ❌ **No real-time availability widget (in Chef Portal)**
- ❌ **No instant booking (in Chef Portal)**

**Why:** These features belong to the Client Portal, not the Chef Portal. The chef controls when an inquiry becomes a confirmed event.

### 3.2 Client communication tools

- ❌ **No in-app messaging / chat**
- ❌ **No SMS or email composer within Chef Portal**
- ❌ **No notification preference management (client-side)**

**Why:** Communication happens via external channels (email, SMS, phone). V1 does not include a built-in messaging system.

---

## 4) Non-Goals: Advanced Menu Features

### 4.1 Recipe management system

- ❌ **No recipe database with ingredient costs**
- ❌ **No recipe scaling calculators**
- ❌ **No inventory management**
- ❌ **No grocery list generation**

**Why:** The menu system is for client-facing menu presentation and locking, not back-of-house recipe management.

### 4.2 Nutritional analysis

- ❌ **No automatic nutritional facts**
- ❌ **No calorie calculators**
- ❌ **No macro tracking**

**Why:** Nutritional data entry is manual if needed. Automated calculation is out of scope.

### 4.3 Supplier integration

- ❌ **No supplier catalog integration**
- ❌ **No automated ordering**
- ❌ **No real-time pricing from vendors**

**Why:** Sourcing and purchasing are external processes.

---

## 5) Non-Goals: AI / ML / "Smart" Features

### 5.1 Predictive analytics

- ❌ **No predictive revenue forecasting**
- ❌ **No demand prediction**
- ❌ **No churn risk scoring**

**Why:** V1 is deterministic. All insights are derived from real data, not predicted data.

### 5.2 Automated decision-making

- ❌ **No auto-pricing suggestions**
- ❌ **No auto-scheduling optimization**
- ❌ **No AI-driven upsells**

**Why:** The chef is always in control. The system does not make autonomous business decisions.

### 5.3 Natural language interfaces

- ❌ **No chatbot assistants**
- ❌ **No voice commands**
- ❌ **No "ask the AI" features**

**Why:** V1 is a structured operational tool. NLP is not required or appropriate for deterministic workflows.

---

## 6) Non-Goals: Team Management

### 6.1 Staff scheduling

- ❌ **No employee shift scheduling**
- ❌ **No time tracking or timecards**
- ❌ **No labor cost allocation**

**Why:** ChefFlow V1 is for the chef (and optionally limited sub-accounts). Full team management is out of scope.

### 6.2 Permissions granularity

- ❌ **No complex role hierarchies**
- ❌ **No per-event or per-client permissions**
- ❌ **No custom role builder**

**Why:** V1 supports `chef` and optionally `chef_subaccount` with simple, tenant-scoped permissions. Granular RBAC is deferred.

---

## 7) Non-Goals: Cross-Tenant Features

### 7.1 Multi-tenant aggregation

- ❌ **No platform-wide reports**
- ❌ **No chef benchmarking dashboards**
- ❌ **No aggregate statistics across tenants**

**Why:** Every tenant is isolated. Cross-tenant queries are forbidden by RLS and system design.

### 7.2 Shared client profiles

- ❌ **No clients shared between chefs**
- ❌ **No referral networks**
- ❌ **No client handoff workflows**

**Why:** Each chef owns their client profiles. Clients are tenant-scoped.

---

## 8) Non-Goals: Mobile App (V1)

### 8.1 Native mobile apps

- ❌ **No iOS app**
- ❌ **No Android app**

**Why:** V1 is responsive web only. Native apps are a future consideration.

### 8.2 Offline mode

- ❌ **No offline data sync**
- ❌ **No offline transaction queuing**

**Why:** V1 requires an active internet connection. Offline support adds significant complexity and is deferred.

---

## 9) Non-Goals: Integrations (V1 Minimal Set)

### 9.1 Excluded integrations

- ❌ **No Google Calendar sync**
- ❌ **No Outlook sync**
- ❌ **No Zapier integration**
- ❌ **No QuickBooks auto-sync**
- ❌ **No Slack notifications**
- ❌ **No Mailchimp integration**

**Why:** V1 focuses on Stripe integration for payments only. Additional integrations are future enhancements.

---

## 10) Non-Goals: Customization / White-Label

### 10.1 Custom branding

- ❌ **No white-label / rebrand options**
- ❌ **No custom domain per chef**
- ❌ **No theme customization**

**Why:** V1 is a SaaS product with a single unified brand and design.

### 10.2 Workflow customization

- ❌ **No custom lifecycle states**
- ❌ **No custom fields builder**
- ❌ **No workflow automation builder**

**Why:** The lifecycle, schema, and workflows are locked in V1 for determinism and simplicity.

---

## 11) Non-Goals: Experimental or Unproven Features

### 11.1 Blockchain / Web3

- ❌ **No crypto payments**
- ❌ **No NFT receipts or loyalty tokens**
- ❌ **No smart contracts**

**Why:** V1 is built on proven, stable technology stacks.

### 11.2 Gamification

- ❌ **No achievement badges**
- ❌ **No leaderboards**
- ❌ **No loyalty points mini-games**

**Why:** The Chef Portal is a professional operations tool, not a gamified experience.

---

## 12) Non-Goals: Performance at Unrealistic Scale

### 12.1 Billion-row optimizations

- ❌ **No sharding strategy**
- ❌ **No distributed query engines**
- ❌ **No real-time OLAP cubes**

**Why:** V1 is designed for tens of thousands of events per chef. Hyper-scale optimizations are premature.

### 12.2 Sub-millisecond latency targets

- ❌ **No edge caching for every query**
- ❌ **No real-time WebSocket sync**

**Why:** V1 targets reasonable performance for typical operations (100-500ms response times). Extreme optimizations are deferred.

---

## 13) Non-Goals: Self-Hosting or On-Premise

### 13.1 Self-hosted deployment

- ❌ **No Docker images for self-hosting**
- ❌ **No Kubernetes manifests**
- ❌ **No on-premise installation guides**

**Why:** V1 is a hosted SaaS product. Self-hosting adds operational complexity and is out of scope.

---

## 14) Summary: What Happens If You Try to Add These?

If a feature request falls into any of the above categories:

1. **Reject it immediately** for V1.
2. **Document it as a future consideration** if valuable.
3. **Maintain scope lock integrity** by referencing this document.

**V1 is complete when the operational loop (clients → events → menus → payments → audit) works perfectly within the defined boundaries.**

Adding any of these non-goals **before** V1 completion is scope drift and must be prevented.

---

## 15) One-Sentence Summary

**The Chef Portal V1 is intentionally scoped to exclude marketplaces, social features, full accounting, AI automation, mobile apps, complex integrations, and cross-tenant operations—focusing exclusively on the deterministic, server-authoritative operational loop of managing clients, events, menus, and payments within a single tenant.**
