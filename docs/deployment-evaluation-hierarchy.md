# ChefFlow Deployment Evaluation Hierarchy

Last updated: 2026-03-02

## Purpose

This document is the master evaluation list and deployment to-do for ChefFlow.
Execution sequence and gates are defined in:

- `docs/deployment-readiness-roadmap.md`

We will review each section in order and mark it complete only when it meets the quality bar.
This hierarchy is intended to work across all six archetypes:

- Private Chef
- Caterer
- Meal-Prep Business
- Restaurant
- Food Truck
- Bakery

## Priority Deployment Tracks (Top-Level)

These are the three non-negotiable tracks for launch:

- [ ] Track A: Chef Portal (must work for all 6 archetypes)
- [ ] Track B: Client Portal (authenticated + token-link)
- [ ] Track C: Public Surfaces (landing + booking/inquiry + guest/share)

Launch is blocked unless all three tracks are signed off.

## Definition of Perfect (Apply to Every Section)

- [ ] Core flow works end-to-end with real data
- [ ] No placeholder or fake-success behavior in production paths
- [ ] Role and permission behavior is correct (chef/client/staff/partner/admin/public as applicable)
- [ ] Errors are visible and recoverable (no silent fallback to misleading data)
- [ ] Mobile and desktop UX are both usable
- [ ] Performance is acceptable for normal usage
- [ ] Required tests pass (unit/integration/e2e where relevant)
- [ ] Documentation is updated if behavior changed

## Contact Tracks (Evaluate In Parallel)

The hierarchy below is module-based. These tracks ensure we do not miss non-chef users.

- [ ] Chef portal track
- [ ] Client authenticated track (`/my-*`)
- [ ] Client token portal track (`/client/[token]`)
- [ ] Staff track (`/staff-*`, `/staff-login`)
- [ ] Partner track (`/partner/*`)
- [ ] Admin track (`/admin/*`)
- [ ] Public prospect track (`/`, `/chef/[slug]`, `/book/*`, `/embed/*`)
- [ ] Event guest track (`/share/[token]`, `/event/[eventId]/guest/[secureToken]`)
- [ ] Kiosk track (`/kiosk/*`)
- [ ] System actor track (webhooks, cron, scheduled routes, API)

## Master Hierarchy (Evaluation Order)

- [ ] 0. Platform Core (Most Important)
  - [ ] 0.1 Auth and role resolution
  - [ ] 0.2 Multi-tenant isolation (RLS and tenant scoping)
  - [ ] 0.3 Event lifecycle state machine
  - [ ] 0.4 Immutable financial ledger
  - [ ] 0.5 Defense-in-depth security and observability

- [ ] 1. Dashboard
  - [ ] 1.1 Header and quick access
  - [ ] 1.2 Conditional banners
  - [ ] 1.3 Configurable widgets

- [ ] 2. Events
  - [ ] 2.1 Events list page
  - [ ] 2.2 Event detail page

- [ ] 3. Clients
  - [ ] 3.1 Clients directory
  - [ ] 3.2 Client detail

- [ ] 4. Inquiry Pipeline
  - [ ] 4.1 Inquiries
  - [ ] 4.2 Quotes
  - [ ] 4.3 Leads
  - [ ] 4.4 Calls and meetings
  - [ ] 4.5 Partners
  - [ ] 4.6 Prospecting
  - [ ] 4.7 Guest leads
  - [ ] 4.8 Proposals
  - [ ] 4.9 Testimonials and reviews

- [ ] 5. Financials
  - [ ] 5.1 Financial hub
  - [ ] 5.2 Expenses
  - [ ] 5.3 Invoices
  - [ ] 5.4 Payments
  - [ ] 5.5 Ledger
  - [ ] 5.6 Payouts
  - [ ] 5.7 Reporting and analytics
  - [ ] 5.8 Tax center
  - [ ] 5.9 Payroll
  - [ ] 5.10 Other financial tools

- [ ] 6. Culinary
  - [ ] 6.1 Menus
  - [ ] 6.2 Recipes
  - [ ] 6.3 Ingredients
  - [ ] 6.4 Components
  - [ ] 6.5 Costing
  - [ ] 6.6 Prep
  - [ ] 6.7 Vendors
  - [ ] 6.8 Inventory
  - [ ] 6.9 Culinary board
  - [ ] 6.10 Seasonal palettes

- [ ] 7. Calendar
  - [ ] 7.1 Calendar views

- [ ] 8. Inbox and Messaging
  - [ ] 8.1 Inbox
  - [ ] 8.2 Conversation detail
  - [ ] 8.3 Search

- [ ] 9. Staff
  - [ ] 9.1 Staff directory
  - [ ] 9.2 Stations (kitchen clipboard)
  - [ ] 9.3 Vendors and food cost (staff view)
  - [ ] 9.4 Guest CRM
  - [ ] 9.5 Notifications
  - [ ] 9.6 Staff portal

- [ ] 10. Analytics
  - [ ] 10.1 Analytics hub
  - [ ] 10.2 Business analytics
  - [ ] 10.3 Event analytics
  - [ ] 10.4 Client analytics

- [ ] 11. Daily Ops
  - [ ] 11.1 Daily ops board
  - [ ] 11.2 Task management

- [ ] 12. Activity and Queue
  - [ ] 12.1 Queue system
  - [ ] 12.2 Activity log

- [ ] 13. Travel and Operations
  - [ ] 13.1 Travel overview
  - [ ] 13.2 Event travel detail

- [ ] 14. Reviews and AAR
  - [ ] 14.1 AAR list
  - [ ] 14.2 Reviews and client testimonials

- [ ] 15. Settings
  - [ ] 15.1 Settings overview
  - [ ] 15.2 Profile settings
  - [ ] 15.3 Dashboard settings
  - [ ] 15.4 Modules and billing
  - [ ] 15.5 Navigation settings
  - [ ] 15.6 Integrations
  - [ ] 15.7 Embed widget settings
  - [ ] 15.8 Notification settings
  - [ ] 15.9 Privacy and security
  - [ ] 15.10 Account and danger zone

- [ ] 16. Marketing and Social
  - [ ] 16.1 Marketing hub
  - [ ] 16.2 Campaigns
  - [ ] 16.3 Social media
  - [ ] 16.4 Portfolio
  - [ ] 16.5 Content library

- [ ] 17. Network and Community
  - [ ] 17.1 Network hub
  - [ ] 17.2 Chef profiles and directory
  - [ ] 17.3 Community forum

- [ ] 18. Loyalty Program
  - [ ] 18.1 Loyalty overview
  - [ ] 18.2 Loyalty tiers
  - [ ] 18.3 Points and earning rules
  - [ ] 18.4 Rewards catalog

- [ ] 19. Safety and Protection
  - [ ] 19.1 Safety overview
  - [ ] 19.2 Allergen and dietary management
  - [ ] 19.3 HACCP and food safety
  - [ ] 19.4 Waivers and liability

- [ ] 20. Remy (AI Concierge)
  - [ ] 20.1 Remy drawer and chat interface
  - [ ] 20.2 Remy capabilities

- [ ] 21. Onboarding and Import
  - [ ] 21.1 Onboarding flow
  - [ ] 21.2 Import features

- [ ] 22. Cannabis Vertical

- [ ] 23. Help Center
  - [ ] 23.1 Help hub
  - [ ] 23.2 Help articles
  - [ ] 23.3 Search

- [ ] 24. Games and Gamification
  - [ ] 24.1 Games hub
  - [ ] 24.2 Achievements
  - [ ] 24.3 Leaderboard

- [ ] 25. Dev Tools
  - [ ] 25.1 Dev dashboard
  - [ ] 25.2 Debug tools
  - [ ] 25.3 Logs viewer
  - [ ] 25.4 Schema viewer

- [ ] 26. Blog and Public Pages

## Execution Method (One by One)

1. Evaluate one top-level section at a time in this exact order.
2. For each section, validate all child items.
3. Apply the "Definition of Perfect" checklist to that section.
4. Fix all blocking gaps before marking the section complete.
5. Do not start final deployment readiness sign-off until sections 0 through 10 are complete.
