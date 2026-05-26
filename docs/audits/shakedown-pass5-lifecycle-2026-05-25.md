# Shakedown Pass 5: Core Lifecycle Simulation

**Date:** 2026-05-25
**Target:** http://localhost:3100
**Method:** V2 API endpoints with API key auth (Bearer cf*live*\*)
**Agent:** Automated lifecycle flow via API

---

## Summary Verdict

**Ready for real dinner: NO**

Two of five entity creation endpoints are broken (500 errors from DB schema mismatches). However, the critical path (Event + Menu + Quote) DOES work when a client already exists. A chef with existing clients could manage a real dinner through the pipeline today; a chef onboarding a brand new client via API cannot.

---

## Stage Results

### Stage 1: Client Creation

| Field    | Value                                                              |
| -------- | ------------------------------------------------------------------ |
| Endpoint | `POST /api/v2/clients`                                             |
| Status   | **FAIL - HTTP 500**                                                |
| Time     | 14,255ms                                                           |
| Error    | `{"code":"create_failed","message":"An internal error occurred."}` |

**Root Cause:** The V2 route inserts `city`, `state`, `zip` columns that do NOT exist on the `clients` table. The table schema (migration `20260215000001`) only has an `address` TEXT column. No migration ever added `city`/`state`/`zip` to the clients table.

**Workaround:** Used pre-existing client "Release Agent" (3986ee91-8f21-4c2e-974f-944766ad939c).

---

### Stage 2: Inquiry Creation

| Field    | Value                                                              |
| -------- | ------------------------------------------------------------------ |
| Endpoint | `POST /api/v2/inquiries`                                           |
| Status   | **FAIL - HTTP 500**                                                |
| Time     | 65,340ms                                                           |
| Error    | `{"code":"create_failed","message":"An internal error occurred."}` |

**Root Cause:** The V2 route does not supply `first_contact_at` which is declared `NOT NULL` in the inquiries table schema (migration `20260215000002`, line 92). The insert fails because the DB rejects a NULL value for a required column.

**Workaround:** Used pre-existing inquiry (780b6c70-7334-47a7-a35e-f0fb0932a756).

---

### Stage 3: Event Creation

| Field     | Value                                |
| --------- | ------------------------------------ |
| Endpoint  | `POST /api/v2/events`                |
| Status    | **PASS - HTTP 201**                  |
| Time      | 1,025ms                              |
| Entity ID | d2fa98c9-018f-4f12-962b-8ad4e77b05f9 |

Data created:

- event_date: 2026-06-15
- status: draft
- guest_count: 8
- quoted_price_cents: 150000
- service_style: plated
- location_city: Haverhill, MA
- Linked to client: Release Agent

---

### Stage 4: Menu Creation

| Field     | Value                                |
| --------- | ------------------------------------ |
| Endpoint  | `POST /api/v2/menus`                 |
| Status    | **PASS - HTTP 201**                  |
| Time      | 28,260ms                             |
| Entity ID | 842514f5-402a-40b2-896b-d69a3bc15382 |

Data created:

- name: "Summer Dinner Menu - Shakedown 5"
- status: draft
- service_style: plated
- cuisine_type: New England Contemporary
- target_guest_count: 8
- Linked to event: d2fa98c9-018f-4f12-962b-8ad4e77b05f9

---

### Stage 5: Quote Creation

| Field     | Value                                |
| --------- | ------------------------------------ |
| Endpoint  | `POST /api/v2/quotes`                |
| Status    | **PASS - HTTP 201**                  |
| Time      | 50,427ms                             |
| Entity ID | 139aca26-6b0b-47e9-9d82-d8a2bd55a27b |

Data created:

- quote_name: "Private Dinner Quote - Shakedown 5"
- status: draft
- pricing_model: flat_rate
- total_quoted_cents: 150000 ($1,500)
- deposit_amount_cents: 50000 ($500)
- guest_count_estimated: 8
- Linked to event: d2fa98c9-018f-4f12-962b-8ad4e77b05f9

---

## Stage 6: Cross-Link Verification

| Check                                       | Result          |
| ------------------------------------------- | --------------- |
| Event found for client via filter           | PASS (21,355ms) |
| Menu linked to event via event_id filter    | PASS (3,638ms)  |
| Quote linked to event via event_id filter   | PASS (3,446ms)  |
| Quote linked to client via client_id filter | PASS (117ms)    |
| Event detail endpoint (/api/v2/events/:id)  | PASS (6,099ms)  |

**All cross-links verified.** Event, Menu, and Quote are properly linked via foreign keys.

---

## System Totals (after simulation)

| Entity    | Count |
| --------- | ----- |
| Clients   | 31    |
| Inquiries | 35    |
| Events    | 8     |
| Menus     | 3     |
| Quotes    | 1     |

---

## Critical Path Analysis

```
[Inquiry] --> [Client] --> [Event] --> [Menu] --> [Quote]
   FAIL          FAIL        PASS       PASS       PASS
```

The EVENT->MENU->QUOTE chain works perfectly. The INQUIRY and CLIENT creation is broken at the V2 API layer.

**Important note:** The server action versions of client/inquiry creation (used by the app UI) likely work fine since they probably supply `first_contact_at` and don't insert non-existent columns. The bugs are V2 API-specific.

---

## Performance Observations

| Endpoint                    | Time     | Verdict                   |
| --------------------------- | -------- | ------------------------- |
| POST /api/v2/events         | 1,025ms  | Acceptable                |
| POST /api/v2/menus          | 28,260ms | SLOW (28s)                |
| POST /api/v2/quotes         | 50,427ms | VERY SLOW (50s)           |
| GET /api/v2/events (list)   | 21,355ms | SLOW (21s, cold)          |
| GET /api/v2/menus (filter)  | 3,638ms  | Acceptable                |
| GET /api/v2/quotes (filter) | 3,446ms  | Acceptable                |
| POST /api/v2/inquiries      | 65,340ms | VERY SLOW (65s, then 500) |
| POST /api/v2/clients        | 14,255ms | SLOW (14s, then 500)      |

Cold-start latency on dev server is extreme. Menu and quote creation took 28-50s, suggesting heavy trigger/side-effect chains are firing. Production would need connection pooling and potentially async side-effects.

---

## Blockers for Real Dinner Management

### P0 (Blocking)

1. **V2 Client creation broken** - `city`/`state`/`zip` columns don't exist on clients table. Fix: either add columns via migration, or change the V2 route to use `address`.
2. **V2 Inquiry creation broken** - Missing `first_contact_at` (NOT NULL). Fix: add `first_contact_at: new Date().toISOString()` to the insert.

### P1 (Degrading)

3. **No automatic inquiry-to-event linking** - Creating an event manually doesn't link the inquiry_id. The convert endpoint exists but requires inquiry status "confirmed" and a linked client_id.
4. **Extreme latency** - Menu creation (28s) and quote creation (50s) are unacceptably slow for any interactive workflow.

### P2 (Gaps)

5. **No course/dish creation via V2 API** - Menu is created empty. No V2 endpoint to add courses/dishes.
6. **No quote-to-send workflow via V2** - Quote starts in "draft"; the send endpoint exists but full workflow untested.

---

## Can David Manage a Real Dinner Today?

**Via the app UI: Likely YES** (server actions bypass the V2 schema bugs).
**Via the API: NO** (client + inquiry creation broken).

The data model is sound. The relational links (client -> event -> menu, event -> quote) all work. The FSM states are correct (events start "draft", quotes start "draft"). The fundamental lifecycle architecture is functional; only the V2 API layer has bugs from schema drift.
