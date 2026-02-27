# ChefFlow V1 — Testing Roadmap & Diagnostic Plan

> **Goal:** Test every untested area, diagnose every problem, fix every issue.
> **Created:** 2026-02-26
> **Status:** In progress

---

## Current State: 121 files, ~2,155 tests

Already covered: Auth, CRUD, FSM, routes, navigation, basic workflows, soak/memory, tenant isolation, mobile viewports, forms validation, search/filter, error handling.

---

## Tier 1 — Revenue & Launch Blockers

These MUST work before production. Broken = lost money or broken experience.

### 1.1 Payment & Stripe Flows

- [ ] Stripe webhook handler (`/api/webhooks/stripe`) — signature verification
- [ ] Payment success webhook → ledger entry + event status update
- [ ] Refund webhook handling
- [ ] Failed payment webhook handling
- [ ] Stripe Connect OAuth callback (`/api/stripe/connect/callback`)
- [ ] Connect account verification status
- [ ] Payment page renders with Stripe Elements
- [ ] Checkout flow end-to-end (create payment intent → confirm → success)
- [ ] Invoice creation → send → payment recording
- [ ] Invoice status transitions (draft → sent → paid)
- [ ] Partial payment handling
- [ ] Payment receipt generation

### 1.2 Email Delivery

- [ ] Inquiry confirmation email sends on submission
- [ ] Quote email sends when chef shares quote
- [ ] Payment receipt email
- [ ] Event confirmation email
- [ ] Resend webhook handler (`/api/webhooks/resend`)
- [ ] Email bounce handling
- [ ] Email template rendering with real data
- [ ] Marketing email (push dinner campaign)

### 1.3 PDF Document Generation

- [ ] Day-of Plan PDF (`/api/documents/day-of-plan`)
- [ ] Packing List PDF
- [ ] Grocery List PDF
- [ ] Invoice PDF
- [ ] Contract PDF
- [ ] Receipt PDF
- [ ] Quote PDF
- [ ] AAR/Debrief PDF
- [ ] PDF download triggers and file integrity

### 1.4 Staff Portal

- [ ] Staff login page renders (`/staff-login`)
- [ ] Staff authentication (separate from chef auth)
- [ ] Staff dashboard (`/app/(staff)/staff-dashboard`)
- [ ] Staff tasks page — view assigned tasks
- [ ] Staff station page — station clipboard
- [ ] Staff recipes page — read-only recipe access
- [ ] Staff schedule page — shift viewing
- [ ] Staff task completion + accountability logging

### 1.5 Data Deletion & GDPR

- [ ] Account deletion initiation (`/settings/delete-account`)
- [ ] 30-day grace period enforcement
- [ ] Data export (JSON download)
- [ ] Reactivation during grace period (`/reactivate-account`)
- [ ] 7-year financial retention compliance
- [ ] Client data deletion request handling

---

## Tier 2 — Security & Reliability

Broken = vulnerability, compliance risk, or unreliable experience.

### 2.1 Accessibility (a11y)

- [ ] Keyboard navigation — all interactive elements reachable via Tab
- [ ] Focus management — modals trap focus, return focus on close
- [ ] ARIA labels on buttons, inputs, and interactive elements
- [ ] Screen reader compatibility (landmark roles, headings hierarchy)
- [ ] Color contrast (WCAG AA minimum)
- [ ] Form label associations
- [ ] Error message association with fields
- [ ] Skip-to-content link
- [ ] All pages pass axe-core automated scan

### 2.2 Security

- [ ] CSP headers present and correct
- [ ] XSS prevention — script injection in form fields rejected
- [ ] CSRF tokens on mutating endpoints
- [ ] Rate limiting on login endpoint
- [ ] Rate limiting on API endpoints
- [ ] SQL injection prevention (Supabase RLS verification)
- [ ] Sensitive headers not leaked (X-Powered-By, server info)
- [ ] Auth token expiration and refresh
- [ ] Session fixation prevention

### 2.3 Cross-Browser

- [ ] Firefox — core flows (auth, dashboard, event create)
- [ ] WebKit/Safari — core flows
- [ ] Edge — core flows
- [ ] Mobile Safari viewport behavior
- [ ] Mobile Chrome viewport behavior

### 2.4 Concurrent Users

- [ ] Two sessions editing same event — last-write-wins behavior
- [ ] Duplicate form submission prevention (double-click guard)
- [ ] Optimistic update rollback on conflict
- [ ] Real-time subscription reconnection after disconnect

---

## Tier 3 — Feature Completeness

Features exist but aren't tested. Broken = degraded experience.

### 3.1 AI/Ollama Integration

- [ ] AI Pricing Intelligence panel renders
- [ ] AI Allergen Risk Matrix panel renders
- [ ] AI Menu Nutritional Summary panel renders
- [ ] AI Staff Briefing panel renders
- [ ] AI Prep Timeline panel renders
- [ ] AI Service Timeline panel renders
- [ ] AI Grocery List Consolidation panel renders
- [ ] AI Temperature Anomaly Detection panel renders
- [ ] AI Contract Generator panel renders
- [ ] AI AAR Generator panel renders
- [ ] AI Review Request Drafter panel renders
- [ ] AI Gratuity Framing panel renders
- [ ] AI Social Media Captions panel renders
- [ ] Ollama offline → clear error message shown
- [ ] Ollama timeout → graceful failure

### 3.2 Remy Advanced

- [ ] Conversation persistence in IndexedDB
- [ ] Project create/rename/delete
- [ ] Message bookmarking
- [ ] Conversation archive/pin
- [ ] Search across conversations
- [ ] Export (Markdown + JSON)
- [ ] Templates CRUD
- [ ] Voice input (Web Speech API)
- [ ] Culinary profile setup

### 3.3 Embeddable Widget

- [ ] Widget JS loads in iframe
- [ ] Inline mode renders form
- [ ] Popup mode opens overlay
- [ ] Form submission creates inquiry + client + draft event
- [ ] CORS headers correct for cross-origin
- [ ] Rate limiting on embed API
- [ ] Honeypot spam protection works

### 3.4 Kitchen Display System (KDS)

- [ ] KDS page renders (`/events/[id]/kds`)
- [ ] Course progression (fire → plating → served)
- [ ] Course timing display

### 3.5 Calendar Advanced

- [ ] All 7 views render (month, day, week, year, share, schedule, waitlist)
- [ ] Prep block creation
- [ ] Entry modal interactions
- [ ] Calendar sharing token generation

### 3.6 Import Modes

- [ ] Brain Dump mode
- [ ] CSV/Spreadsheet import
- [ ] Past Events import
- [ ] Import Inquiries
- [ ] Import Clients
- [ ] Import Recipe
- [ ] Import Receipt
- [ ] Import Document

### 3.7 Admin Features

- [ ] Admin panel full access
- [ ] Simulation lab (`/dev/simulate`)
- [ ] Prospecting module — lead scrubbing, call queue

### 3.8 Notification Center

- [ ] Notifications page renders
- [ ] Mark as read
- [ ] Filter by type
- [ ] Bulk actions

### 3.9 Tasks & Templates

- [ ] Task creation from templates
- [ ] Task completion with accountability
- [ ] Task reassignment
- [ ] Template CRUD

### 3.10 Station Clipboard System

- [ ] Shelf life color coding logic
- [ ] 86 toggle (mark items unavailable)
- [ ] Par level validations
- [ ] Waste log calculations
- [ ] Order sheet generation

---

## Tier 4 — Polish & Nice-to-Have

### 4.1 Financial Features

- [ ] Tax sub-pages (mileage, quarterly estimates, 1099, depreciation, home office, retirement)
- [ ] Payroll features
- [ ] Contractor management
- [ ] Bank feed integration
- [ ] Goals & financial planning
- [ ] P&L statement generation
- [ ] Break-even calculator

### 4.2 Analytics & Reporting

- [ ] Custom report builder
- [ ] Benchmark comparisons
- [ ] Pipeline forecasting
- [ ] Demand heatmap
- [ ] Client LTV projections
- [ ] Referral attribution
- [ ] Funnel conversion

### 4.3 Marketing & Social

- [ ] Push dinner campaign creation
- [ ] Email sequence builder
- [ ] Social post scheduling
- [ ] Media vault upload
- [ ] Platform connections

### 4.4 Network & Community

- [ ] Community feed (posts, comments, reactions)
- [ ] Channel subscriptions
- [ ] Direct messaging
- [ ] Follow/unfollow

### 4.5 Other Features

- [ ] Cannabis vertical (6 pages)
- [ ] Games (6 games)
- [ ] Help center
- [ ] Dark mode toggle
- [ ] Guest CRM
- [ ] Loyalty program advanced (tiers, redemption)
- [ ] Vendor invoice OCR
- [ ] Travel & operations

---

## Performance & Optimization (ongoing)

- [ ] Lighthouse scores on key pages (Performance, A11y, Best Practices, SEO)
- [ ] Core Web Vitals (LCP, FID, CLS) on landing page
- [ ] Bundle size audit
- [ ] Large dataset pagination (1000+ records)
- [ ] Image optimization verification
- [ ] Database query performance (N+1 detection)

---

## Test Execution Log

Track each test session here for historical record.

| Date       | Area Tested | Tests Written | Issues Found | Issues Fixed |
| ---------- | ----------- | ------------- | ------------ | ------------ |
| 2026-02-26 | (starting)  | —             | —            | —            |
