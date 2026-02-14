# Chef Portal Scope Lock Reference (V1)

This document is the **definitive boundary** for what is included and excluded from Chef Portal V1. It serves as the final arbiter for scope disputes and feature requests.

If something is not in this document, it is **out of scope for V1**.

---

## 1) V1 Scope Lock Commitment

**The Chef Portal V1 scope is locked as of [2026-02-13].**

Any change to this scope requires:
1. Explicit approval from product owner
2. Update to this document with versioning
3. Impact analysis on delivery timeline
4. Verification that the change doesn't violate core principles (determinism, tenant isolation, ledger-first, etc.)

**Scope creep is the primary risk to V1 completion. This document prevents it.**

---

## 2) Included in V1 (Locked Features)

### 2.1 Authentication & Authorization

✅ **Included:**
- Supabase Auth integration (email/password)
- `user_roles` table for role mapping
- Role-based routing (`chef`, `chef_subaccount`, `client`)
- Middleware enforcement
- Server layout gating
- Database RLS for tenant isolation

❌ **Excluded:**
- OAuth providers (Google, GitHub, etc.)
- Magic link login
- Multi-factor authentication (MFA)
- SSO / SAML
- Complex role hierarchies

---

### 2.2 Tenant Model

✅ **Included:**
- Single-tenant isolation via `tenant_id`
- RLS deny-by-default on all tables
- Chef as tenant owner
- Tenant-scoped storage (if storage is used)

❌ **Excluded:**
- Multi-tenant aggregation or reporting
- Shared clients between tenants
- Tenant-to-tenant referrals or collaboration

---

### 2.3 Client Management

✅ **Included:**
- Create client profile (minimal fields: name, email, phone, notes)
- Edit client profile
- Chef-private notes (separate from client-visible data)
- Client invite generation (token-based)
- Invite acceptance and linking
- Client event history view
- Soft delete clients

❌ **Excluded:**
- Client import from CSV
- Client merge automation (AI-suggested duplicates)
- Client segmentation or tags (beyond simple internal notes)
- Client communication tools (email/SMS within app)

---

### 2.4 Event Lifecycle

✅ **Included:**
- 8-state event lifecycle (draft → proposed → deposit_pending → confirmed → menu_in_progress → menu_locked → executed → closed)
- Finite state machine with transition map
- Server-enforced transitions via `transitionEvent()` function
- Immutable `event_transitions` audit log
- Event calendar view with time blocks
- Overlap detection and prevention (server-side)
- Cancel event (terminal transition)
- Soft delete events (if no payments)

❌ **Excluded:**
- Custom lifecycle states per tenant
- Auto-transition based on time (e.g., auto-close after 30 days)
- Complex scheduling (recurring events, series)
- External calendar sync (Google Calendar, Outlook)

---

### 2.5 Menu System

✅ **Included:**
- Menu templates (reusable drafts)
- Event-linked menus
- Menu sections and items
- Allergen and dietary tags (simple text fields)
- Draft and locked states
- Immutable version history (after lock)
- Duplicate menu template
- Client-safe menu projection (separate view for Client Portal)

❌ **Excluded:**
- Recipe costing / ingredient-level pricing
- Inventory management
- Nutritional analysis
- Supplier integration
- Menu PDF export (beyond basic print view)

---

### 2.6 Financial System (Ledger-First)

✅ **Included:**
- Append-only `ledger_entries` table
- 7 entry types: `charge_pending`, `charge_succeeded`, `charge_failed`, `refund_pending`, `refund_succeeded`, `refund_failed`, `adjustment`
- Payment state derived from ledger (not stored separately)
- Event financial summary (sum of ledger entries)
- Stripe integration (per-tenant Connect if required, or single account)
- Webhook ingestion (Stripe events → ledger entries)
- Idempotency by Stripe event ID
- Manual adjustment entry (audited)

❌ **Excluded:**
- General ledger / double-entry bookkeeping
- P&L statements
- Balance sheets
- Tax calculation or reporting
- Multi-currency support
- Subscription billing
- Automated vendor payouts

---

### 2.7 Stripe Integration

✅ **Included:**
- Webhook receiver (`/api/webhooks/stripe`)
- Signature verification
- Idempotency enforcement (dedupe by Stripe event ID)
- Payment Intent creation for deposits
- Ledger append on webhook success
- Stripe Connect setup (if per-tenant; otherwise single account)

❌ **Excluded:**
- Stripe Billing / Subscriptions
- Stripe Invoicing
- Stripe Terminal (in-person payments)
- Stripe Radar (fraud detection)
- Multi-currency or international payments

---

### 2.8 Audit & Immutability

✅ **Included:**
- `event_transitions` table (immutable, append-only)
- `ledger_entries` table (immutable, append-only)
- Audit logs for critical actions (event create, status change, invite create, etc.)
- Database triggers to prevent UPDATE/DELETE on immutable tables
- Traceability (who, what, when) on all critical actions

❌ **Excluded:**
- Full audit trail for every table and column
- Audit log search and filtering UI (basic view only in V1)
- Compliance certifications (SOC 2, GDPR tooling)

---

### 2.9 Dashboard

✅ **Included:**
- High-level summary cards (events by status, recent payments, at-risk items)
- Next actions list (deposit pending, menu needed, upcoming events)
- Recent activity feed (last 10 events or client actions)

❌ **Excluded:**
- Charts and graphs (revenue over time, etc.)
- Predictive analytics (forecasted revenue, churn risk)
- Customizable dashboard widgets

---

### 2.10 Settings

✅ **Included:**
- Tenant profile (business name, contact info, timezone)
- User profile (name, email, password change)
- Stripe connection setup
- Minimal notification preferences (if implemented)

❌ **Excluded:**
- Team management (user invites, permissions builder)
- Custom branding / white-label
- Workflow customization (custom fields, custom lifecycle)

---

## 3) Explicitly Excluded from V1

### 3.1 Integrations

❌ **All excluded except Stripe:**
- Google Calendar sync
- Outlook sync
- QuickBooks sync
- Zapier
- Mailchimp
- Slack
- SMS providers (Twilio, etc.)

**Rationale:** V1 focuses on core operations. Integrations are V2.

---

### 3.2 Advanced Features

❌ **All excluded:**
- AI/ML features (pricing suggestions, demand prediction)
- Real-time collaboration (multiple users editing same event)
- Mobile native apps (iOS, Android)
- Offline mode
- Advanced reporting (custom reports, export builder)
- Loyalty points system (if not already implemented)

**Rationale:** These add significant complexity and are not required for the core operational loop.

---

### 3.3 Social / Marketplace Features

❌ **All excluded:**
- Chef discovery (public chef profiles)
- Reviews and ratings
- Referral networks
- Community forums
- Social sharing

**Rationale:** ChefFlow V1 is an operations tool, not a marketplace or social platform.

---

## 4) Scope Decision Framework

When a feature request arises, apply this decision tree:

```
1. Is it required for the core operational loop?
   (clients → events → menus → payments → audit)
   ├─ Yes → Proceed to step 2
   └─ No → OUT OF SCOPE for V1

2. Is it server-authoritative and deterministic?
   (No client-trusted logic, no "best guesses")
   ├─ Yes → Proceed to step 3
   └─ No → OUT OF SCOPE for V1

3. Is it tenant-isolated and RLS-enforceable?
   (No cross-tenant features, no aggregation)
   ├─ Yes → Proceed to step 4
   └─ No → OUT OF SCOPE for V1

4. Is it ledger-compatible (for financial features)?
   (No rewriting history, append-only)
   ├─ Yes → Proceed to step 5
   └─ No → OUT OF SCOPE for V1

5. Does it add <2 weeks of implementation time?
   ├─ Yes → CONSIDER for V1 (requires approval)
   └─ No → DEFER to V2
```

---

## 5) Scope Change Control Process

If a feature must be added to V1 after scope lock:

### 5.1 Proposal Requirements

1. **Written justification** — Why is this critical for V1?
2. **Impact analysis** — What other features does this affect?
3. **Timeline estimate** — How much time will this add?
4. **Risk assessment** — Does this violate any core principles?

### 5.2 Approval Process

1. Submit proposal to product owner
2. Product owner reviews against scope lock
3. If approved:
   - Update this document with new feature
   - Update implementation checklist
   - Communicate timeline impact to stakeholders
4. If rejected:
   - Document as "deferred to V2"
   - Do not revisit during V1 development

---

## 6) V1 Completion Definition

Chef Portal V1 is **complete** when:

### 6.1 Functional Completeness

✅ All features in Section 2 are implemented and tested
✅ All verification scripts pass (RLS, immutability, migrations)
✅ Middleware and layout gating prevent wrong-portal access
✅ Ledger-first financial truth is provable
✅ Event lifecycle transitions are server-enforced and audited
✅ Tenant isolation is verified (no cross-tenant data leaks)

### 6.2 Operational Readiness

✅ Chef can complete the full workflow:
   - Create client profile
   - Create event
   - Transition event through lifecycle
   - Create and lock menu
   - Request and receive deposit payment
   - View financial ledger
   - Close event

✅ No critical bugs or data corruption issues
✅ Performance is acceptable (< 500ms for typical operations)
✅ Error handling is graceful (no crashes, clear error messages)

### 6.3 Documentation Completeness

✅ All Chef Portal docs are written (this set of 140+ files)
✅ Deployment guide exists
✅ Verification guide exists
✅ Handoff to dev team document exists

### 6.4 What V1 Completion Does NOT Require

❌ Zero bugs (non-critical bugs can be addressed post-V1)
❌ Perfect UI polish (functional and usable is sufficient)
❌ All "nice to have" features (only core loop required)
❌ Mobile app
❌ Advanced integrations

---

## 7) V1 vs V2 Boundary

| Feature | V1 | V2 |
|---------|----|----|
| **Core operational loop** | ✅ | ✅ |
| **Stripe integration** | ✅ | ✅ |
| **RLS tenant isolation** | ✅ | ✅ |
| **Event lifecycle (8 states)** | ✅ | ✅ |
| **Ledger-first finance** | ✅ | ✅ |
| **Menu versioning** | ✅ | ✅ |
| **Client invites** | ✅ | ✅ |
| **Audit & immutability** | ✅ | ✅ |
| **OAuth login providers** | ❌ | ✅ |
| **MFA** | ❌ | ✅ |
| **Google Calendar sync** | ❌ | ✅ |
| **Advanced reporting** | ❌ | ✅ |
| **Custom workflows** | ❌ | ✅ |
| **Mobile apps** | ❌ | ✅ |
| **Loyalty system** | ⚠️ (if stubbed) | ✅ |
| **Charts & graphs** | ❌ | ✅ |
| **AI features** | ❌ | ⚠️ (TBD) |

---

## 8) Scope Lock Violations (Examples)

### 8.1 Violation: Adding OAuth Providers

**Request:** "Can we add Google login?"

**Decision:** ❌ OUT OF SCOPE for V1

**Rationale:** OAuth is not required for core loop. Email/password auth is sufficient. Defer to V2.

---

### 8.2 Violation: Adding Recipe Costing

**Request:** "Can we track ingredient costs in menus?"

**Decision:** ❌ OUT OF SCOPE for V1

**Rationale:** Recipe costing is a back-of-house feature, not client-facing. Menu system in V1 is for client presentation and locking only. Defer to V2 or separate tool.

---

### 8.3 Violation: Adding Real-Time Notifications

**Request:** "Can we add WebSocket notifications for payment updates?"

**Decision:** ❌ OUT OF SCOPE for V1

**Rationale:** Real-time sync adds significant complexity. V1 uses polling or manual refresh. Defer to V2.

---

### 8.4 Non-Violation: Adding Email Field Validation

**Request:** "Can we validate email format on client creation?"

**Decision:** ✅ IN SCOPE (enhancement to existing feature)

**Rationale:** This improves existing client creation feature without adding new scope. It's a quality improvement, not a new feature.

---

## 9) Scope Lock Maintenance

### 9.1 This document is updated only for:

1. **Approved scope additions** (rare, requires formal approval)
2. **Clarifications** (adding detail to existing features without changing scope)
3. **Corrections** (fixing errors in the document itself)

### 9.2 This document is NOT updated for:

1. **Feature requests** (those go to backlog for V2)
2. **Bug fixes** (bugs are not scope, they're quality)
3. **UI tweaks** (minor UX improvements within existing features)

---

## 10) Summary: V1 Scope Lock in One Sentence

**The Chef Portal V1 scope is locked to the core operational loop (clients → events → menus → payments → audit) with Stripe integration, RLS-enforced tenant isolation, ledger-first financial truth, server-authoritative lifecycle, and immutable audit logs—excluding OAuth, mobile apps, integrations (except Stripe), social features, advanced reporting, and AI/ML.**

---

## 11) Enforcement Commitment

This scope lock is **binding** for V1 development.

**No exceptions without formal approval process.**

**Any deviation from this scope must be documented and justified.**

**V1 success is measured by completing this scope, not by adding features beyond it.**

---

## Appendix: Scope Lock Version History

| Version | Date | Changes | Approved By |
|---------|------|---------|-------------|
| 1.0 | 2026-02-13 | Initial scope lock | [Product Owner] |

---

**End of Scope Lock Reference**
