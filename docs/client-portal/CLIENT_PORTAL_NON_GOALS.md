# Client Portal Non-Goals

## Document Identity
- **File**: `CLIENT_PORTAL_NON_GOALS.md`
- **Category**: Core Identity & Portal Definition (5/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document explicitly defines what the Client Portal **IS NOT** and **WILL NOT BE** in V1.

Non-goals are as important as goals. They:
- Prevent feature creep
- Clarify system boundaries
- Focus implementation effort
- Manage stakeholder expectations

**If it's listed here, it's explicitly excluded from V1 scope.**

---

## NOT a Marketing Platform

### ❌ The Client Portal Is NOT:
- A chef discovery tool
- A marketplace for browsing chefs
- A comparison shopping interface
- A lead generation funnel
- A public-facing landing page
- A SEO-optimized content site

### ✅ What It IS:
- A private, authenticated relationship interface
- A post-inquiry transactional portal
- A client-chef collaboration space

### Why This Matters:
- No public chef profiles visible to clients
- No "browse all chefs" functionality
- No search or filter for finding chefs
- Client accesses portal **after** chef relationship established

---

## NOT a Multi-Chef Aggregator

### ❌ The Client Portal Is NOT:
- A way for clients to manage bookings across multiple chefs
- A "switch tenant" interface
- An aggregated view of events from different chefs
- A chef comparison dashboard

### ✅ What It IS:
- Single-tenant scoped (one chef per portal instance)
- Client sees only events with the specific chef they're working with

### Why This Matters:
- No cross-tenant data access
- No tenant-switching UI
- Each chef relationship is isolated
- No "all my chefs" dashboard in V1

---

## NOT a Menu Customization Tool

### ❌ The Client Portal Is NOT:
- A drag-and-drop menu builder
- A dish substitution interface
- A live menu editing tool
- A recipe request form

### ✅ What It IS:
- A menu **viewing** interface
- A finalized menu display
- A read-only menu consumption experience

### Why This Matters:
- Client cannot edit menu items
- Client cannot drag dishes to customize
- Client communicates preferences via messages
- Chef retains full menu control

---

## NOT a Cancellation Self-Service Tool

### ❌ The Client Portal Is NOT:
- A "cancel my event" button
- An automated cancellation flow
- A self-service refund request tool

### ✅ What It IS:
- A messaging interface where client can request cancellation
- A read-only view of event status

### Why This Matters:
- Chef handles cancellations manually
- Cancellation policies enforced by chef
- Financial implications reviewed before cancellation
- No unilateral client cancellation in V1

---

## NOT a Loyalty Redemption Engine (V1)

### ❌ The Client Portal Is NOT:
- A loyalty redemption checkout flow
- A "apply points to balance" button
- A loyalty-to-discount converter (in V1)

### ✅ What It IS:
- A loyalty balance **display**
- A loyalty earning transparency tool
- A read-only loyalty history

### Why This Matters:
- Loyalty redemption deferred to V2
- V1 shows balance only
- Builds trust in loyalty accrual before redemption

---

## NOT an Invoice Generator

### ❌ The Client Portal Is NOT:
- A PDF invoice creation tool
- A downloadable invoice library
- A tax document generator

### ✅ What It IS:
- A ledger-derived balance display
- A payment history viewer
- A financial transparency tool

### Why This Matters:
- Ledger provides financial truth, not invoices
- Invoice generation is a V2 feature
- Payment history via ledger entries is sufficient for V1

---

## NOT a Guest Management System

### ❌ The Client Portal Is NOT:
- A guest list RSVP tool
- A seating chart builder
- A dietary restriction tracker per guest
- An invitation sender

### ✅ What It IS:
- A client-level preference manager
- A single guest count field in inquiry

### Why This Matters:
- Guest management deferred to V2
- V1 focuses on client-chef relationship
- Individual guest tracking out of scope

---

## NOT a Review or Rating Platform

### ❌ The Client Portal Is NOT:
- A star rating system
- A public review posting tool
- A testimonial submission form
- A Yelp-style feedback interface

### ✅ What It IS:
- A private messaging channel for feedback
- A post-event communication tool

### Why This Matters:
- Public reviews deferred to V2
- Feedback handled privately via messages
- No reputation system in V1

---

## NOT a Referral Tracking System

### ❌ The Client Portal Is NOT:
- A "refer a friend" button
- A referral code generator
- A referral reward tracker

### ✅ What It IS:
- A single-client focused interface

### Why This Matters:
- Referral program deferred to V2
- V1 focuses on existing client relationship
- No multi-client network effects in V1

---

## NOT an E-Signature Platform

### ❌ The Client Portal Is NOT:
- A contract signing tool
- A DocuSign integration
- A legal agreement workflow

### ✅ What It IS:
- A proposal acceptance button
- A lightweight agreement mechanism

### Why This Matters:
- Proposal acceptance implies agreement
- Formal e-signature deferred to V2
- V1 keeps legal workflow simple

---

## NOT a Calendar Integration Tool

### ❌ The Client Portal Is NOT:
- An iCal exporter
- A Google Calendar sync
- An Outlook integration
- A calendar widget

### ✅ What It IS:
- A simple event date display
- A list of upcoming events

### Why This Matters:
- Calendar sync deferred to V2
- V1 displays dates, client adds to calendar manually
- No third-party calendar API integration in V1

---

## NOT a Tipping Interface

### ❌ The Client Portal Is NOT:
- A "add a tip" payment flow
- A gratuity suggestion tool
- A tip percentage calculator

### ✅ What It IS:
- A deposit + balance payment interface

### Why This Matters:
- Tipping deferred to V2
- Client can communicate tip intent via message
- Chef can manually add tip to ledger if needed

---

## NOT an Analytics Dashboard

### ❌ The Client Portal Is NOT:
- A spending trends visualizer
- A "your booking history insights" dashboard
- A predictive "next event" suggester

### ✅ What It IS:
- A simple list of events (upcoming, past)
- A loyalty balance display

### Why This Matters:
- Client-facing analytics deferred to V2
- V1 provides simple, clear data
- No complex charts or predictions

---

## NOT an SMS Notification System

### ❌ The Client Portal Is NOT:
- An SMS reminder sender
- A text message notification tool

### ✅ What It IS:
- An email notification system

### Why This Matters:
- SMS integration deferred to V2
- Email notifications sufficient for V1
- Reduces third-party dependencies

---

## NOT a Multi-Event Booking Flow

### ❌ The Client Portal Is NOT:
- A "book multiple events at once" wizard
- A bulk inquiry form

### ✅ What It IS:
- A single-inquiry submission form
- One event inquiry at a time

### Why This Matters:
- Simplifies V1 implementation
- Each inquiry is independent
- Bulk booking deferred to V2

---

## NOT a Frontend-Only Application

### ❌ The Client Portal Is NOT:
- A client-side authorization system
- A frontend-inferred role resolver
- A trust-the-browser security model

### ✅ What It IS:
- A server-enforced, RLS-backed, database-validated system
- A fail-closed, deny-by-default architecture

### Why This Matters:
- All authorization enforced server-side
- Frontend displays based on server state
- No frontend-only security logic

---

## NOT a Speculative Future-Proofed System

### ❌ The Client Portal Is NOT:
- Built for hypothetical V2 features
- Over-engineered for future extensibility
- Designed with unused abstractions

### ✅ What It IS:
- Built for V1 scope exactly
- Simple, deterministic, testable
- Scope-locked to current requirements

### Why This Matters:
- No premature optimization
- No unused feature flags
- No "just in case" abstractions
- V2 requirements addressed in V2

---

## NOT a Trust-Optional System

### ❌ The Client Portal Is NOT:
- A system that assumes frontend compliance
- A system that trusts user input without validation
- A system that allows frontend-only authorization

### ✅ What It IS:
- A zero-trust architecture
- Server-validated, database-enforced
- Fail-closed on error

### Why This Matters:
- Security is non-negotiable
- Every layer validates independently
- No assumption of good-faith frontend behavior

---

## NOT a Cross-Tenant Data Aggregator

### ❌ The Client Portal Is NOT:
- A tool for viewing data across multiple tenants
- A consolidated "all my bookings" view spanning chefs

### ✅ What It IS:
- Strictly tenant-scoped
- Single-tenant visibility only

### Why This Matters:
- Tenant isolation is absolute
- No cross-tenant queries
- Each chef relationship is independent

---

## Summary: What the Client Portal IS

To clarify by contrast, the Client Portal **IS**:

✅ A single-tenant, authenticated client interface
✅ A lifecycle-aware booking relationship tool
✅ A ledger-derived financial transparency portal
✅ A read-only menu viewer (for finalized menus)
✅ A messaging tool for client-chef communication
✅ A preference storage interface
✅ A loyalty balance display (V1: read-only)
✅ A server-enforced, RLS-backed, fail-closed system
✅ A deterministic, testable, scope-locked implementation

---

## Handling Non-Goal Requests

When a feature request matches a non-goal:

1. **Acknowledge**: "That's a valuable idea."
2. **Classify**: "This is out of scope for V1."
3. **Redirect**: "Here's the V1 alternative..."
4. **Document**: "Added to V2 backlog."
5. **Do NOT implement**: Keep V1 scope locked.

---

## Related Documents

- [CLIENT_PORTAL_OVERVIEW.md](./CLIENT_PORTAL_OVERVIEW.md)
- [CLIENT_PORTAL_SCOPE_LOCK.md](./CLIENT_PORTAL_SCOPE_LOCK.md)
- [CLIENT_PORTAL_BOUNDARIES.md](./CLIENT_PORTAL_BOUNDARIES.md)
- [CLIENT_PORTAL_CONSTITUTION.md](./CLIENT_PORTAL_CONSTITUTION.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-13
