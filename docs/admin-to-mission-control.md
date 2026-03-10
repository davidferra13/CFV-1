# Admin-to-Mission-Control Migration

## Overview

Moving admin features from the main ChefFlow app (`/admin/*` routes) into Mission Control (localhost:41937). This keeps the main app as a pure chef product and consolidates ops tooling where it belongs.

## Phase 1: Daily-Use Admin Tools (Complete)

Five panels added to Mission Control:

### 1. Users Panel (`panel-admin-users`)

- **API:** `GET /api/admin/users`
- **Shows:** All chefs with event count, client count, GMV, signup date
- **Replaces:** `/admin/users` in the main app
- **Data source:** `chefs`, `events`, `clients`, `ledger_entries` tables

### 2. Feature Flags Panel (`panel-admin-flags`)

- **API:** `GET /api/admin/flags`, `POST /api/admin/flags` (toggle)
- **Shows:** Grid of all chefs x all flags with toggle switches
- **Replaces:** `/admin/flags` in the main app
- **Data source:** `chef_feature_flags` table
- **Known flags:** `ai_pricing_suggestions`, `ai_menu_recommendations`, `social_platform`, `advanced_analytics`, `beta_features`

### 3. Gmail Sync Panel (`panel-admin-gmail`)

- **API:** `GET /api/admin/gmail-sync`
- **Shows:** Connection status per chef, emails synced, error count, error rate, last sync time
- **Replaces:** `/admin/gmail-sync` in the main app
- **Data source:** `gmail_sync_log`, `google_connections`, `chefs` tables

### 4. System Health Panel (`panel-admin-health`)

- **API:** `GET /api/admin/health`
- **Shows:** Table row counts (chefs, clients, events, ledger, inquiries, messages), zombie events, orphaned clients, QOL metrics (last 30 days)
- **Replaces:** `/admin/system` in the main app
- **Data source:** All core tables + `qol_metric_events`

### 5. Errors Panel (`panel-admin-errors`)

- **API:** `GET /api/admin/errors`
- **Shows:** Aggregated errors from 4 sources (notifications, Gmail sync, Remy, automations) with source badges, chef names, timestamps, and error messages
- **Replaces:** `/admin/errors` in the main app
- **Data source:** `notification_delivery_log`, `gmail_sync_log`, `remy_action_audit_log`, `automation_execution_log`

## Architecture

- All endpoints use the existing `supabaseQuery()` helper in `server.mjs`
- Queries use Supabase service role key (bypasses RLS, admin-only by nature since MC is local)
- Panels follow the existing MC pattern: lazy-loaded on first nav click, vanilla HTML/JS rendering
- No React, no Next.js, no build step

## Phase 2: Platform Visibility (Complete)

### 6. All Events (`panel-admin-events`)

- **API:** `GET /api/admin/events`
- **Shows:** All events across all chefs with status distribution badges, occasion, date, guest count, quoted price
- **Replaces:** `/admin/events`

### 7. All Inquiries (`panel-admin-inquiries`)

- **API:** `GET /api/admin/inquiries`
- **Shows:** All inquiries with client name/email, chef, occasion, status, lead score (GOLDMINE), guest count
- **Replaces:** `/admin/inquiries`

### 8. All Quotes (`panel-admin-quotes`)

- **API:** `GET /api/admin/quotes`
- **Shows:** All quotes with chef, event occasion, status, total amount
- **Replaces:** `/admin/quotes`

### 9. Platform Analytics (`panel-admin-analytics`)

- **API:** `GET /api/admin/analytics`
- **Shows:** KPI cards (total chefs, clients, platform GMV, this month GMV), monthly GMV bar chart, monthly signups chart (last 12 months)
- **Replaces:** `/admin/analytics`

### 10. Platform Financials (`panel-admin-financials`)

- **API:** `GET /api/admin/financials`
- **Shows:** KPI cards (GMV all-time, GMV this month, expenses all-time, expenses this month), recent ledger entries with payment/expense indicators
- **Replaces:** `/admin/financials`

## Phase 3: Audit and Compliance (Complete)

### 11. Audit Log (`panel-admin-audit`)

- **API:** `GET /api/admin/audit`
- **Shows:** Admin actions with actor email, action type badges, target info, details JSON. Gracefully handles missing table.
- **Replaces:** `/admin/audit`

### 12. Remy Activity (`panel-admin-remy`)

- **API:** `GET /api/admin/remy-activity`
- **Shows:** Per-chef Remy usage summary: total actions, success/error counts, error rate, top task types, last action time
- **Replaces:** `/admin/remy-activity`

### 13. Notifications (`panel-admin-notifs`)

- **API:** `GET /api/admin/notifications`
- **Shows:** All notifications with category/action badges, read/unread status, chef names, body preview. Category distribution summary.
- **Replaces:** `/admin/notifications`

### 14. Sessions (`panel-admin-sessions`)

- **API:** `GET /api/admin/sessions`
- **Shows:** KPI cards (active 7d, inactive, never active), per-user session info with role, status, activity count, last active
- **Replaces:** `/admin/sessions`

### 15. SLA Tracking (`panel-admin-sla`)

- **API:** `GET /api/admin/sla`
- **Shows:** Platform-wide SLA grade (A-F) with average response time, per-chef breakdown with grade badges, response time buckets (<1h, <24h, >24h)
- **Replaces:** `/admin/sla`

## Remaining Phases

- **Phase 4:** Low-priority pages (Loyalty, Beta, Subscriptions, Chef Health, etc.) - migrate only if actively used
- **Phase 5:** Cleanup (remove `/admin/*` routes from main app, update nav-config) - after confirming MC panels work well

## What Stays in the Main App

- All chef features (dashboard, events, clients, quotes, recipes, etc.)
- `isAdmin()` bypass for Pro tier gating
- Client and staff portals (unchanged)
