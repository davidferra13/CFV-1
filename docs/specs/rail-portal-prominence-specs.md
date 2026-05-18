# Rail Portal Prominence Mini-Specs (NAV #3-6)

**Prerequisite:** NAV #2 (Rail Foundation) verified and passing.
**Architecture:** Registries already define all item types per role. Resolvers fetch live data to hydrate templates. Only chef and client resolvers exist today; staff, partner, and admin return `{}` (graceful degradation with static labels).

**Pattern:** Each resolver exports a single `resolve[Role]RailData(userId, tenantId)` function returning `RailResolverResult` (a `Record<string, Record<string, unknown>>`). Keys are definition IDs; values are template variable maps. The router in `lib/discovery/resolvers/index.ts` lazy-imports resolvers per role.

---

## NAV #3: Admin Portal Rail Prominence

**Goal:** Give admin users live, data-driven rail items for platform health, user activity, and system alerts so they stop manually checking 34+ admin modules.

**Resolver work:**

- [ ] Create `lib/discovery/resolvers/admin-resolver.ts` exporting `resolveAdminRailData(userId, tenantId)`
- [ ] Wire import into the `switch` block in `lib/discovery/resolvers/index.ts` for `case 'admin'`
- [ ] Implement these resolver groups (priority order):
  1. **System Health** (query `silent_failures`, build logs, uptime): `admin.system-health.error-rate-5xx`, `admin.system-health.build-status`, `admin.system-health.deploy-status`, `admin.system-health.db-connection-pool`
  2. **User Signups** (query `users` table for recent signups, pending verifications): `admin.user-mgmt.new-signup`, `admin.user-mgmt.pending-email-verification`
  3. **Abuse/Safety** (query `flagged_content`, `abuse_reports`): `admin.safety.abuse-report-open`, `admin.safety.spam-account-detected`
  4. **Pending Approvals** (query `chef_applications`, `partner_agreements`): `admin.chef-mgmt.application-pending`, `admin.partner-mgmt.agreement-pending-review`
  5. **Financial Alerts** (query `ledger_entries`, `stripe_events` for anomalies): `admin.billing.failed-payment`, `admin.billing.refund-requested`

**Registry work:**

- [ ] Registry already exists: `lib/discovery/registries/admin-rail-registry.ts` (152 items). No changes needed unless new item types are discovered during build.
- [ ] Verify tier assignments: System Health items should be tier 1 (always shown); BI/analytics items tier 2-3.

**Acceptance criteria:**

- [ ] Authenticated admin user sees live rail items on `/admin` dashboard
- [ ] 5xx errors, build failures, and abuse reports surface with high urgency
- [ ] Items are admin-only (no chef/client/staff data leaking into admin rail)
- [ ] Resolver gracefully returns `{}` on query failure (try/catch per group)
- [ ] Console clean, tsc clean

---

## NAV #4: Chef and Client Portal Rail Prominence

**Goal:** Enhance chef rail with missing resolver coverage; build out client rail to surface upcoming events, pending approvals, payment reminders, dietary form requests, and chef messages.

### Chef Rail Enhancement

**Resolver work:**

- [ ] Chef resolver exists (`lib/discovery/resolvers/chef-resolver.ts`) with 42 dispatched resolvers via `god-mode-dispatcher.ts`. Audit for gaps against the 226-item registry.
- [ ] Add resolvers for uncovered categories if found (likely: cannabis hub items, travel calendar items, capture items)
- [ ] Verify template hydration for all high-urgency items (baseUrgency >= 85)

**Registry work:**

- [ ] No registry changes expected; 226 items already defined in `chef-rail-registry.ts`

### Client Rail Enhancement

**Resolver work:**

- [ ] Enhance `lib/discovery/resolvers/client-resolver.ts` (currently covers events + unread messages)
- [ ] Add resolver logic for:
  1. **Menu Approval Pending** (query `menus` + `events` where status = 'proposed' and client hasn't approved): `client.menu_approval_pending`
  2. **Payment Reminders** (query `invoices` or `ledger_entries` for unpaid balances): `client.payment_reminder`, `client.deposit_due`
  3. **Dietary Form Requests** (query `dietary_form_requests` or event guest preferences pending): `client.dietary_form_request`
  4. **Upcoming Event Details** (already partial; ensure `client.event_today`, `client.event_tomorrow`, `client.event_this_week` all hydrate)
  5. **Chef Messages** (already partial via unread count; add `client.message_from_chef` with excerpt): `client.message_from_chef`
  6. **Contract Signing** (query events with unsigned contracts): `client.contract_pending`
  7. **Post-Event Feedback** (query completed events without client review): `client.feedback_requested`

**Registry work:**

- [ ] Review `lib/discovery/registries/client-rail-registry.ts` for completeness against resolver additions
- [ ] Add any missing item definitions (e.g., `client.dietary_form_request`, `client.contract_pending`, `client.feedback_requested` if absent)

**Acceptance criteria:**

- [ ] Chef rail: all 226 registry items have resolver coverage or are explicitly exempted
- [ ] Client rail: authenticated client sees upcoming events, pending quotes, payment status, dietary requests, and messages
- [ ] Client NEVER sees chef financial data, other clients' data, or admin items
- [ ] Chef NEVER sees raw client contact info beyond what the relationship permits
- [ ] Console clean, tsc clean

---

## NAV #5: Staff Portal Rail Conversion

**Goal:** Create a staff resolver that hydrates the 57 existing staff registry items with live shift, task, station, and event data so staff members see actionable items on their dashboard.

**Resolver work:**

- [ ] Create `lib/discovery/resolvers/staff-resolver.ts` exporting `resolveStaffRailData(userId, tenantId)`
- [ ] Wire import into `lib/discovery/resolvers/index.ts` for `case 'staff'`
- [ ] Implement resolver groups (priority order):
  1. **Shift and Schedule** (query `staff_assignments`, `staff_shifts`, `staff_clock_entries`): `staff.todays_shift`, `staff.clock_in_reminder`, `staff.clock_out_reminder`, `staff.schedule_change_alert`, `staff.availability_conflict`
  2. **Tasks and Delegation** (query `tasks` where assigned to staff): `staff.new_task_assigned`, `staff.task_due_soon`, `staff.task_overdue`, `staff.bulk_task_list`
  3. **Station Assignments** (query `staff_assignments` + `stations`): `staff.current_station`, `staff.station_prep_checklist`, `staff.station_equipment_check`
  4. **Event Context** (query `events` + `dietary_restrictions` + `menus`): `staff.today_event_summary`, `staff.event_dietary_alerts`, `staff.event_timeline`
  5. **Communication** (query `notifications`, `chat_messages`): `staff.message_from_chef`, `staff.team_announcement`

**Registry work:**

- [ ] Registry already complete: `lib/discovery/registries/staff-rail-registry.ts` (57 items across 10 categories). No changes needed.
- [ ] Verify tier assignments: safety items (dietary alerts, allergens) tier 1; schedule items tier 1-2; onboarding items tier 3.

**Data access pattern:**

- All queries scoped by `tenantId` (staff sees only their tenant's data)
- Staff NEVER sees: client financials, business metrics, pricing data, other staff pay rates
- Use `staff_assignments` table as the join key (staff only sees events/tasks they are assigned to)

**Acceptance criteria:**

- [ ] Authenticated staff user sees live shift info, assigned tasks, and station prep on dashboard
- [ ] Dietary alerts surface with highest urgency (baseUrgency 96) during event windows
- [ ] Clock in/out reminders appear within 30 minutes of shift boundaries
- [ ] Staff sees only their own assignments and tenant-scoped data
- [ ] Console clean, tsc clean

---

## NAV #6: Partner and Vendor Portal Rail Standardization

**Goal:** Create a partner resolver that hydrates the 76 existing partner registry items with live referral, co-hosting, vendor collaboration, and compliance data.

**Resolver work:**

- [ ] Create `lib/discovery/resolvers/partner-resolver.ts` exporting `resolvePartnerRailData(userId, tenantId)`
- [ ] Wire import into `lib/discovery/resolvers/index.ts` for `case 'partner'`
- [ ] Implement resolver groups (priority order):
  1. **Referral Tracking** (query `referral_attributions`, `partner_commissions`, `partner_payouts`): `partner.referral_converted`, `partner.referral_pending`, `partner.referral_payout_ready`, `partner.referral_earning_created`
  2. **Co-hosting and Venue** (query `events` + `partner_locations` + `collaboration_tasks`): `partner.cohost_event_upcoming`, `partner.cohost_event_readiness`, `partner.venue_availability_request`, `partner.cohost_task_assigned`
  3. **Vendor/Supplier** (query `supplier_requests`, `delivery_schedule`, `vendor_invoice_records`): `partner.supplier_order_request`, `partner.supplier_delivery_window`, `partner.supplier_invoice_ready`, `partner.supplier_shortage_alert`
  4. **Compliance** (query `partner_agreements`, `partner_compliance_documents`): `partner.partnership_agreement_expiring`, `partner.insurance_certificate_needed`, `partner.health_inspection_due`
  5. **Communication** (query `partner_messages`, `collaboration_threads`): `partner.message_from_chef_partner`, `partner.cohost_planning_thread_update`
  6. **Ticket Sales** (query `event_tickets`, `event_distribution`): `partner.cohost_ticket_sales_progress`, `partner.cohost_ticket_sales_stalled`

**Registry work:**

- [ ] Registry already complete: `lib/discovery/registries/partner-rail-registry.ts` (76 items across 12 categories). No changes needed.
- [ ] Verify privacy: all items use `role_scoped` privacy (partner sees only their own referrals, their own venues, their own events)

**Data access pattern:**

- Partner queries scoped by partner ID (from `referral_partners` table linked to user)
- Venue partners see co-hosting + location items; referral-only partners see referral + commission items
- Partner NEVER sees: other partners' data, chef internal financials, client PII beyond first name
- Vendor items (`supplier_*`) only resolve for partners with `partner_type = 'vendor'` or `'supplier'`

**Acceptance criteria:**

- [ ] Authenticated partner sees referral stats, upcoming co-hosted events, and compliance deadlines
- [ ] Vendor-type partners see order requests, delivery windows, and invoice status
- [ ] Referral-type partners see conversion tracking, earnings, and payout readiness
- [ ] Payout method missing surfaces as high-urgency blocker (baseUrgency 90)
- [ ] Partner sees only their own scoped data; no cross-partner or cross-tenant leakage
- [ ] Console clean, tsc clean

---

## Implementation Order

1. **NAV #5 (Staff)** first: simplest data model (tenant-scoped, single join key), smallest registry (57 items), good template for the others
2. **NAV #3 (Admin)** second: system-scoped queries, no tenant join needed, high diagnostic value
3. **NAV #4 (Chef + Client)** third: chef is enhancement of existing 42-resolver system; client extends existing resolver
4. **NAV #6 (Partner)** last: most complex scoping (partner type determines visible items), largest registry (76 items), depends on co-hosting and vendor tables

## Shared Patterns

All new resolvers must follow:

- `try/catch` per query group (one failing group must not break others)
- Return `{}` on total failure (graceful degradation to static labels)
- Use `Promise.all` for independent query groups
- Scope all queries by `tenantId` (staff) or partner ID (partner) or system (admin)
- No N+1 queries; batch-fetch related records
- Log errors via `console.error('[resolve{Role}RailData]', err)` matching existing pattern
