# Client Portal Scope Lock

## Document Identity
- **File**: `CLIENT_PORTAL_SCOPE_LOCK.md`
- **Category**: Core Identity & Portal Definition (3/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready, Scope Frozen

---

## Purpose

This document **locks the scope** of the Client Portal for V1 implementation.

It defines:
- ✅ What **IS** in scope
- ❌ What **IS NOT** in scope
- 🔒 What **CANNOT** be added without V2 scope expansion

This is a **hard boundary**. No feature creep. No scope expansion. No "just one more thing."

---

## V1 Scope: LOCKED

The Client Portal V1 scope includes **ONLY** the following:

### 1. Identity & Authentication
✅ Login via Supabase Auth (email/password, magic link)
✅ Client profile creation and viewing
✅ Role resolution (`user_roles` → `role = 'client'`)
✅ Account linking via email match + verification
✅ Deterministic merge on duplicate client profiles

### 2. Event Lifecycle Participation
✅ Submit event inquiry
✅ View proposal submitted by chef
✅ Accept or decline proposal
✅ View deposit payment requirement
✅ Pay deposit via Stripe Checkout
✅ View confirmed event details
✅ View finalized menu PDF
✅ View event execution summary
✅ View loyalty points awarded post-event

### 3. Financial Visibility
✅ View ledger-derived balance for each event
✅ View payment history per event
✅ See deposit amount and due date
✅ See balance due and payment link
✅ View refund entries (if applicable)

### 4. Loyalty Tracking
✅ View total loyalty points balance
✅ View loyalty points earned per event
✅ View loyalty derivation from settled charges
✅ View loyalty tier (if applicable)

### 5. Menu Viewing
✅ View finalized menu for confirmed events
✅ Download menu PDF (signed URL)
✅ See menu version history for event
✅ View allergen information

### 6. Messaging
✅ View event-scoped message threads
✅ Send messages to chef
✅ Upload attachments (images, PDFs)
✅ Receive email notifications for new messages

### 7. Preferences
✅ Store dietary restrictions
✅ Store allergy information
✅ Store favorite dishes
✅ Store special dates (birthdays, anniversaries)

### 8. Dashboard
✅ View upcoming events
✅ View past events
✅ View pending inquiries
✅ View total loyalty balance
✅ Quick access to active proposals

---

## V1 Scope: EXPLICITLY EXCLUDED

The following are **NOT** in V1 scope:

### ❌ Multi-Tenant Client Access
- Client cannot access multiple tenants (chefs) in V1
- No "switch tenant" functionality
- No aggregated view across chefs

### ❌ Chef Discovery or Marketplace
- No browsing of chefs
- No search for chefs
- No chef comparison
- No public chef profiles

### ❌ Direct Menu Customization by Client
- Client cannot edit menu items
- Client cannot request substitutions via UI
- Client communicates preferences via messages only

### ❌ Client-Initiated Cancellations
- Client cannot cancel event via UI
- Cancellation handled via chef portal or support
- Client can request cancellation via message

### ❌ Loyalty Redemption (V1)
- Client can see loyalty balance
- Client **CANNOT** redeem loyalty for discounts in V1
- Redemption deferred to V2

### ❌ Invoice Generation
- No client-generated invoices
- Ledger provides financial truth
- Invoice generation is V2 feature

### ❌ Multi-Event Booking (Simultaneous)
- Client can submit one inquiry at a time
- No "book multiple events" in single flow
- Each inquiry is independent

### ❌ Guest Management
- No guest list tracking
- No RSVP functionality
- Guest count handled via inquiry form only

### ❌ Tipping
- No tipping functionality in V1
- Payment is deposit + balance only
- Tipping deferred to V2

### ❌ Client Reviews or Ratings
- No rating or review system
- Feedback via messages only
- Public review system is V2

### ❌ Referral Program
- No referral tracking
- No referral rewards
- Deferred to V2

### ❌ Automated Reminders
- No automated SMS reminders
- Email notifications only
- SMS integration is V2

### ❌ Calendar Integration
- No iCal export
- No Google Calendar sync
- Calendar integration is V2

### ❌ Contract Signing
- No e-signature integration
- Proposal acceptance is agreement
- E-signature is V2

### ❌ Client-Facing Analytics
- No "insights" or "trends" dashboard
- Simple event list and loyalty balance only
- Analytics deferred to V2

---

## Boundary Enforcement

### How to Handle Out-of-Scope Requests

When a feature request falls outside V1 scope:

1. **Acknowledge** the request
2. **Classify** as V2 candidate
3. **Redirect** to message-based workflow if urgent
4. **Document** in V2 backlog
5. **Do NOT implement** in V1

### Example

**Request**: "Can client add a tip during payment?"

**Response**:
- Tipping is **out of scope for V1**
- Client can communicate tip intent via message
- Chef can manually add tip as ledger entry
- Automated tipping is a **V2 feature**

---

## Scope Change Process

To add a feature to V1 scope:

1. **Requires**: Explicit V1 scope expansion approval
2. **Triggers**: Impact assessment on:
   - Database schema
   - RLS policies
   - Lifecycle state machine
   - Financial truth model
   - Testing coverage
3. **Decision**: Accept as V1 or defer to V2
4. **Update**: All related documentation if accepted

**Default answer: Defer to V2.**

---

## V1 Success Criteria

The Client Portal V1 is **complete** when:

✅ Client can submit inquiry
✅ Client can view and accept proposal
✅ Client can pay deposit via Stripe
✅ Client can view finalized menu
✅ Client can track event status
✅ Client can view ledger-derived balance
✅ Client can see loyalty points
✅ Client can message chef
✅ Client can manage preferences
✅ All 20 System Laws enforced
✅ All RLS policies tested
✅ All lifecycle transitions logged
✅ All financial truth ledger-derived
✅ All idempotency enforced

**No additional features required for V1.**

---

## V2 Scope Candidates

Features deferred to V2:

- Loyalty redemption for discounts
- Multi-tenant client access
- Calendar integration (iCal, Google)
- SMS notifications
- Tipping functionality
- E-signature integration
- Client reviews/ratings
- Referral program
- Invoice generation
- Guest list management
- Client-initiated cancellations (UI-based)
- Advanced analytics dashboard

---

## Relationship to Chef Portal Scope

The Client Portal V1 scope is **independent** from Chef Portal scope.

Chef Portal features (out of scope for Client Portal):
- Event creation
- Menu drafting
- Pricing formula management
- Proposal creation
- Internal chef notes
- Multi-client dashboard
- Revenue analytics
- Inventory tracking

**Client Portal does NOT implement any Chef Portal features.**

---

## Lock Date

**Scope locked as of**: 2026-02-13

**Scope authority**: ChefFlow V1 Master Definition

**Amendment requires**: Explicit V2 scope definition document

---

## Related Documents

- [CLIENT_PORTAL_OVERVIEW.md](./CLIENT_PORTAL_OVERVIEW.md)
- [CLIENT_PORTAL_CONSTITUTION.md](./CLIENT_PORTAL_CONSTITUTION.md)
- [CLIENT_PORTAL_BOUNDARIES.md](./CLIENT_PORTAL_BOUNDARIES.md)
- [CLIENT_PORTAL_NON_GOALS.md](./CLIENT_PORTAL_NON_GOALS.md)
- [CLIENT_LIFECYCLE_OVERVIEW.md](./CLIENT_LIFECYCLE_OVERVIEW.md)

---

**Document Status**: ✅ Scope Frozen, Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-13
