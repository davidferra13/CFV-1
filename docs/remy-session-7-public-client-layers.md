# Remy Session 7 — Public + Client Layers

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`
**Status:** COMPLETE

---

## What Was Built

### Public Remy (Visitor-Facing, Unauthenticated)

A lightweight AI chat widget for public chef profile pages. Visitors can ask about the chef's cuisine, services, and how to book — without signing in.

**Architecture:**

- **API:** `app/api/remy/public/route.ts` — SSE streaming, no auth required
- **Rate limiting:** IP-based, 5 messages per minute per IP (in-memory buckets with auto-cleanup)
- **Context:** `lib/ai/remy-public-context.ts` — loads chef display name, business name, tagline, bio, and culinary profile (public-safe keys only)
- **Personality:** `lib/ai/remy-public-personality.ts` — "front of house" tone: warm, professional, inviting. Never shares pricing, client data, or internal info
- **UI:** `components/ai/remy-public-widget.tsx` — floating "Ask Remy" button → expandable card (not a full drawer). Compact design with starter questions
- **Integration:** Wired into `/chef/[slug]/page.tsx` — passes `chef.id` as `tenantId`

**Key Design Decisions:**

- Uses `fast` model tier (lighter, faster for public queries)
- 60-second timeout (shorter than chef/client layers)
- 512 max tokens (public responses should be concise)
- No memory, no commands, no task cards — pure conversational Q&A
- Starter questions: "What cuisines do you specialize in?", "How do I book an event?", "Do you handle dietary restrictions?"

**Privacy:** No PII involved (public chef profile data only). Uses Ollama for consistency, but could theoretically use a cloud model since no private data is processed.

---

### Client Remy (Authenticated, Client-Scoped)

A concierge chat for authenticated clients in the client portal. Clients can ask about their upcoming events, menus, quotes, and dietary accommodations.

**Architecture:**

- **API:** `app/api/remy/client/route.ts` — SSE streaming, `requireClient()` auth
- **Rate limiting:** Reuses tenant-based rate limiter from `remy-guardrails.ts` (12 msgs/min)
- **Context:** `lib/ai/remy-client-context.ts` — loads client's events, quotes, dietary info, chef name. Scoped to `client_id + tenant_id` — physically cannot see other clients' data
- **Personality:** `lib/ai/remy-client-personality.ts` — "concierge" tone: warm, professional, event-focused. References specific booking details. Never shares chef business data or other clients' info
- **UI:** `components/ai/remy-client-chat.tsx` — floating "Ask Remy" button → expandable card with nav suggestion parsing
- **Integration:** Added to `app/(client)/layout.tsx` — available on every client portal page

**Key Design Decisions:**

- Uses `standard` model tier (client data = PII, quality matters)
- 90-second timeout (matches chef Remy)
- 800 max tokens (moderate length for detailed event answers)
- Nav suggestion parsing (Remy can suggest portal pages like `/my-events`, `/my-quotes`)
- 401 error handling for unauthenticated requests
- Starter questions: "When is my next event?", "Show me my menu", "What's the payment status?"

**Privacy:** Client data is PII — MUST use Ollama. No cloud models. EVER. This is enforced by the route checking `isOllamaEnabled()` and refusing to process if Ollama is offline.

---

## Files Created

| File                                   | Purpose                                                |
| -------------------------------------- | ------------------------------------------------------ |
| `lib/ai/remy-public-personality.ts`    | Public Remy personality + guardrails + anti-injection  |
| `lib/ai/remy-client-personality.ts`    | Client Remy personality + guardrails + anti-injection  |
| `lib/ai/remy-public-context.ts`        | Public context loader (chef profile, culinary profile) |
| `lib/ai/remy-client-context.ts`        | Client context loader (events, quotes, dietary info)   |
| `app/api/remy/public/route.ts`         | Public SSE streaming endpoint                          |
| `app/api/remy/client/route.ts`         | Client SSE streaming endpoint                          |
| `components/ai/remy-public-widget.tsx` | Public floating chat widget                            |
| `components/ai/remy-client-chat.tsx`   | Client floating chat component                         |

## Files Modified

| File                                | Change                                      |
| ----------------------------------- | ------------------------------------------- |
| `app/(public)/chef/[slug]/page.tsx` | Added `RemyPublicWidget` import + rendering |
| `app/(client)/layout.tsx`           | Added `RemyClientChat` import + rendering   |

---

## Three Remy Layers Summary

| Layer      | Auth                   | Model            | Timeout | Context                       | Personality                  |
| ---------- | ---------------------- | ---------------- | ------- | ----------------------------- | ---------------------------- |
| **Chef**   | `requireChef()`        | standard/complex | 90s     | Full business data + memories | Sous chef + business partner |
| **Client** | `requireClient()`      | standard         | 90s     | Client's events + quotes only | Event concierge              |
| **Public** | None (IP rate-limited) | fast             | 60s     | Chef public profile only      | Front of house greeter       |

---

## Type Safety

All new files pass `npx tsc --noEmit --skipLibCheck` with zero errors. Column names verified against `types/database.ts`:

- Events: `event_date` (not `date`), `location_address` (not `venue_address`)
- Quotes: `total_quoted_cents` (not `total_cents`)
- Chefs: `display_name` (not `full_name`)
- Clients: `dietary_restrictions` and `allergies` are `string[]` (joined with `, ` for display)

---

## What's Next

- **End-to-end testing** via agent account (test all three Remy layers)
- **Remaining on-demand features** (Sessions 9-11 per master plan)
- **Learning loop + stats** (Session 8)
