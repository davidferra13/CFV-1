# Remy — Public Layer & Client Layer Integration

**Date:** 2026-02-21
**Status:** PLANNED — NOT YET IMPLEMENTED
**Priority:** HIGH
**Estimated effort:** Multi-session

---

## Context

Remy currently only exists on the chef (admin) side of the app. Two major expansions are needed:

### 1. Public Layer — Remy on Public-Facing Pages

Remy should be available on public pages (e.g., the chef's public profile, booking pages) as a visitor-facing assistant. This version would:

- Answer questions about the chef's services, cuisine style, availability
- Help prospective clients understand pricing tiers and service options
- Guide visitors through the inquiry/booking flow
- Pull from the chef's culinary profile, menu offerings, and public info only
- **Must NOT expose private data** (financials, client lists, internal notes)
- Personality stays warm and Remy-like but shifts to a "front of house" tone
- No auth required — works for anonymous visitors

**Key considerations:**

- Rate limiting to prevent abuse (no auth = open to the world)
- Separate system prompt tuned for public interactions
- Context limited to public-safe data only
- May need a simpler model or shorter context window to manage cost

### 2. Client Layer — Remy for Authenticated Clients

Remy should be available to authenticated clients in the client portal. This version would:

- Help clients review their upcoming events, menus, and quotes
- Answer questions about their specific bookings
- Let clients ask about dietary accommodations, timing, logistics
- Surface relevant info from their event details
- Guide clients through menu approval, payment, and feedback flows
- Scoped strictly to that client's own data (tenant + client scoping)

**Key considerations:**

- Auth: `requireClient()` scoping — client only sees their own data
- System prompt tailored for client-facing interactions
- Remy should know the client's name, upcoming events, and preferences
- Must not expose chef's internal notes, other clients, or financials
- Lighter personality — helpful concierge, not kitchen buddy

---

## What Needs to Be Built

- [ ] Public Remy: new API route (unauthenticated, rate-limited)
- [ ] Public Remy: separate system prompt with public-only context
- [ ] Public Remy: UI component for public pages (no drawer — maybe inline widget?)
- [ ] Client Remy: new API route (client-authenticated)
- [ ] Client Remy: system prompt with client-scoped context
- [ ] Client Remy: UI integration in client portal layout
- [ ] Shared: decide on model strategy (Ollama for all? lighter model for public?)
- [ ] Shared: conversation persistence per layer (separate from chef conversations)

---

## Files to Modify (likely)

- `lib/ai/remy-personality.ts` — add public and client personality variants
- `lib/ai/remy-system-prompt.ts` (or similar) — layer-specific prompts
- `app/api/remy/` — new routes for public and client layers
- `app/(public)/` — add Remy widget to public layout
- `app/(client)/` — add Remy to client portal layout
- `components/ai/` — shared Remy UI components, possibly new variants

---

## Notes

- Chef layer Remy is fully built (Phase 1 complete, Phase 2 features in separate backlog doc)
- Private AI rules still apply — client PII must stay local via Ollama
- Public layer might be an exception (no PII involved) — could use a cloud model for cost/speed
