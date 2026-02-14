# Non-Goals

**Document ID**: 002
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document explicitly declares what ChefFlow V1 will NOT do, NOT support, and NOT implement. These are intentional omissions, not oversights.

## Philosophy

V1 follows the principle of **ruthless minimalism**:
- Ship only what is strictly necessary for the core workflow
- Defer all "nice-to-haves" to post-V1
- Avoid complexity that does not directly serve the critical path
- Build infrastructure for future expansion without implementing the expansion

## Non-Goals by Category

### 1. Communication & Notifications

**NOT IMPLEMENTED**:
- Email notifications (event updates, payment confirmations, reminders)
- SMS notifications
- Push notifications
- In-app messaging/chat
- Comment threads
- Client-chef communication tools

**RATIONALE**:
- Email delivery requires infrastructure (SendGrid, Postmark, AWS SES)
- Notification preferences add UI complexity
- Email templates require design and maintenance
- Chat requires real-time infrastructure (WebSockets, Pusher)
- V1 assumes chefs communicate with clients via external channels (phone, email, text)

**MINIMAL WORKAROUND**:
- Client invitation email uses basic Supabase email template (no custom HTML)
- Chefs communicate payment links manually if needed

### 2. File Storage & Documents

**NOT IMPLEMENTED**:
- Photo uploads (event photos, chef profile, menu images)
- Document uploads (contracts, invoices, PDFs)
- File storage buckets (Supabase Storage API not used)
- Image optimization/CDN
- PDF generation (invoices, receipts, contracts)

**RATIONALE**:
- File uploads require storage management, permissions, and quotas
- Image optimization requires processing pipeline
- PDF generation requires library integration (Puppeteer, react-pdf)
- Contract management is out of scope for V1

**MINIMAL WORKAROUND**:
- Menus are text-only (name, description, price per person)
- Payment receipts are HTML views (client can print to PDF manually)
- Chefs send contracts via external email if needed

### 3. Calendar & Scheduling

**NOT IMPLEMENTED**:
- Google Calendar integration
- iCal export
- Calendar view (month/week/day grid)
- Availability blocking
- Automated reminders (event approaching, payment due)

**RATIONALE**:
- Calendar integration requires OAuth, Google API credentials
- Calendar UI is complex (date pickers, drag-drop, time zones)
- Automated reminders require job scheduling (cron, background workers)

**MINIMAL WORKAROUND**:
- Events have `event_date` field (stored, displayed as plain text)
- Chefs manually add events to external calendar
- No conflict detection (chef responsible for managing schedule)

### 4. Advanced Payments

**NOT IMPLEMENTED**:
- Payment plans/installments
- ACH/bank transfers
- Wire transfers
- Cryptocurrency
- Tip/gratuity handling (separate from event price)
- Discount codes/coupons
- Gift cards
- Referral bonuses

**RATIONALE**:
- Payment plans require recurring billing, Stripe Subscriptions API
- Alternative payment methods increase complexity and testing surface
- Tips complicate ledger (two payment streams per event)
- Discounts require coupon validation, expiration logic

**MINIMAL WORKAROUND**:
- V1 supports only card payments via Stripe Elements
- Chef can manually adjust event price before proposing (acts as discount)
- Tips handled externally (cash, Venmo, etc.)

### 5. Analytics & Reporting

**NOT IMPLEMENTED**:
- Revenue charts (bar graphs, line charts, pie charts)
- Client retention metrics
- Event frequency analysis
- Profit margin calculations
- Dashboard widgets (total revenue, upcoming events, etc.)
- Export to CSV/Excel
- Tax reporting (1099 forms, etc.)

**RATIONALE**:
- Charting libraries (Chart.js, Recharts) add bundle size
- Metrics require aggregation queries (slower, more complex)
- Tax reporting is jurisdiction-specific, requires compliance knowledge

**MINIMAL WORKAROUND**:
- Ledger is queryable (chef can see all transactions)
- Event list shows all events (sortable, filterable by status)
- No aggregated metrics in V1 (chef exports data manually if needed)

### 6. Multi-User & Collaboration

**NOT IMPLEMENTED**:
- Team members (assistants, sous chefs)
- Role-based permissions (admin, manager, staff)
- Multi-chef tenants (partnerships)
- Client sharing (one event, multiple clients)
- Event co-hosting (two chefs on one event)

**RATIONALE**:
- Multi-user requires permission system beyond chef/client binary
- Team collaboration requires invitation flow, role assignment UI
- Shared events complicate tenant isolation, ledger attribution

**MINIMAL WORKAROUND**:
- V1 is single-chef-per-tenant only
- If chef has assistant, assistant uses chef's login (shared password)
- Partnerships require separate tenants (each chef has own account)

### 7. Marketplace & Discovery

**NOT IMPLEMENTED**:
- Public chef directory
- Chef profiles (bio, photos, reviews)
- Client reviews/ratings
- Search for chefs by location, cuisine, price
- Featured chefs
- Chef verification badges
- Client testimonials

**RATIONALE**:
- Marketplace requires public-facing layer, SEO, search infrastructure
- Reviews require moderation, abuse prevention
- Discovery requires recommendation engine, filtering logic

**MINIMAL WORKAROUND**:
- V1 assumes chef acquires clients externally (word-of-mouth, website, Instagram)
- ChefFlow is used AFTER client relationship is established
- No self-service client signup (invitation-only)

### 8. CRM & Client Management

**NOT IMPLEMENTED**:
- Client notes (dietary restrictions, preferences, allergies)
- Client tags/categories (VIP, corporate, wedding, etc.)
- Client communication history
- Client lifecycle stages (lead, prospect, active, churned)
- Automated follow-ups
- Email campaigns

**RATIONALE**:
- CRM features require rich data model, UI complexity
- Automated campaigns require email infrastructure, scheduling

**MINIMAL WORKAROUND**:
- Clients are simple records (name, email, phone)
- Chef maintains external notes (Google Docs, CRM, notebook)
- ChefFlow stores only transactional data (events, payments)

### 9. Inventory & Logistics

**NOT IMPLEMENTED**:
- Ingredient inventory
- Recipe costing
- Shopping list generation
- Vendor management
- Delivery/pickup scheduling
- Equipment tracking

**RATIONALE**:
- Inventory management is a separate product domain
- Recipe costing requires unit conversions, pricing databases
- Logistics tracking requires complex state machine

**MINIMAL WORKAROUND**:
- Menus are display-only (no ingredient breakdown)
- Chef manages shopping/logistics externally

### 10. Internationalization

**NOT IMPLEMENTED**:
- Multi-language support (i18n)
- Currency conversion
- Timezone handling (beyond server timestamps)
- Region-specific formatting (dates, numbers)

**RATIONALE**:
- i18n requires translation files, language switcher UI
- Currency conversion requires exchange rate API
- Timezone logic is complex, error-prone

**MINIMAL WORKAROUND**:
- V1 is English-only
- All amounts in USD (Stripe supports multi-currency, but V1 doesn't expose it)
- Timestamps stored in UTC, displayed in server timezone

### 11. Mobile Apps

**NOT IMPLEMENTED**:
- iOS app (native, React Native, Capacitor)
- Android app
- Mobile-specific features (camera, GPS, push notifications)
- App store distribution

**RATIONALE**:
- Native apps require separate codebase, maintenance, app store approval
- Mobile web is sufficient for V1 (responsive design)

**MINIMAL WORKAROUND**:
- Responsive web app works on mobile browsers
- No offline support (requires network connection)

### 12. Advanced UI/UX

**NOT IMPLEMENTED**:
- Dark mode
- Custom themes/branding per tenant
- Drag-and-drop menu builder
- Rich text editor (WYSIWYG)
- Keyboard shortcuts
- Accessibility audit (WCAG AA compliance not guaranteed)

**RATIONALE**:
- Dark mode requires duplicate styles, theme switcher
- Custom branding requires upload, storage, CSS overrides
- Drag-and-drop requires complex state management
- Rich text requires editor library (Tiptap, Lexical)

**MINIMAL WORKAROUND**:
- Light mode only
- Default ChefFlow branding for all tenants
- Plain text inputs for all fields
- Basic accessibility (semantic HTML, labels, but no ARIA audit)

### 13. Developer Experience (Optional Tools)

**NOT IMPLEMENTED IN V1**:
- Seed data generator (auto-create fake events/clients)
- Admin panel (super-admin view across all tenants)
- Impersonation mode (support staff logging in as chef)
- Feature flags (gradual rollout)
- A/B testing
- Error monitoring (Sentry, Rollbar)
- Performance monitoring (Vercel Analytics, New Relic)

**RATIONALE**:
- These are operational tools, not user-facing features
- Can be added post-launch without affecting core product

**MINIMAL WORKAROUND**:
- Manual data creation for testing
- No admin panel (use Supabase dashboard directly)
- Errors logged to console (no aggregation)
- No performance metrics (rely on Vercel built-in basic metrics)

## Prohibited Phrases

The following phrases are **NOT ALLOWED** during V1 implementation:

- "While we're here, we should also..."
- "It would be nice if..."
- "This is a quick add..."
- "Users might want..."
- "We could easily add..."
- "Just a small feature..."
- "This won't take long..."

**Enforcement**: Any suggestion containing these phrases must reference this document and be rejected unless it directly addresses a blocker.

## Exception Process

**To add a non-goal feature to V1**:
1. Identify it as "critical blocker" (not "nice to have")
2. Document why V1 cannot ship without it
3. Estimate implementation cost (time, complexity, risk)
4. Update v1-scope-contract.md with version bump
5. Get explicit approval

**Example of valid exception**:
- "Client invitation email is broken, clients cannot sign up" → Blocker, must fix
- "Client invitation email has ugly template" → Not a blocker, defer to V1.1

## Post-V1 Roadmap (Informational Only)

These features are **explicitly deferred** to V2+:

**V1.1** (Post-Launch Enhancements):
- Email notifications (event updates, payment receipts)
- Basic analytics dashboard (revenue chart, event count)
- PDF invoice generation

**V2.0** (Major Expansion):
- Mobile apps (iOS, Android)
- Marketplace (chef discovery, public profiles)
- Advanced CRM (client notes, tags, preferences)

**V3.0** (Enterprise Features):
- Multi-chef collaboration (team members)
- API for third-party integrations
- White-label branding

---

**Authority**: This document is binding. All non-goals remain excluded until post-V1 planning.
**Review Checkpoint**: Any PR introducing a non-goal feature must be flagged and rejected.
