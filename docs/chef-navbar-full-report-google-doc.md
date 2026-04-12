# Chef Navbar Full Report

Prepared from the current chef navigation source of truth in `components/navigation/nav-config.tsx`, with supporting visibility logic from `lib/navigation/focus-mode-nav.ts` and layout preference data from `lib/chef/layout-cache.ts`.

## What This Covers

This document covers the chef navigation system across:

- Desktop sidebar primary tabs
- Desktop sidebar grouped navigation
- Desktop sidebar bottom navigation
- Mobile default tabs
- Mobile tab customization options
- Action bar shortcuts
- Create dropdown shortcuts
- Visibility and personalization rules
- A fully expanded visualization of the chef navbar

This is the clearest practical view of the chef navbar as it exists in code today.

## Source of Truth

Primary navigation configuration:

- `components/navigation/nav-config.tsx`

Visibility and focus-mode behavior:

- `lib/navigation/focus-mode-nav.ts`

Preference-driven personalization:

- `lib/chef/layout-cache.ts`

Supporting product-map summaries:

- `project-map/chef-os/dashboard.md`
- `project-map/chef-os/clients.md`
- `project-map/chef-os/culinary.md`
- `project-map/chef-os/events.md`
- `project-map/chef-os/financials.md`
- `project-map/chef-os/analytics.md`
- `project-map/chef-os/daily-ops.md`
- `project-map/chef-os/calendar.md`
- `project-map/chef-os/inquiries.md`
- `project-map/chef-os/settings.md`
- `project-map/chef-os/staff.md`

## Executive Summary

The chef navbar is not one menu. It is a navigation system made up of multiple surfaces:

- A desktop sidebar with pinned top-level hubs
- A large grouped navigation library under those hubs
- A bottom settings entry
- A mobile tab bar with defaults and customization
- A compact action bar with daily-driver shortcuts
- A create dropdown for direct creation flows

Operationally, the nav is organized around these business domains:

- Analytics
- Clients
- Commerce
- Culinary
- Events
- Finance
- Marketing
- Network
- Operations
- Pipeline
- Protection
- Supply Chain
- Tools
- Admin

The sidebar is designed to expose a large number of built pages while still preserving a smaller default top-level set for daily use.

## High-Value Page Summaries by Major Hub

### Dashboard

`/dashboard` is the chef command center. It aggregates widgets for the day’s schedule, operational queue, follow-ups, business metrics, and system context.

### Inbox

`/inbox` is the unified communication and triage center. It is the message-driven operational surface for communication work.

### Events

`/events` is the core operating workflow for bookings and execution. It connects event status, guest info, money, ops readiness, and wrap-up.

### Clients

`/clients` is the CRM hub. It covers client records, communication, loyalty, client history, preferences, insights, and presence.

### Dinner Circles

`/circles` is the collaboration and community workspace centered on dinner circles and related shared activity.

### Culinary

`/culinary`, `/menus`, `/recipes`, and related routes are the chef’s craft layer: menus, recipes, components, ingredients, costing, prep, and vendors.

### Finance

`/financials`, `/finance/*`, and `/expenses` form the money system: invoices, payments, ledger, payouts, taxes, payroll, and reporting.

### Operations

`/operations`, `/daily`, `/staff`, `/tasks`, `/stations`, and related routes cover staffing, execution, queueing, scheduling, kitchen operations, and daily planning.

### Growth

Growth work is distributed across `/marketing`, `/social`, `/network`, and `/analytics`. It covers campaigns, social, network growth, and business insight.

### Admin

`/admin`, `/admin/pulse`, and other admin routes are internal platform oversight and are not visible to standard chef users.

## Tab and Group Summaries

### Primary Tabs

- Dashboard: The chef’s home base for daily status, priorities, metrics, and widgets.
- Inbox: Unified communications hub for message triage and relationship follow-up.
- Events: Booking and execution control center for event lifecycle, planning, payments, and operations.
- Clients: CRM workspace for client profiles, history, preferences, communication, and loyalty.
- Dinner Circles: Community and collaboration workspace centered around circles and shared activity.
- Culinary: Core craft workspace for recipes, menus, costing, prep, ingredients, and vendor workflows.
- Finance: Money hub for invoices, expenses, ledger activity, payments, taxes, and reporting.
- Operations: Daily execution layer for staff, tasks, scheduling, stations, queueing, and kitchen work.
- Growth: Growth-focused access point to campaigns, social, network expansion, and analytics.
- Admin: Internal platform administration area for privileged users only.
- Pulse: Admin monitoring and live platform oversight surface.
- All Inquiries: Admin-wide view of inquiries across the system.

### Grouped Navigation Summaries

- Analytics: Performance measurement, forecasting, reporting, goals, and business intelligence.
- Clients: Detailed client and guest relationship management, including history, preferences, insights, loyalty, and referrals.
- Commerce: POS, products, promotions, reconciliation, settlements, and transaction-facing business operations.
- Culinary: Recipe, menu, ingredient, prep, costing, and kitchen-intelligence workflows.
- Events: Calendar planning, event-state tracking, feedback, review, and post-event management.
- Finance: End-to-end financial operations, from expense entry through payout reconciliation and tax prep.
- Marketing: Campaign planning, social scheduling, content operations, reviews, and brand visibility.
- Network: Chef collaboration, saved contacts, community templates, and external intake connections.
- Operations: Task execution, staffing, scheduling, kitchen ops, travel, and shift coordination.
- Pipeline: Sales funnel operations including inquiries, leads, calls, quotes, proposals, and prospecting.
- Protection: Business continuity, incidents, insurance, certifications, and operational risk protection.
- Supply Chain: Inventory, procurement, audits, food cost, vendors, waste, and storage operations.
- Tools: Utility and support surfaces such as import, help, inbox tools, integrations, messaging, notifications, and commands.
- Admin: Platform-only operational control, monitoring, directory, user, survey, and system-management tools.

### Key Sub-Section Summaries

- Goals: Revenue and business target planning.
- Insights: Cross-cutting business analysis and operational intelligence.
- Loyalty & Rewards: Retention and referral program management.
- Partners & Referrals: External referral network management and attribution.
- Components: Reusable culinary building blocks like stocks, sauces, garnishes, and ferments.
- Prep Workspace: Time-based prep coordination and shopping workflows.
- Event Status: Filtered operational board for upcoming and in-progress event readiness.
- Invoices: Billing state management from draft to paid/refunded/cancelled.
- Payments: Deposits, refunds, disputes, retainers, and installment handling.
- Reports: Consolidated financial or performance reporting depending on domain.
- Content Planner: Social planning, content calendar, media organization, and queue settings.
- Staff: Team directory, scheduling, timekeeping, permissions, and performance.
- Tasks: Assignable work tracking with multiple planning views.
- Prospecting: Outbound lead-generation and call-queue workflow for admin/internal use.
- Business Health: Settings-based protection hub for continuity, insurance, certifications, and legal safeguards.
- Inventory Hub: Central stock, audit, procurement, and movement management surface.
- Integrations: Connected systems, platform connections, automations, sync, and embedded tooling.

## Navigation Surfaces

### 1. Desktop Sidebar: Primary Tabs

These are the pinned top-level hubs shown in the main sidebar.

- Dashboard
- Inbox
- Events
- Clients
- Dinner Circles
- Culinary
- Finance
- Operations
- Growth
- Admin
- Pulse
- All Inquiries

The first nine are normal chef-facing hubs. The final three are admin-only.

### 2. Desktop Sidebar: Grouped Navigation Library

These are the expandable domain groups shown in the sidebar. They are alphabetically sorted at runtime, with Admin forced to the end:

- Analytics
- Clients
- Commerce
- Culinary
- Events
- Finance
- Marketing
- Network
- Operations
- Pipeline
- Protection
- Supply Chain
- Tools
- Admin

### 3. Desktop Sidebar: Bottom Navigation

- Settings -> `/settings`

### 4. Mobile Default Tabs

The default mobile tab bar contains five items:

- Home -> `/dashboard`
- Daily Ops -> `/daily`
- Inbox -> `/inbox`
- Events -> `/events`
- Clients -> `/clients`

### 5. Mobile Tab Customization Options

Users can customize their five mobile tabs from this pool:

- Home -> `/dashboard`
- Daily Ops -> `/daily`
- Inbox -> `/inbox`
- Events -> `/events`
- Clients -> `/clients`
- Calendar -> `/calendar`
- Inquiries -> `/inquiries`
- Menus -> `/menus`
- Recipes -> `/recipes`
- Finance -> `/financials`
- Messaging -> `/chat`
- Documents -> `/documents`
- Costing -> `/culinary/costing`
- Queue -> `/queue`
- Settings -> `/settings`

### 6. Action Bar Shortcuts

The compact action bar currently exposes seven daily-driver shortcuts:

- Inbox -> `/inbox`
- Events -> `/events`
- Clients -> `/clients`
- Menus -> `/menus`
- Money -> `/financials`
- Prep -> `/culinary/prep`
- Circles -> `/circles`

### 7. Create Dropdown

The create dropdown provides direct links for common creation flows.

Creative:

- New Menu -> `/menus/new`
- New Recipe -> `/recipes/new`

Pipeline:

- New Event -> `/events/new`
- New Client -> `/clients/new`
- New Quote -> `/quotes/new`
- New Inquiry -> `/inquiries/new`
- New Expense -> `/expenses/new`

Operational:

- Documents -> `/documents`
- Prep -> `/culinary/prep`
- Calendar Date -> `/calendar`
- Shopping List -> `/culinary/prep/shopping`
- Inventory Item -> `/inventory`

Uploads:

- Upload Receipt -> `/receipts`
- Photo Upload -> `/recipes/photos`
- Upload Menu -> `/menus/upload`

## Visibility, Personalization, and Behavior Rules

### Admin-only items

Some items are marked `adminOnly` and should only render for admins. Examples include:

- `/admin`
- `/admin/pulse`
- `/admin/inquiries`
- Multiple items under the Admin group
- Prospecting under the Pipeline group
- Remy History under Tools

### Hidden items

Some routes exist in nav config but are marked hidden. These remain part of the underlying structure but are not meant to be openly surfaced in normal navigation. Examples include:

- `/finance/overview/cash-flow`
- `/finance/cash-flow`
- `/finance/bank-feed`
- `/social/compose`
- `/charity`
- `/settings/api-keys`
- `/settings/webhooks`
- `/settings/zapier`
- `/safety/claims/new`

### Focus mode

Strict focus mode reduces the visible group set to:

- Pipeline
- Events
- Clients
- Admin for admins only

The focus-mode helper also references a `remy` group in ordering logic, but there is no corresponding `remy` nav group in the current `nav-config.tsx`. That means the focus-mode ordering logic contains a stale concept that does not currently map to a real sidebar group.

### Preference-driven personalization

The chef layout cache pulls these preference fields:

- `primary_nav_hrefs`
- `mobile_tab_hrefs`
- `enabled_modules`
- `focus_mode`

This means the effective navbar can vary by chef preferences, enabled modules, and focus-mode state.

## Fully Expanded Visualization of the Chef Navbar

Legend:

- `[admin]` = admin-only
- `[hidden]` = intentionally hidden from ordinary surfaced nav

```text
CHEF NAVBAR

Desktop Sidebar
|
+-- Top-Level Hubs
|   |
|   +-- Dashboard -> /dashboard
|   +-- Inbox -> /inbox
|   +-- Events -> /events
|   |   +-- Calendar -> /calendar
|   |   +-- Inquiries -> /inquiries
|   |   +-- New Event -> /events/new
|   |   +-- Proposals -> /proposals
|   |   +-- Quotes -> /quotes
|   |
|   +-- Clients -> /clients
|   |   +-- Add Client -> /clients/new
|   |   +-- Follow-Ups -> /clients/communication/follow-ups
|   |   +-- Loyalty -> /clients/loyalty
|   |   +-- Top Clients -> /clients/insights/top-clients
|   |
|   +-- Dinner Circles -> /circles
|   |   +-- All Circles -> /circles
|   |   +-- Social Feed -> /circles?tab=feed
|   |
|   +-- Culinary -> /culinary
|   |   +-- Costing -> /culinary/costing
|   |   +-- Food Catalog -> /culinary/price-catalog
|   |   +-- Menus -> /menus
|   |   +-- Prep -> /culinary/prep
|   |   +-- Recipes -> /culinary/recipes
|   |
|   +-- Finance -> /financials
|   |   +-- Expenses -> /expenses
|   |   +-- Invoices -> /finance/invoices
|   |   +-- Profit and Loss -> /finance/reporting/profit-loss
|   |
|   +-- Operations -> /operations
|   |   +-- Daily Ops -> /stations/daily-ops
|   |   +-- Staff -> /staff
|   |   +-- Tasks -> /tasks
|   |
|   +-- Growth -> /growth
|   |   +-- Analytics -> /analytics
|   |   +-- Campaigns -> /marketing
|   |   +-- Chef Network -> /network
|   |   +-- Social Media -> /social
|   |
|   +-- Admin -> /admin [admin]
|   +-- Pulse -> /admin/pulse [admin]
|   +-- All Inquiries -> /admin/inquiries [admin]
|
+-- Grouped Navigation
|   |
|   +-- Analytics
|   |   +-- Business Analytics -> /analytics/benchmarks
|   |   |   +-- Client Value -> /analytics/client-ltv
|   |   |   +-- Demand Heatmap -> /analytics/demand
|   |   |   +-- Pipeline Forecast -> /analytics/pipeline
|   |   |   +-- Referral Sources -> /analytics/referral-sources
|   |   +-- Conversion Funnel -> /analytics/funnel
|   |   +-- Goals -> /goals
|   |   |   +-- Goal Setup -> /goals/setup
|   |   |   +-- Revenue Path -> /goals/revenue-path
|   |   +-- Insights -> /insights
|   |   |   +-- Custom Reports -> /analytics/reports
|   |   |   +-- Daily Report -> /analytics/daily-report
|   |   |   +-- Source Analytics -> /analytics
|   |   |   +-- Time Analysis -> /insights/time-analysis
|   |   +-- Intelligence Hub -> /intelligence
|   |   |   +-- Full Dashboard -> /intelligence
|   |   +-- Reports -> /reports
|   |   +-- Surveys -> /surveys
|   |
|   +-- Clients
|   |   +-- Client Directory -> /clients
|   |   |   +-- Active -> /clients/active
|   |   |   +-- Add Client -> /clients/new
|   |   |   +-- Duplicates -> /clients/duplicates
|   |   |   +-- Gift Cards -> /clients/gift-cards
|   |   |   +-- Inactive -> /clients/inactive
|   |   |   +-- Segments -> /clients/segments
|   |   |   +-- VIP -> /clients/vip
|   |   +-- Client History -> /clients/history
|   |   |   +-- Event History -> /clients/history/event-history
|   |   |   +-- Past Menus -> /clients/history/past-menus
|   |   |   +-- Payment History -> /clients/history/spending-history
|   |   +-- Client Insights -> /clients/insights
|   |   |   +-- At Risk -> /clients/insights/at-risk
|   |   |   +-- Most Frequent -> /clients/insights/most-frequent
|   |   |   +-- Top Clients -> /clients/insights/top-clients
|   |   +-- Client Intake -> /clients/intake
|   |   +-- Client Presence -> /clients/presence
|   |   +-- Communication -> /clients/communication
|   |   |   +-- Client Notes -> /clients/communication/notes
|   |   |   +-- Follow-Ups -> /clients/communication/follow-ups
|   |   |   +-- Upcoming Touchpoints -> /clients/communication/upcoming-touchpoints
|   |   +-- Guest Directory -> /guests
|   |   |   +-- Guest Insights -> /guest-analytics
|   |   |   +-- Guest Pipeline -> /guest-leads
|   |   |   +-- Reservations -> /guests/reservations
|   |   +-- Loyalty & Rewards -> /loyalty
|   |   |   +-- Create Reward -> /loyalty/rewards/new
|   |   |   +-- Learn About Loyalty -> /loyalty/learn
|   |   |   +-- Loyalty Overview -> /clients/loyalty
|   |   |   +-- Points -> /clients/loyalty/points
|   |   |   +-- Program Settings -> /loyalty/settings
|   |   |   +-- Raffle -> /loyalty/raffle
|   |   |   +-- Referrals -> /clients/loyalty/referrals
|   |   |   +-- Rewards -> /clients/loyalty/rewards
|   |   +-- Partners & Referrals -> /partners
|   |   |   +-- Active -> /partners/active
|   |   |   +-- Add Partner -> /partners/new
|   |   |   +-- Events Generated -> /partners/events-generated
|   |   |   +-- Inactive -> /partners/inactive
|   |   |   +-- Referral Performance -> /partners/referral-performance
|   |   +-- Preferences & Dietary -> /clients/preferences
|   |   |   +-- Allergies -> /clients/preferences/allergies
|   |   |   +-- Dietary Restrictions -> /clients/preferences/dietary-restrictions
|   |   |   +-- Dislikes -> /clients/preferences/dislikes
|   |   |   +-- Favorite Dishes -> /clients/preferences/favorite-dishes
|   |   +-- Recurring Clients -> /clients/recurring
|   |
|   +-- Commerce
|   |   +-- Clover Parity -> /commerce/parity
|   |   +-- Commerce Hub -> /commerce
|   |   +-- Observability -> /commerce/observability
|   |   +-- Order Queue -> /commerce/orders
|   |   +-- Payment Schedules -> /commerce/schedules
|   |   +-- POS Register -> /commerce/register
|   |   +-- Products -> /commerce/products
|   |   |   +-- New Product -> /commerce/products/new
|   |   +-- Promotions -> /commerce/promotions
|   |   +-- Reconciliation -> /commerce/reconciliation
|   |   +-- Reports -> /commerce/reports
|   |   |   +-- Shift Reports -> /commerce/reports/shifts
|   |   +-- Sales History -> /commerce/sales
|   |   +-- Settlements -> /commerce/settlements
|   |   +-- Table Service -> /commerce/table-service
|   |   +-- Virtual Terminal -> /commerce/virtual-terminal
|   |
|   +-- Culinary
|   |   +-- Components -> /culinary/components
|   |   |   +-- Ferments -> /culinary/components/ferments
|   |   |   +-- Garnishes -> /culinary/components/garnishes
|   |   |   +-- Sauces -> /culinary/components/sauces
|   |   |   +-- Shared Elements -> /culinary/components/shared-elements
|   |   |   +-- Stocks -> /culinary/components/stocks
|   |   +-- Costing -> /culinary/costing
|   |   |   +-- Food Cost Analysis -> /culinary/costing/food-cost
|   |   |   +-- Menu Costs -> /culinary/costing/menu
|   |   |   +-- On Sale This Week -> /culinary/costing/sales
|   |   |   +-- Recipe Costs -> /culinary/costing/recipe
|   |   +-- Culinary Board -> /culinary-board
|   |   +-- Culinary Hub -> /culinary
|   |   +-- Food Catalog -> /culinary/price-catalog
|   |   +-- Ingredients -> /recipes/ingredients
|   |   |   +-- Ingredients Database -> /culinary/ingredients
|   |   |   +-- Receipt Scanner -> /culinary/ingredients/receipt-scan
|   |   |   +-- Seasonal Availability -> /culinary/ingredients/seasonal-availability
|   |   |   +-- Vendor Notes -> /culinary/ingredients/vendor-notes
|   |   +-- Menu Engine Settings -> /settings/menu-engine
|   |   +-- Menus -> /menus
|   |   |   +-- All Menus -> /culinary/menus
|   |   |   +-- Approved -> /culinary/menus/approved
|   |   |   +-- Dish Index -> /culinary/dish-index
|   |   |   +-- Dish Insights -> /culinary/dish-index/insights
|   |   |   +-- Dishes -> /menus/dishes
|   |   |   +-- Drafts -> /culinary/menus/drafts
|   |   |   +-- Estimate -> /menus/estimate
|   |   |   +-- Menu Engineering -> /culinary/menus/engineering
|   |   |   +-- Menu Upload -> /menus/upload
|   |   |   +-- New Menu -> /menus/new
|   |   |   +-- Scaling -> /culinary/menus/scaling
|   |   |   +-- Substitutions -> /culinary/menus/substitutions
|   |   |   +-- Tasting Menus -> /menus/tasting
|   |   |   +-- Templates -> /culinary/menus/templates
|   |   +-- My Kitchen -> /culinary/my-kitchen
|   |   +-- Prep Workspace -> /culinary/prep
|   |   |   +-- Prep Timeline -> /culinary/prep/timeline
|   |   |   +-- Shopping Lists -> /culinary/prep/shopping
|   |   +-- Recipe Import Hub -> /recipes/import
|   |   +-- Recipe Sprint -> /recipes/sprint
|   |   +-- Recipes -> /recipes
|   |   |   +-- Brain Dump -> /recipes/dump
|   |   |   +-- By Dietary Flags -> /culinary/recipes/dietary-flags
|   |   |   +-- Drafts -> /culinary/recipes/drafts
|   |   |   +-- New Recipe -> /recipes/new
|   |   |   +-- Production Log -> /recipes/production-log
|   |   |   +-- Recipe Library -> /culinary/recipes
|   |   |   +-- Seasonal Notes -> /culinary/recipes/seasonal-notes
|   |   |   +-- Step Photos -> /recipes/photos
|   |   |   +-- Tags -> /culinary/recipes/tags
|   |   +-- Seasonal Palettes -> /settings/repertoire
|   |   +-- Substitutions -> /culinary/substitutions
|   |   +-- Vendor Directory -> /culinary/vendors
|   |
|   +-- Events
|   |   +-- Calendar -> /calendar
|   |   |   +-- Day View -> /calendar/day
|   |   |   +-- Share Calendar -> /calendar/share
|   |   |   +-- Waitlist -> /waitlist
|   |   |   +-- Week Planner -> /calendar/week
|   |   |   +-- Year View -> /calendar/year
|   |   +-- Client Feedback -> /feedback
|   |   |   +-- Feedback Dashboard -> /feedback/dashboard
|   |   |   +-- Send Requests -> /feedback/requests
|   |   +-- Event Calendar -> /production
|   |   +-- Event Reviews -> /aar
|   |   |   +-- Reviews -> /reviews
|   |   |   +-- Smart Import -> /import
|   |   +-- Event Status -> /events/upcoming
|   |       +-- Awaiting Deposit -> /events/awaiting-deposit
|   |       +-- Cancelled -> /events/cancelled
|   |       +-- Completed -> /events/completed
|   |       +-- Confirmed -> /events/confirmed
|   |       +-- Create Event -> /events/new
|   |       +-- Create from Text -> /events/new/from-text
|   |       +-- Event Wizard -> /events/new/wizard
|   |       +-- Kanban Board -> /events/board
|   |
|   +-- Finance
|   |   +-- 1099 Contractors -> /finance/contractors
|   |   +-- Break-Even Analysis -> /finance/planning/break-even
|   |   +-- Expenses -> /expenses
|   |   |   +-- Add Expense -> /expenses/new
|   |   |   +-- By Category -> /finance/expenses
|   |   |   +-- Food & Ingredients -> /finance/expenses/food-ingredients
|   |   |   +-- Labor -> /finance/expenses/labor
|   |   |   +-- Marketing -> /finance/expenses/marketing
|   |   |   +-- Miscellaneous -> /finance/expenses/miscellaneous
|   |   |   +-- Plate Costs -> /finance/plate-costs
|   |   |   +-- Receipt Library -> /receipts
|   |   |   +-- Rentals & Equipment -> /finance/expenses/rentals-equipment
|   |   |   +-- Software -> /finance/expenses/software
|   |   |   +-- Travel -> /finance/expenses/travel
|   |   +-- Financial Goals -> /finance/goals
|   |   +-- Financial Hub -> /financials
|   |   |   +-- Cash Flow -> /finance/overview/cash-flow [hidden]
|   |   |   +-- Finance Home -> /finance
|   |   |   +-- Outstanding Payments -> /finance/overview/outstanding-payments
|   |   |   +-- Overview -> /finance/overview
|   |   |   +-- Revenue Summary -> /finance/overview/revenue-summary
|   |   +-- Forecasting -> /finance/forecast
|   |   |   +-- Cash Flow Forecast -> /finance/cash-flow [hidden]
|   |   +-- Invoices -> /finance/invoices
|   |   |   +-- Cancelled -> /finance/invoices/cancelled
|   |   |   +-- Draft -> /finance/invoices/draft
|   |   |   +-- Overdue -> /finance/invoices/overdue
|   |   |   +-- Paid -> /finance/invoices/paid
|   |   |   +-- Recurring Invoices -> /finance/recurring
|   |   |   +-- Refunded -> /finance/invoices/refunded
|   |   |   +-- Sent -> /finance/invoices/sent
|   |   +-- Ledger -> /finance/ledger
|   |   |   +-- Adjustments -> /finance/ledger/adjustments
|   |   |   +-- Transaction Log -> /finance/ledger/transaction-log
|   |   +-- Payment Splitting -> /payments/splitting
|   |   +-- Payments -> /finance/payments
|   |   |   +-- Deposits -> /finance/payments/deposits
|   |   |   +-- Disputes -> /finance/disputes
|   |   |   +-- Failed Payments -> /finance/payments/failed
|   |   |   +-- Installments -> /finance/payments/installments
|   |   |   +-- New Retainer -> /finance/retainers/new
|   |   |   +-- Refunds -> /finance/payments/refunds
|   |   |   +-- Retainers -> /finance/retainers
|   |   +-- Payouts -> /finance/payouts
|   |   |   +-- Bank Feed -> /finance/bank-feed [hidden]
|   |   |   +-- Manual Payments -> /finance/payouts/manual-payments
|   |   |   +-- Reconciliation -> /finance/payouts/reconciliation
|   |   |   +-- Stripe Payouts -> /finance/payouts/stripe-payouts
|   |   +-- Payroll -> /finance/payroll
|   |   |   +-- 941 Filing -> /finance/payroll/941
|   |   |   +-- Employees -> /finance/payroll/employees
|   |   |   +-- Run Payroll -> /finance/payroll/run
|   |   |   +-- W-2 Forms -> /finance/payroll/w2
|   |   +-- Reports -> /finance/reporting
|   |   |   +-- Expense by Category -> /finance/reporting/expense-by-category
|   |   |   +-- Profit & Loss -> /finance/reporting/profit-loss
|   |   |   +-- Profit by Event -> /finance/reporting/profit-by-event
|   |   |   +-- Revenue by Client -> /finance/reporting/revenue-by-client
|   |   |   +-- Revenue by Event -> /finance/reporting/revenue-by-event
|   |   |   +-- Revenue by Month -> /finance/reporting/revenue-by-month
|   |   |   +-- Year-to-Date Summary -> /finance/reporting/year-to-date-summary
|   |   +-- Sales Tax -> /finance/sales-tax
|   |   |   +-- Remittances -> /finance/sales-tax/remittances
|   |   |   +-- Tax Settings -> /finance/sales-tax/settings
|   |   +-- Tax Center -> /finance/tax
|   |   |   +-- 1099-NEC -> /finance/tax/1099-nec
|   |   |   +-- Depreciation -> /finance/tax/depreciation
|   |   |   +-- Home Office -> /finance/tax/home-office
|   |   |   +-- Quarterly Estimates -> /finance/tax/quarterly
|   |   |   +-- Retirement -> /finance/tax/retirement
|   |   |   +-- Tax Summary -> /finance/reporting/tax-summary
|   |   |   +-- Year-End Package -> /finance/tax/year-end
|   |   +-- Year-End Close -> /finance/year-end
|   |
|   +-- Marketing
|   |   +-- Brand Mentions -> /reputation/mentions
|   |   +-- Campaign Content -> /marketing/content-pipeline
|   |   +-- Content Pipeline -> /content
|   |   +-- Content Planner -> /social/planner
|   |   |   +-- Content Calendar -> /social/calendar
|   |   |   +-- Media Vault -> /social/vault
|   |   |   +-- Platform Connections -> /social/connections
|   |   |   +-- Post from Event -> /social/compose [hidden]
|   |   |   +-- Queue Settings -> /social/settings
|   |   |   +-- Social Templates -> /social/templates
|   |   +-- Email Campaigns -> /marketing
|   |   |   +-- New Push Dinner -> /marketing/push-dinners/new
|   |   |   +-- Push Dinners -> /marketing/push-dinners
|   |   |   +-- Sequences -> /marketing/sequences
|   |   |   +-- Templates -> /marketing/templates
|   |   +-- Event Portfolio -> /portfolio
|   |   +-- Reviews -> /reviews
|   |   +-- Social Media -> /social
|   |       +-- Dinner Circle Overview -> /social/hub-overview
|   |       +-- Post Planner -> /social/planner
|   |
|   +-- Network
|   |   +-- Community Impact -> /charity [hidden]
|   |   |   +-- Volunteer Hours -> /charity/hours
|   |   +-- Chef Network -> /network
|   |   |   +-- Collaborations -> /network/collabs
|   |   |   +-- Notifications -> /network/notifications
|   |   |   +-- Saved Chefs -> /network/saved
|   |   +-- Community Templates -> /community/templates
|   |   +-- Wix Submissions -> /wix-submissions
|   |
|   +-- Operations
|   |   +-- Daily Ops -> /stations/daily-ops
|   |   +-- Daily View -> /daily
|   |   +-- Documents -> /documents
|   |   +-- Equipment -> /operations/equipment
|   |   |   +-- Maintenance Schedule -> /operations/equipment?tab=maintenance
|   |   +-- Kitchen Mode -> /kitchen
|   |   +-- Kitchen Rentals -> /operations/kitchen-rentals
|   |   +-- Meal Prep -> /meal-prep
|   |   |   +-- Dashboard -> /meal-prep
|   |   +-- Priority Queue -> /queue
|   |   +-- Scheduling -> /scheduling
|   |   +-- Staff -> /staff
|   |   |   +-- Availability -> /staff/availability
|   |   |   +-- Clock In/Out -> /staff/clock
|   |   |   +-- Labor Dashboard -> /staff/labor
|   |   |   +-- Live Activity -> /staff/live
|   |   |   +-- Performance -> /staff/performance
|   |   |   +-- Permissions -> /staff/permissions
|   |   |   +-- Schedule -> /staff/schedule
|   |   +-- Station Clipboards -> /stations
|   |   |   +-- Ops Log -> /stations/ops-log
|   |   |   +-- Order Sheet -> /stations/orders
|   |   |   +-- Waste Log -> /stations/waste
|   |   +-- Tasks -> /tasks
|   |   |   +-- Gantt Chart -> /tasks/gantt
|   |   |   +-- Task Templates -> /tasks/templates
|   |   |   +-- VA Tasks -> /tasks/va
|   |   +-- Team Management -> /team
|   |   +-- Travel Planning -> /travel
|   |
|   +-- Pipeline
|   |   +-- Calls & Meetings -> /calls
|   |   |   +-- Completed -> /calls?status=completed
|   |   |   +-- Schedule Call -> /calls/new
|   |   |   +-- Upcoming -> /calls?status=scheduled
|   |   +-- Consulting Hub -> /consulting
|   |   +-- Contracts -> /contracts
|   |   |   +-- Templates -> /settings/contracts
|   |   +-- Inquiries -> /inquiries
|   |   |   +-- Awaiting Response -> /inquiries/awaiting-response
|   |   |   +-- Client Reply -> /inquiries/awaiting-client-reply
|   |   |   +-- Declined -> /inquiries/declined
|   |   |   +-- Menu Drafting -> /inquiries/menu-drafting
|   |   |   +-- New Inquiry -> /inquiries/new
|   |   |   +-- Sent to Client -> /inquiries/sent-to-client
|   |   +-- Leads -> /leads
|   |   |   +-- Archived -> /leads/archived
|   |   |   +-- Contacted -> /leads/contacted
|   |   |   +-- Converted -> /leads/converted
|   |   |   +-- New -> /leads/new
|   |   |   +-- Qualified -> /leads/qualified
|   |   +-- Marketplace -> /marketplace
|   |   |   +-- Availability Broadcaster -> /availability
|   |   |   +-- Capture Live Page -> /marketplace/capture
|   |   |   +-- Command Center -> /marketplace
|   |   +-- Proposals -> /proposals
|   |   |   +-- Add-Ons -> /proposals/addons
|   |   |   +-- Proposal Builder -> /proposals/builder
|   |   |   +-- Templates -> /proposals/templates
|   |   +-- Prospecting -> /prospecting [admin]
|   |   |   +-- AI Scrub -> /prospecting/scrub
|   |   |   +-- Call Queue -> /prospecting/queue
|   |   |   +-- Call Scripts -> /prospecting/scripts
|   |   |   +-- Clusters -> /prospecting/clusters
|   |   |   +-- Import Leads -> /prospecting/import
|   |   |   +-- Pipeline -> /prospecting/pipeline
|   |   +-- Quotes -> /quotes
|   |   |   +-- Accepted -> /quotes/accepted
|   |   |   +-- Draft -> /quotes/draft
|   |   |   +-- Expired -> /quotes/expired
|   |   |   +-- New Quote -> /quotes/new
|   |   |   +-- Rejected -> /quotes/rejected
|   |   |   +-- Sent -> /quotes/sent
|   |   |   +-- Viewed -> /quotes/viewed
|   |   +-- Rate Card -> /rate-card
|   |   +-- Testimonials -> /testimonials
|   |   +-- Wix Forms -> /wix-submissions
|   |
|   +-- Protection
|   |   +-- Backup Coverage -> /safety/backup-chef
|   |   +-- Business Health -> /settings/protection
|   |   |   +-- Business Continuity -> /settings/protection/continuity
|   |   |   +-- Business Health -> /settings/protection/business-health
|   |   |   +-- Certifications -> /settings/protection/certifications
|   |   |   +-- Crisis Response -> /settings/protection/crisis
|   |   |   +-- Insurance -> /settings/protection/insurance
|   |   |   +-- NDA & Permissions -> /settings/protection/nda
|   |   |   +-- Portfolio Removal -> /settings/protection/portfolio-removal
|   |   +-- Incidents -> /safety/incidents
|   |   |   +-- Report Incident -> /safety/incidents/new
|   |   +-- Insurance Claims -> /safety/claims
|   |       +-- Claim Documents -> /safety/claims/documents
|   |       +-- New Claim -> /safety/claims/new [hidden]
|   |
|   +-- Supply Chain
|   |   +-- Demand Forecast -> /inventory/demand
|   |   +-- Expiry Alerts -> /inventory/expiry
|   |   +-- Food Cost -> /food-cost
|   |   |   +-- Daily Revenue -> /food-cost/revenue
|   |   +-- Food Cost Analysis -> /inventory/food-cost
|   |   +-- Inventory Counts -> /inventory/counts
|   |   +-- Inventory Hub -> /inventory
|   |   +-- Physical Audits -> /inventory/audits
|   |   |   +-- New Audit -> /inventory/audits/new
|   |   +-- Procurement Hub -> /inventory/procurement
|   |   +-- Purchase Orders -> /inventory/purchase-orders
|   |   |   +-- New PO -> /inventory/purchase-orders/new
|   |   +-- Purveyors -> /vendors
|   |   |   +-- Invoices -> /vendors/invoices
|   |   |   +-- Price Comparison -> /vendors/price-comparison
|   |   +-- Staff Meals -> /inventory/staff-meals
|   |   +-- Storage Locations -> /inventory/locations
|   |   +-- Transaction Ledger -> /inventory/transactions
|   |   +-- Vendor Invoices -> /inventory/vendor-invoices
|   |   +-- Waste Tracking -> /inventory/waste
|   |
|   +-- Tools
|   |   +-- Activity Log -> /activity
|   |   +-- Data Import -> /import
|   |   |   +-- CSV Import -> /import/csv
|   |   |   +-- Import History -> /import/history
|   |   |   +-- MasterCook Import -> /import/mxp
|   |   +-- Help Center -> /help
|   |   |   +-- Food Costing Guide -> /help/food-costing
|   |   +-- Inbox Tools -> /inbox/history-scan
|   |   |   +-- Sort Messages -> /inbox/triage
|   |   +-- Integrations -> /settings/integrations
|   |   |   +-- API Keys -> /settings/api-keys [hidden]
|   |   |   +-- Automations -> /settings/automations
|   |   |   +-- Calendar Sync -> /settings/calendar-sync
|   |   |   +-- Custom Fields -> /settings/custom-fields
|   |   |   +-- Embed Widget -> /settings/embed
|   |   |   +-- Platform Connections -> /settings/platform-connections
|   |   |   +-- Stripe Connect -> /settings/stripe-connect
|   |   |   +-- Webhooks -> /settings/webhooks [hidden]
|   |   |   +-- Yelp -> /settings/yelp
|   |   |   +-- Zapier -> /settings/zapier [hidden]
|   |   +-- Messaging -> /chat
|   |   +-- Morning Briefing -> /briefing
|   |   +-- Notifications -> /notifications
|   |   +-- Quick Commands -> /commands
|   |   +-- Remy History -> /remy [admin]
|   |
|   +-- Admin
|       +-- All Events -> /admin/events [admin]
|       +-- Analytics -> /admin/analytics [admin]
|       +-- Audit Log -> /admin/audit [admin]
|       +-- Cannabis Tier -> /admin/cannabis [admin]
|       +-- Chefs -> /admin/users [admin]
|       +-- Clients -> /admin/clients [admin]
|       +-- Command Center -> /admin/command-center [admin]
|       +-- Communications -> /admin/communications [admin]
|       +-- Conversations -> /admin/conversations [admin]
|       +-- Data Engine Health -> /admin/openclaw/health [admin]
|       +-- Dinner Circle Groups -> /admin/hub [admin]
|       +-- Directory -> /admin/directory [admin]
|       +-- Directory Listings -> /admin/directory-listings [admin]
|       +-- Early Signups -> /admin/beta [admin]
|       +-- Feature Flags -> /admin/flags [admin]
|       +-- Feedback -> /admin/feedback [admin]
|       +-- Financials -> /admin/financials [admin]
|       +-- Live Presence -> /admin/presence [admin]
|       +-- Notifications -> /admin/notifications [admin]
|       +-- Overview -> /admin [admin]
|       +-- Reconciliation -> /admin/reconciliation [admin]
|       +-- Referral Partners -> /admin/referral-partners [admin]
|       +-- Silent Failures -> /admin/silent-failures [admin]
|       +-- Social Feed -> /admin/social [admin]
|       +-- Surveys -> /admin/beta-surveys [admin]
|       +-- System Health -> /admin/system [admin]
|       +-- System Payments -> /admin/system/payments [admin]
|
+-- Bottom Navigation
|   +-- Settings -> /settings
|
+-- Mobile Default Tabs
|   +-- Home -> /dashboard
|   +-- Daily Ops -> /daily
|   +-- Inbox -> /inbox
|   +-- Events -> /events
|   +-- Clients -> /clients
|
+-- Mobile Custom Tab Options
|   +-- Home -> /dashboard
|   +-- Daily Ops -> /daily
|   +-- Inbox -> /inbox
|   +-- Events -> /events
|   +-- Clients -> /clients
|   +-- Calendar -> /calendar
|   +-- Inquiries -> /inquiries
|   +-- Menus -> /menus
|   +-- Recipes -> /recipes
|   +-- Finance -> /financials
|   +-- Messaging -> /chat
|   +-- Documents -> /documents
|   +-- Costing -> /culinary/costing
|   +-- Queue -> /queue
|   +-- Settings -> /settings
|
+-- Action Bar
|   +-- Inbox -> /inbox
|   +-- Events -> /events
|   +-- Clients -> /clients
|   +-- Menus -> /menus
|   +-- Money -> /financials
|   +-- Prep -> /culinary/prep
|   +-- Circles -> /circles
|
+-- Create Dropdown
    +-- New Menu -> /menus/new
    +-- New Recipe -> /recipes/new
    +-- New Event -> /events/new
    +-- New Client -> /clients/new
    +-- New Quote -> /quotes/new
    +-- New Inquiry -> /inquiries/new
    +-- New Expense -> /expenses/new
    +-- Documents -> /documents
    +-- Prep -> /culinary/prep
    +-- Calendar Date -> /calendar
    +-- Shopping List -> /culinary/prep/shopping
    +-- Inventory Item -> /inventory
    +-- Upload Receipt -> /receipts
    +-- Photo Upload -> /recipes/photos
    +-- Upload Menu -> /menus/upload
```

## Important Findings

### 1. The navbar is much larger than the default top-level view suggests

The chef-facing experience can look simple at first glance, but the grouped navigation exposes a very large route surface across operations, culinary, finance, growth, and admin.

### 2. The system has multiple layers of discoverability

A page may be accessible from:

- A top-level sidebar hub
- A grouped sidebar entry
- A submenu
- A mobile tab option
- The action bar
- The create dropdown

This means route discoverability is broader than the visible top-level sidebar alone.

### 3. Some nav items are intentionally hidden

There are pages in config marked hidden but still structurally present. These should not be treated as ordinary user-facing nav unless intentionally re-promoted.

### 4. Admin and chef navigation are mixed in one config source

This is manageable, but it means any future navbar cleanup needs to be careful not to accidentally expose admin surfaces.

### 5. Focus-mode logic contains a stale concept

`focus-mode-nav.ts` references a `remy` group in strict focus ordering, but no corresponding `remy` sidebar group exists in current nav config. That should be treated as a cleanup candidate.

## Visibility and Access Matrix

### Always-visible chef-facing hubs

These are part of the standard chef navigation experience:

- Dashboard
- Inbox
- Events
- Clients
- Dinner Circles
- Culinary
- Finance
- Operations
- Growth
- Settings

### Admin-only surfaces

These should only be visible to admins or internal operators:

- Admin top-level tab
- Pulse top-level tab
- All Inquiries top-level tab
- Admin navigation group and its child routes
- Prospecting in the Pipeline group
- Remy History in Tools

### Hidden-but-configured routes

These exist in navigation config but are intentionally hidden from normal surfaced navigation:

- Finance cash-flow overview and forecast variants
- Finance bank feed
- Social compose
- Charity top-level group item
- API keys
- Webhooks
- Zapier
- New insurance claim

### Personalization-driven surfaces

These can vary by user preference or profile state:

- Primary sidebar shortcuts via `primary_nav_hrefs`
- Mobile tabs via `mobile_tab_hrefs`
- Group/module availability via `enabled_modules`
- Focus mode via `focus_mode`

### Focus-mode-visible groups

When strict focus mode is active, the intended visible groups are:

- Pipeline
- Events
- Clients
- Admin for admins only

## Usage Classification

### Daily-driver surfaces

These are the most likely high-frequency workflow areas:

- Dashboard
- Inbox
- Events
- Clients
- Calendar
- Inquiries
- Quotes
- Menus
- Recipes
- Prep
- Financials
- Tasks
- Staff
- Queue
- Notifications

### Weekly or regular operational surfaces

These are important but usually not opened constantly:

- Reports
- Loyalty
- Partners
- Inventory
- Procurement
- Purchase Orders
- Event Reviews
- Scheduling
- Documents
- Marketing campaigns
- Social planner
- Network collaborations

### Occasional setup or back-office surfaces

These are lower-frequency but still important:

- Integrations
- Menu engine settings
- Seasonal palettes
- Stripe Connect
- Calendar sync
- Custom fields
- Payroll
- Tax center
- Sales tax
- Business protection settings
- Insurance claims
- Contract templates
- Embed widget

### Internal-only or exceptional-use surfaces

These are mainly for internal support, admin, diagnostics, or edge-case operations:

- Admin group
- Pulse
- All Inquiries
- Data Engine Health
- Silent Failures
- Feature Flags
- System Health
- System Payments
- Beta surveys
- Referral partner admin pages

## Duplicate and Overlap Audit

### Same workflow exposed in multiple places

Several workflows are intentionally exposed more than once:

- Events appears as a primary tab, grouped event routes, mobile tab option, and action-bar shortcut.
- Clients appears as a primary tab, grouped client routes, mobile tab option, and action-bar shortcut.
- Menus appears under Culinary, as a mobile option, and in the action bar.
- Finance appears as a primary tab, mobile option, grouped finance routes, and action-bar shortcut as `Money`.
- Prep appears under Culinary, in the action bar, and in the create dropdown.
- Inquiries appears under Events submenu, Pipeline group, and mobile options.
- Calendar appears under Events submenu, Events group, mobile options, and create dropdown as `Calendar Date`.
- Settings appears as bottom sidebar navigation and as a mobile-tab option.

### Label inconsistency risks

Some concepts are branded differently depending on surface:

- `Finance` vs `Money`
- `Dinner Circles` vs `Circles`
- `Client Directory` vs `Clients`
- `Financial Hub` vs `Finance Home` vs `Finance`
- `Content Pipeline` vs `Campaign Content`
- `Social Media` vs `Content Planner` vs `Post Planner`

These are not always wrong, but they increase cognitive load and make the nav feel less unified.

### Potentially confusing route overlap

- `Events` links to event workflow, but `Calendar`, `Production`, and `Event Status` split adjacent event work across multiple routes.
- `Culinary`, `Menus`, `Recipes`, `Costing`, and `Food Catalog` are tightly related and appear across both top-level and grouped navigation.
- `Finance`, `Financials`, and multiple `/finance/*` hubs create multiple valid “entry” routes into the same business area.
- `Growth` is a top-level category, but its underlying work is split across `/marketing`, `/social`, `/network`, and `/analytics`, so the top-level route is broader than any one concrete workflow.

## Information Architecture Risks

### 1. Too many legitimate entry points for the same domain

This improves discoverability, but it also makes the system harder to explain. A user can learn a workflow in one place and fail to realize it also lives somewhere else.

### 2. Top-level simplicity can hide system complexity

The primary sidebar looks manageable, but the grouped navigation exposes a very large route universe. That gap can create a false impression that some features do not exist.

### 3. Settings and operational tools are mixed into domain navigation

Some settings-like pages sit inside domain groups, while other operational pages sit inside settings. This is workable, but not perfectly consistent.

### 4. Hidden routes remain part of the conceptual model

Because hidden items still exist in config, they can reappear in tooling, audits, or future surfaces unless explicitly governed.

### 5. Admin and chef flows share one nav config

This is efficient technically, but it raises long-term maintenance risk if future changes are made without strong visibility checks.

## Recommended Cleanup and Reorganization

### Keep top-level

These deserve strong visibility because they map to core daily business motion:

- Dashboard
- Inbox
- Events
- Clients
- Culinary
- Finance
- Operations

### Consider whether Growth should remain top-level

Growth is strategically important, but it is less concrete than the others. It may remain top-level if the product wants to emphasize business growth, but it is also a candidate to become a grouped domain rather than a pinned tab.

### Preserve Dinner Circles only if it is truly strategic

If Dinner Circles is a signature differentiator, it belongs top-level. If not, it could be folded into Growth, Network, or a collaboration domain. Right now it reads as intentionally promoted.

### Unify naming

Recommended naming cleanup targets:

- Pick one label for `Finance` vs `Money`
- Pick one label family for `Dinner Circles` vs `Circles`
- Reduce overlap between `Content Pipeline`, `Campaign Content`, and `Content Planner`
- Clarify whether `Financial Hub`, `Finance Home`, and `Finance` are meaningfully different or just multiple ways in

### Reduce hidden-nav ambiguity

Hidden routes should be documented as one of:

- internal-only
- legacy but preserved
- feature-flagged
- not ready for general navigation

Without that classification, future audits will keep treating them as possible surfaced pages.

### Separate product navigation from platform navigation

If the admin surface keeps growing, it may eventually deserve a more explicit separation from chef-facing product navigation, even if the underlying config remains shared.

## What the Navbar Optimizes For

At its best, the chef navbar optimizes for:

- getting a chef from login to the next urgent task quickly
- keeping client, event, and culinary work tightly connected
- exposing both front-of-house business work and back-office operations
- giving power users many access paths without blocking basic users

The cost of that strategy is duplication, complexity, and some naming inconsistency. That tradeoff is visible across the current system.

## How a Chef Uses This in a Real Day

A typical day starts in Dashboard, Inbox, or Daily View. From there the chef moves into Events for what is happening today, Clients for follow-up and relationship work, Culinary for menu/prep/costing work, Finance for invoices or expenses, and Operations for staffing and tasks. Growth, Analytics, Network, and most settings pages matter less as minute-to-minute destinations and more as planning, optimization, or maintenance surfaces.

## Dependency and Module Notes

Some navigation areas are more sensitive to configuration, integrations, or enabled product modules than others.

### High-dependency areas

- Finance: often depends on payment configuration, ledger integrity, Stripe-related setup, tax workflows, and reporting data quality.
- Calendar and scheduling: depends on calendar sync, availability rules, and event data integrity.
- Culinary costing and price catalog: depends on pricing data, ingredient normalization, and supplier/catalog coverage.
- Notifications and inbox utilities: depend on communication pipelines and notification routing.
- Integrations pages: depend on external platform setup and credential state.
- Protection and compliance pages: depend on business setup completeness and operator maintenance.

### Lower-dependency areas

- Dashboard as a frame: still useful even if some widgets degrade.
- Clients as a directory and CRM shell.
- Events as a core workflow hub.
- Tasks and staff coordination as basic internal operations.

### Why this matters

When a navigation item points into a high-dependency area, the route may be valid while the page still feels “broken” to the user if the underlying setup is incomplete. Documentation should distinguish between:

- route exists
- page renders
- page is useful without setup
- page becomes valuable only after configuration

## Destination Type Classification

Not every nav destination is the same kind of page. Distinguishing destination type helps with IA decisions.

### Hub pages

These are major entry points into a domain:

- `/dashboard`
- `/clients`
- `/events`
- `/culinary`
- `/financials`
- `/operations`
- `/loyalty`
- `/inventory`
- `/marketing`
- `/network`
- `/settings`

### Workflow pages

These are active work surfaces where the chef performs ongoing tasks:

- `/inbox`
- `/queue`
- `/tasks`
- `/calendar`
- `/culinary/prep`
- `/quotes`
- `/inquiries`
- `/proposals/builder`
- `/staff/schedule`
- `/inventory/counts`

### Create or wizard pages

These are creation-focused destinations:

- `/events/new`
- `/events/new/wizard`
- `/clients/new`
- `/quotes/new`
- `/inquiries/new`
- `/menus/new`
- `/recipes/new`
- `/expenses/new`
- `/inventory/audits/new`
- `/inventory/purchase-orders/new`

### Filtered or status pages

These are subsets of a larger workflow:

- `/events/awaiting-deposit`
- `/events/completed`
- `/quotes/accepted`
- `/quotes/expired`
- `/leads/qualified`
- `/clients/active`
- `/clients/inactive`
- `/finance/invoices/overdue`

### Settings or configuration pages

These control system behavior rather than day-to-day execution:

- `/settings/menu-engine`
- `/settings/integrations`
- `/settings/calendar-sync`
- `/settings/stripe-connect`
- `/settings/protection`
- `/settings/repertoire`
- `/settings/contracts`

## Navigation Governance Guidelines

If this navbar continues to grow, it needs rules. These are the minimum sensible rules.

### Add a top-level tab only if all are true

- The destination is used frequently.
- It represents a distinct business domain, not just a subtask.
- It would otherwise require too many clicks from the most common workflows.
- It has stable long-term value and is not a temporary initiative.

### Add a grouped item if any are true

- The workflow is important but not constant.
- The page belongs clearly to one domain.
- The route is valid and user-meaningful but does not justify top-level prominence.

### Avoid adding nav items when

- The route is just one status filter of a larger page.
- The page exists mainly for setup or one-time onboarding.
- The page is unfinished, experimental, or internally confusing.
- The same workflow is already easy to reach elsewhere.

### Naming rule

A label should tell the user:

- what business area they are entering
- what kind of work happens there
- whether it is a hub, a task, a report, or a setup page

## Testing Checklist for Navbar Changes

Any future nav change should be verified against this checklist.

### Visibility

- Confirm chef-facing users do not see admin-only items.
- Confirm admins do see admin items.
- Confirm hidden items remain hidden unless intentionally promoted.
- Confirm focus mode shows only intended groups.

### Routing

- Confirm every nav item leads to a valid route.
- Confirm active-state highlighting works on parent and child routes.
- Confirm query-string destinations still land in the intended state.
- Confirm create-dropdown links still point to working pages.

### Surface coverage

- Confirm desktop sidebar behavior.
- Confirm collapsed/rail navigation behavior.
- Confirm mobile default tabs.
- Confirm mobile custom tab selection behavior.
- Confirm action bar items.
- Confirm command palette discoverability if applicable.

### UX coherence

- Confirm naming is consistent with neighboring items.
- Confirm no domain appears accidentally duplicated without reason.
- Confirm high-frequency workflows remain easy to reach.
- Confirm lower-frequency setup pages do not crowd daily-driver surfaces.

## Metrics We Should Eventually Track

If the product wants to tune the navbar seriously, these metrics matter:

- Most-clicked top-level tabs
- Most-clicked grouped items
- Routes rarely used but prominently surfaced
- Routes heavily used but buried too deep
- Search/command-palette usage for destinations that are not pinned
- Mobile-tab customization patterns
- Drop-off after entering a hub
- Time from login to first meaningful navigation action

These would tell us whether the current navbar reflects actual use or just intended architecture.

## Open Questions

These are the main unresolved product questions the current navbar raises.

- Should Growth remain a top-level hub, or should its concrete parts stand on their own?
- Is Dinner Circles a permanent signature surface or a promoted feature that may later settle into another domain?
- Should Finance be labeled consistently everywhere instead of mixing `Finance` and `Money`?
- Should Culinary remain one broad umbrella, or should menus/recipes/prep/costing be separated more aggressively?
- How much admin navigation should remain co-located with chef navigation?
- Which hidden routes are intentionally hidden versus simply not yet curated?
- Which pages deserve action-bar exposure based on real usage rather than design intent?

## Suggested Next Deliverables

If this document is going to drive decisions, the next most useful artifacts are:

- A spreadsheet audit with one row per destination
- A duplicate/overlap matrix
- A proposed future-state navbar
- A mobile-only navigation audit
- A top-20 daily workflows map showing fastest route paths

## Expected Most Important Pages

This section is intentionally framed as expected importance, not measured usage. There are no live user-behavior metrics yet, so this is an architecture-based estimate of what should matter most to a real chef operator.

### Expected top 20 most important destinations

1. `/dashboard` — expected first-stop command center for daily awareness.
2. `/inbox` — expected high-frequency communications surface.
3. `/events` — expected core booking and execution workflow.
4. `/calendar` — expected daily planning and scheduling surface.
5. `/clients` — expected CRM backbone for relationship management.
6. `/inquiries` — expected first-contact sales funnel workflow.
7. `/quotes` — expected pricing and conversion workflow.
8. `/menus` — expected core menu-building and service-planning workspace.
9. `/recipes` — expected recipe reference and production workflow.
10. `/culinary/prep` — expected day-of and pre-service operational prep center.
11. `/financials` — expected business-health and financial-status overview.
12. `/expenses` — expected frequent finance action for operators tracking costs.
13. `/tasks` — expected execution tracking for the chef and staff.
14. `/staff` — expected team coordination workspace for operators with staff.
15. `/queue` — expected urgency-management surface for unresolved work.
16. `/notifications` — expected review point for alerts and system prompts.
17. `/clients/communication/follow-ups` — expected retention and relationship-maintenance queue.
18. `/inventory` — expected stock and purchasing anchor for kitchens with active inventory operations.
19. `/marketing` — expected recurring growth workspace, though likely less frequent than execution tools.
20. `/settings` — expected occasional but essential control point for configuration and personalization.

### Expected high-importance but not always daily

- `/proposals`
- `/loyalty`
- `/partners`
- `/inventory/purchase-orders`
- `/finance/invoices`
- `/analytics`
- `/social/planner`
- `/network`
- `/briefing`
- `/operations`

### Expected lower-frequency but still strategically important

- `/settings/integrations`
- `/settings/protection`
- `/finance/tax`
- `/finance/payroll`
- `/safety/claims`
- `/community/templates`
- `/surveys`
- `/admin` and related internal pages

## Expected Future-State Navbar Proposal

This section is not a recommendation based on user data. It is a reasoned proposal based on current information architecture, likely workflow importance, and the need to keep daily-driver work obvious.

### Expected future-state top-level desktop tabs

- Dashboard
- Inbox
- Events
- Clients
- Culinary
- Finance
- Operations
- Growth
- Dinner Circles
- Settings

### Why this expected top level works

- Dashboard, Inbox, Events, and Clients reflect the immediate operating loop.
- Culinary, Finance, and Operations represent the three biggest execution domains behind the scenes.
- Growth remains visible because the product clearly treats growth as strategic, but it should stay broad rather than overloaded.
- Dinner Circles stays visible only if the product intends it to remain a signature differentiator.
- Settings belongs in a permanent, obvious place because personalization and integrations are central to how the nav already works.

### Expected grouped domains under “Browse Everything”

- Analytics
- Clients
- Commerce
- Culinary
- Events
- Finance
- Marketing
- Network
- Operations
- Pipeline
- Protection
- Supply Chain
- Tools
- Admin

### Expected cleanup to support that future state

- Keep one clear canonical label for Finance across all surfaces.
- Keep one clear canonical label for Dinner Circles across all surfaces.
- Reduce repeated surface labels when they refer to the same workflow.
- Keep create flows out of primary nav unless they represent a full hub.
- Keep settings/config pages grouped consistently instead of scattering them unpredictably across operational domains.

### Expected domains that should not be top-level by default

- Protection
- Supply Chain
- Tools
- Analytics
- Commerce
- Network

These are important domains, but based on current structure they are better as grouped libraries unless future usage proves otherwise.

## Expected Mobile Navbar Strategy

This is also a design expectation, not a measured behavior model.

### Expected default mobile tabs

The current default mobile tabs are already directionally correct:

- Home
- Daily Ops
- Inbox
- Events
- Clients

That default favors immediate action over breadth, which is the right assumption for a mobile context.

### Expected best mobile customization options

The strongest optional mobile destinations are likely:

- Calendar
- Inquiries
- Menus
- Finance
- Queue

These feel like the best next-tier mobile candidates because they extend real task completion instead of only configuration.

### Expected mobile philosophy

Mobile should optimize for:

- checking what matters now
- responding quickly
- confirming or updating status
- capturing something fast
- handling communications and urgent ops

Mobile should not try to mirror the entire desktop sidebar. It should bias toward:

- Dashboard
- Inbox
- Events
- Clients
- Daily Ops
- Calendar
- Inquiries
- Queue
- Notifications

### Expected mobile anti-patterns

These should generally stay off the default mobile nav unless usage proves otherwise:

- deep settings pages
- low-frequency admin pages
- long-tail reporting views
- highly nested finance back-office pages
- rarely used utility/import routes

### Expected mobile quick actions

If mobile evolves further, the most logical quick actions would be:

- New Event
- New Inquiry
- New Client
- Add Expense
- Open Calendar
- Open Prep
- Open Queue

Those map well to in-the-moment operator behavior.

## Page-by-Page Summaries

### Primary Tabs and Top-Level Hubs

- `/dashboard`: Daily command center with widgets, metrics, alerts, and operational priorities.
- `/inbox`: Unified communication inbox for message triage, follow-up, and thread management.
- `/events`: Main event hub for booking status, execution readiness, money, and wrap-up.
- `/clients`: Main CRM directory and client-relationship workspace.
- `/circles`: Dinner circle hub for community, shared activity, and collaboration.
- `/culinary`: Culinary home for menus, recipes, costing, prep, and kitchen planning.
- `/financials`: Financial home for revenue, expense, invoice, and ledger visibility.
- `/operations`: Operational overview for staffing, queueing, tasks, and service-day execution.
- `/growth`: Growth overview tying together campaigns, network activity, and analytics.
- `/admin`: Admin overview for internal platform monitoring and controls.
- `/admin/pulse`: Admin live-operations and platform pulse page.
- `/admin/inquiries`: Admin-wide inquiries view across the platform.
- `/settings`: Settings landing page for business, profile, workflow, protection, and system configuration.

### Events and Scheduling Pages

- `/events/new`: Manual event creation.
- `/events/new/from-text`: Create an event from freeform text intake.
- `/events/new/wizard`: Guided event creation flow.
- `/events/board`: Kanban board for event pipeline management.
- `/events/upcoming`: Upcoming events status board.
- `/events/awaiting-deposit`: Events waiting on a deposit.
- `/events/cancelled`: Cancelled event archive.
- `/events/completed`: Completed event archive and review entry point.
- `/events/confirmed`: Confirmed events queue.
- `/calendar`: Main calendar view for event planning and rescheduling.
- `/calendar/day`: Single-day scheduling view.
- `/calendar/share`: Shareable calendar access and settings.
- `/calendar/week`: Weekly planning view.
- `/calendar/year`: Long-range annual calendar view.
- `/waitlist`: Waitlist management for event demand overflow.
- `/production`: Production-oriented event calendar.
- `/travel`: Travel planning and route coordination for event work.
- `/feedback`: Client feedback collection hub.
- `/feedback/dashboard`: Feedback metrics dashboard.
- `/feedback/requests`: Send feedback requests to clients.
- `/aar`: Event review and after-action review workspace.
- `/reviews`: Reviews management and social proof surface.

### Client and Guest Pages

- `/clients/new`: Create a new client profile.
- `/clients/active`: Active client list.
- `/clients/inactive`: Inactive or lapsed client list.
- `/clients/vip`: VIP client segment.
- `/clients/segments`: Segmented client views.
- `/clients/duplicates`: Duplicate-client cleanup and merge review.
- `/clients/gift-cards`: Gift card activity and tracking.
- `/clients/history`: Client interaction and service history hub.
- `/clients/history/event-history`: Past events grouped by client.
- `/clients/history/past-menus`: Menus previously served to clients.
- `/clients/history/spending-history`: Payment and spend history by client.
- `/clients/insights`: Client behavior and value insights.
- `/clients/insights/at-risk`: Clients showing churn or engagement risk.
- `/clients/insights/most-frequent`: Most frequent returning clients.
- `/clients/insights/top-clients`: Highest-value client list.
- `/clients/intake`: Client intake workflow and structured onboarding.
- `/clients/presence`: Real-time client portal presence and activity monitoring.
- `/clients/communication`: Communication workspace for notes and follow-up planning.
- `/clients/communication/notes`: Client notes and relationship log.
- `/clients/communication/follow-ups`: Follow-up queue for outreach.
- `/clients/communication/upcoming-touchpoints`: Scheduled future touchpoints.
- `/clients/preferences`: Preference and dietary profile hub.
- `/clients/preferences/allergies`: Allergy tracking by client.
- `/clients/preferences/dietary-restrictions`: Dietary restriction tracking.
- `/clients/preferences/dislikes`: Client dislikes and avoid-list management.
- `/clients/preferences/favorite-dishes`: Favorite dishes and preference memory.
- `/clients/loyalty`: Loyalty overview page.
- `/clients/loyalty/points`: Point balances and point history.
- `/clients/loyalty/referrals`: Referral activity tied to loyalty.
- `/clients/loyalty/rewards`: Reward catalog and redemption surface.
- `/clients/recurring`: Recurring-client management and repeat-service workflow.
- `/guests`: Guest directory connected to clients and events.
- `/guest-analytics`: Guest insights and engagement trends.
- `/guest-leads`: Guest lead and future-conversion tracking.
- `/guests/reservations`: Reservation management.
- `/loyalty`: Loyalty program hub.
- `/loyalty/rewards/new`: Create a new reward.
- `/loyalty/settings`: Loyalty program settings.
- `/loyalty/raffle`: Raffle management for loyalty engagement.
- `/loyalty/learn`: Guidance and enablement for loyalty features.
- `/partners`: Referral and partner management hub.
- `/partners/new`: Add a new partner or referral source.
- `/partners/active`: Active referral partner list.
- `/partners/inactive`: Inactive partner list.
- `/partners/events-generated`: Events generated by partners.
- `/partners/referral-performance`: Partner attribution and performance.

### Inquiry, Sales, and Pipeline Pages

- `/inquiries`: Inquiry funnel hub.
- `/inquiries/new`: Manual inquiry creation.
- `/inquiries/awaiting-response`: Inquiries waiting on chef action.
- `/inquiries/awaiting-client-reply`: Inquiries waiting on client reply.
- `/inquiries/declined`: Declined inquiries.
- `/inquiries/menu-drafting`: Inquiries in menu-drafting stage.
- `/inquiries/sent-to-client`: Inquiries already sent onward to the client.
- `/quotes`: Quote hub.
- `/quotes/new`: Create a new quote.
- `/quotes/accepted`: Accepted quotes.
- `/quotes/draft`: Draft quotes.
- `/quotes/expired`: Expired quotes.
- `/quotes/rejected`: Rejected quotes.
- `/quotes/sent`: Sent quotes awaiting outcome.
- `/quotes/viewed`: Viewed quotes awaiting decision.
- `/leads`: Lead management hub.
- `/leads/new`: New leads queue.
- `/leads/contacted`: Contacted leads.
- `/leads/qualified`: Qualified leads.
- `/leads/converted`: Converted leads.
- `/leads/archived`: Archived leads.
- `/calls`: Calls and meetings hub.
- `/calls/new`: Schedule a new call or meeting.
- `/calls?status=scheduled`: Upcoming calls.
- `/calls?status=completed`: Completed calls.
- `/proposals`: Proposal hub.
- `/proposals/addons`: Proposal add-on management.
- `/proposals/builder`: Proposal builder.
- `/proposals/templates`: Proposal template library.
- `/contracts`: Contract management.
- `/settings/contracts`: Contract template settings.
- `/rate-card`: Pricing reference sheet.
- `/testimonials`: Testimonial management and approval.
- `/consulting`: Consulting workflow and pricing support.
- `/marketplace`: Marketplace command center.
- `/marketplace/capture`: Capture a live marketplace page.
- `/availability`: Broadcast availability for demand capture.
- `/prospecting`: Prospecting hub for outbound work.
- `/prospecting/scrub`: AI-assisted prospect cleanup.
- `/prospecting/queue`: Prospect call queue.
- `/prospecting/scripts`: Call script library.
- `/prospecting/clusters`: Prospect segmentation clusters.
- `/prospecting/import`: Import outbound lead lists.
- `/prospecting/pipeline`: Prospecting pipeline board.
- `/wix-submissions`: Website or Wix submission intake.

### Culinary, Menu, and Recipe Pages

- `/menus`: Menu hub and library.
- `/menus/new`: Create a new menu.
- `/menus/upload`: Upload a menu file.
- `/menus/estimate`: Quick menu estimate page.
- `/menus/dishes`: Dish index and dish management.
- `/menus/tasting`: Tasting-menu workspace.
- `/culinary/menus`: Full culinary menu library.
- `/culinary/menus/approved`: Approved menus.
- `/culinary/menus/drafts`: Draft menus.
- `/culinary/menus/engineering`: Menu engineering workspace.
- `/culinary/menus/scaling`: Menu scaling and guest-count adaptation.
- `/culinary/menus/substitutions`: Menu substitutions planning.
- `/culinary/menus/templates`: Menu templates.
- `/culinary/dish-index`: Dish catalog across menus.
- `/culinary/dish-index/insights`: Dish-level insight and performance analysis.
- `/recipes`: Recipe hub.
- `/recipes/new`: New recipe creation.
- `/recipes/import`: Recipe import workspace.
- `/recipes/sprint`: Fast recipe-creation sprint workflow.
- `/recipes/dump`: Brain-dump capture for recipe ideas.
- `/recipes/photos`: Step-photo and visual recipe uploads.
- `/recipes/production-log`: Recipe production log.
- `/culinary/recipes`: Recipe library.
- `/culinary/recipes/dietary-flags`: Recipes filtered by dietary tags.
- `/culinary/recipes/drafts`: Draft recipes.
- `/culinary/recipes/seasonal-notes`: Seasonal recipe notes.
- `/culinary/recipes/tags`: Recipe tag management.
- `/culinary/components`: Reusable culinary component hub.
- `/culinary/components/ferments`: Ferments library.
- `/culinary/components/garnishes`: Garnishes library.
- `/culinary/components/sauces`: Sauces library.
- `/culinary/components/shared-elements`: Shared prep elements library.
- `/culinary/components/stocks`: Stocks and broths library.
- `/culinary/costing`: Costing hub.
- `/culinary/costing/food-cost`: Food-cost analysis page.
- `/culinary/costing/menu`: Menu-cost analysis.
- `/culinary/costing/sales`: Sale-driven ingredient opportunity view.
- `/culinary/costing/recipe`: Recipe-cost analysis.
- `/culinary/price-catalog`: Ingredient and price catalog.
- `/recipes/ingredients`: Ingredient-oriented recipe workspace.
- `/culinary/ingredients`: Ingredient database.
- `/culinary/ingredients/receipt-scan`: Receipt scanning into ingredient records.
- `/culinary/ingredients/seasonal-availability`: Seasonal ingredient availability reference.
- `/culinary/ingredients/vendor-notes`: Vendor notes attached to ingredients.
- `/culinary/prep`: Prep workspace.
- `/culinary/prep/timeline`: Prep timeline planner.
- `/culinary/prep/shopping`: Shopping list page tied to prep planning.
- `/culinary-board`: Culinary board for workflow and ideation.
- `/culinary/my-kitchen`: Personal kitchen workspace.
- `/culinary/substitutions`: General substitutions workspace.
- `/culinary/vendors`: Vendor directory for culinary sourcing.
- `/settings/menu-engine`: Menu engine settings.
- `/settings/repertoire`: Seasonal palettes and repertoire planning.

### Finance Pages

- `/expenses`: Expense hub.
- `/expenses/new`: Quick expense entry.
- `/receipts`: Receipt library.
- `/financials`: Financial summary hub.
- `/finance`: Finance home.
- `/finance/overview`: Finance overview dashboard.
- `/finance/overview/outstanding-payments`: Outstanding payments view.
- `/finance/overview/revenue-summary`: Revenue summary.
- `/finance/overview/cash-flow`: Cash-flow overview page.
- `/finance/goals`: Financial goals planning.
- `/finance/forecast`: Financial forecasting hub.
- `/finance/cash-flow`: Cash-flow forecast page.
- `/finance/contractors`: Contractor and 1099 tracking.
- `/finance/planning/break-even`: Break-even analysis tool.
- `/finance/expenses`: Expenses by category.
- `/finance/expenses/food-ingredients`: Food and ingredient expenses.
- `/finance/expenses/labor`: Labor expenses.
- `/finance/expenses/marketing`: Marketing expenses.
- `/finance/expenses/miscellaneous`: Miscellaneous expenses.
- `/finance/expenses/rentals-equipment`: Rentals and equipment expenses.
- `/finance/expenses/software`: Software and subscription expenses.
- `/finance/expenses/travel`: Travel expenses.
- `/finance/plate-costs`: Plate-cost analysis.
- `/finance/invoices`: Invoice hub.
- `/finance/invoices/draft`: Draft invoices.
- `/finance/invoices/sent`: Sent invoices.
- `/finance/invoices/paid`: Paid invoices.
- `/finance/invoices/overdue`: Overdue invoices.
- `/finance/invoices/refunded`: Refunded invoices.
- `/finance/invoices/cancelled`: Cancelled invoices.
- `/finance/recurring`: Recurring invoice management.
- `/finance/ledger`: Ledger overview.
- `/finance/ledger/adjustments`: Ledger adjustments.
- `/finance/ledger/transaction-log`: Transaction log.
- `/payments/splitting`: Payment-splitting workflow.
- `/finance/payments`: Payments hub.
- `/finance/payments/deposits`: Deposit management.
- `/finance/payments/failed`: Failed payments.
- `/finance/payments/installments`: Installment payment plans.
- `/finance/payments/refunds`: Refund operations.
- `/finance/disputes`: Payment dispute handling.
- `/finance/retainers`: Retainer tracking.
- `/finance/retainers/new`: Create a new retainer.
- `/finance/payouts`: Payout hub.
- `/finance/payouts/manual-payments`: Manual payout entry and review.
- `/finance/payouts/reconciliation`: Payout reconciliation.
- `/finance/payouts/stripe-payouts`: Stripe payout history.
- `/finance/bank-feed`: Bank-feed review page.
- `/finance/payroll`: Payroll hub.
- `/finance/payroll/941`: Form 941 filing.
- `/finance/payroll/employees`: Employee payroll records.
- `/finance/payroll/run`: Run payroll.
- `/finance/payroll/w2`: W-2 forms.
- `/finance/reporting`: Financial reporting hub.
- `/finance/reporting/expense-by-category`: Expense reporting by category.
- `/finance/reporting/profit-loss`: Profit and loss report.
- `/finance/reporting/profit-by-event`: Profit by event report.
- `/finance/reporting/revenue-by-client`: Revenue by client report.
- `/finance/reporting/revenue-by-event`: Revenue by event report.
- `/finance/reporting/revenue-by-month`: Revenue by month report.
- `/finance/reporting/year-to-date-summary`: Year-to-date summary report.
- `/finance/reporting/tax-summary`: Tax summary report.
- `/finance/sales-tax`: Sales-tax hub.
- `/finance/sales-tax/remittances`: Tax remittances.
- `/finance/sales-tax/settings`: Sales-tax settings.
- `/finance/tax`: Tax center.
- `/finance/tax/1099-nec`: 1099-NEC workflow.
- `/finance/tax/depreciation`: Depreciation tracking.
- `/finance/tax/home-office`: Home-office tax tracking.
- `/finance/tax/quarterly`: Quarterly tax estimates.
- `/finance/tax/retirement`: Retirement-related tax planning.
- `/finance/tax/year-end`: Year-end tax package.
- `/finance/year-end`: Year-end close process.

### Operations, Staff, and Execution Pages

- `/daily`: Daily operations view for planning and handoff.
- `/briefing`: Morning briefing and daily summary.
- `/operations`: Operations overview.
- `/queue`: Priority queue for urgent work.
- `/documents`: Documents hub.
- `/kitchen`: Kitchen mode for live service execution.
- `/operations/equipment`: Equipment management.
- `/operations/kitchen-rentals`: Kitchen rentals management.
- `/meal-prep`: Meal-prep hub.
- `/scheduling`: Scheduling workspace.
- `/staff`: Staff directory and workforce management.
- `/staff/availability`: Staff availability.
- `/staff/clock`: Clock in and out page.
- `/staff/labor`: Labor dashboard.
- `/staff/live`: Live staff activity board.
- `/staff/performance`: Staff performance metrics.
- `/staff/permissions`: Staff permission controls.
- `/staff/schedule`: Staff scheduling page.
- `/stations`: Station clipboards hub.
- `/stations/daily-ops`: Daily station operations page.
- `/stations/ops-log`: Operations log.
- `/stations/orders`: Order sheet.
- `/stations/waste`: Waste log.
- `/tasks`: Task management hub.
- `/tasks/gantt`: Gantt-style task planning.
- `/tasks/templates`: Task templates.
- `/tasks/va`: Virtual-assistant task queue.
- `/team`: Team-management page.

### Marketing, Network, and Growth Pages

- `/marketing`: Email campaign hub.
- `/marketing/content-pipeline`: Campaign-content planning.
- `/marketing/push-dinners`: Push-dinner campaign list.
- `/marketing/push-dinners/new`: New push-dinner campaign.
- `/marketing/sequences`: Outreach sequences.
- `/marketing/templates`: Marketing templates.
- `/content`: Content pipeline board.
- `/social`: Social media hub.
- `/social/planner`: Social post planner.
- `/social/calendar`: Content calendar.
- `/social/vault`: Media vault.
- `/social/connections`: Social platform connections.
- `/social/compose`: Social compose flow.
- `/social/settings`: Social queue settings.
- `/social/templates`: Social templates.
- `/social/hub-overview`: Dinner-circle related social overview.
- `/portfolio`: Event portfolio and showcase.
- `/reputation/mentions`: Brand mentions tracking.
- `/network`: Chef network hub.
- `/network/collabs`: Collaboration spaces.
- `/network/notifications`: Network notifications.
- `/network/saved`: Saved chef profiles.
- `/community/templates`: Community template library.
- `/charity`: Community impact hub.
- `/charity/hours`: Volunteer-hours log.
- `/analytics`: Source and business analytics home.
- `/analytics/benchmarks`: Business analytics benchmarks.
- `/analytics/client-ltv`: Client lifetime value analysis.
- `/analytics/demand`: Demand heatmap.
- `/analytics/pipeline`: Pipeline forecast.
- `/analytics/referral-sources`: Referral-source analysis.
- `/analytics/funnel`: Conversion funnel analysis.
- `/analytics/reports`: Custom reports.
- `/analytics/daily-report`: Daily report.
- `/goals`: Goal-tracking hub.
- `/goals/setup`: Goal setup.
- `/goals/revenue-path`: Revenue-path planning.
- `/insights`: Insights hub.
- `/insights/time-analysis`: Time-analysis page.
- `/intelligence`: Intelligence dashboard.
- `/reports`: General reporting entry point.
- `/surveys`: Survey analytics and review.

### Supply Chain and Inventory Pages

- `/inventory`: Inventory hub.
- `/inventory/demand`: Demand forecast page.
- `/inventory/expiry`: Expiry alerts.
- `/food-cost`: Food-cost hub.
- `/food-cost/revenue`: Daily revenue entry tied to food-cost tracking.
- `/inventory/food-cost`: Inventory-based food-cost analysis.
- `/inventory/counts`: Inventory counts page.
- `/inventory/audits`: Physical audits hub.
- `/inventory/audits/new`: Create a new audit.
- `/inventory/procurement`: Procurement hub.
- `/inventory/purchase-orders`: Purchase-order hub.
- `/inventory/purchase-orders/new`: Create a purchase order.
- `/vendors`: Purveyors and vendor directory.
- `/vendors/invoices`: Vendor invoices.
- `/vendors/price-comparison`: Vendor price-comparison page.
- `/inventory/staff-meals`: Staff-meals workflow.
- `/inventory/locations`: Storage-location management.
- `/inventory/transactions`: Inventory transaction ledger.
- `/inventory/vendor-invoices`: Vendor invoices tied to inventory workflows.
- `/inventory/waste`: Waste tracking.

### Protection, Settings, and Tooling Pages

- `/settings/integrations`: Integrations hub.
- `/settings/automations`: Automation settings.
- `/settings/calendar-sync`: Calendar sync settings.
- `/settings/custom-fields`: Custom-field settings.
- `/settings/embed`: Embed widget settings.
- `/settings/platform-connections`: Platform connection settings.
- `/settings/stripe-connect`: Stripe Connect settings.
- `/settings/api-keys`: API key settings.
- `/settings/webhooks`: Webhook settings.
- `/settings/yelp`: Yelp settings.
- `/settings/zapier`: Zapier settings.
- `/chat`: Messaging workspace.
- `/notifications`: Notification center.
- `/commands`: Quick commands launcher.
- `/remy`: Remy history and assistant activity.
- `/help`: Help center.
- `/help/food-costing`: Food-costing help guide.
- `/import`: Data-import hub.
- `/import/csv`: CSV import.
- `/import/history`: Import history.
- `/import/mxp`: MasterCook import.
- `/inbox/history-scan`: Inbox tooling and scan utilities.
- `/inbox/triage`: Message sorting and triage tool.
- `/activity`: Activity log.
- `/settings/protection`: Protection settings hub.
- `/settings/protection/continuity`: Business continuity plan.
- `/settings/protection/business-health`: Business health page.
- `/settings/protection/certifications`: Certifications settings.
- `/settings/protection/crisis`: Crisis-response planning.
- `/settings/protection/insurance`: Insurance settings and records.
- `/settings/protection/nda`: NDA and permissions settings.
- `/settings/protection/portfolio-removal`: Portfolio-removal handling.
- `/safety/backup-chef`: Backup-chef coverage planning.
- `/safety/incidents`: Incident hub.
- `/safety/incidents/new`: Report a new incident.
- `/safety/claims`: Insurance claims hub.
- `/safety/claims/documents`: Claim documents.
- `/safety/claims/new`: New insurance claim.

## Recommended Fields for a Future Audit Sheet

If this gets turned into a spreadsheet or PM artifact, these are the best columns:

- Surface
- Group
- Parent Tab
- Label
- Route
- Summary
- Admin Only
- Hidden
- Focus Mode Visible
- Mobile Default
- Mobile Optional
- Action Bar
- Create Dropdown
- Module Gated
- Duplicates / Alternate Entry Points
- Notes

## Best Next Step

If the goal is operational clarity, the next useful deliverable is not more raw inventory. It is a navbar audit table in this format:

`Surface | Group | Tab | Sub Tab | Route | Summary | Visibility | Notes`

That would make it easy to:

- identify duplicates
- find buried pages
- prune low-value entries
- decide what should stay top-level
- redesign mobile navigation cleanly
