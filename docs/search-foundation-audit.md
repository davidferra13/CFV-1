# ChefFlow Search Foundation Audit

> Generated 2026-05-14. Comprehensive audit of every search, filter, discovery, recommendation, pricing, and lookup surface in ChefFlow.

---

## Executive Summary

**ChefFlow has zero mock/fake data in user-facing surfaces.** Every search result comes from real database queries. The codebase has explicit guardrails preventing fake stats, fake testimonials, and hardcoded results.

**However, search infrastructure is deeply uneven.** One surface (`/nearby` directory) is gold-standard (FTS, trigram, GIN arrays, geo-distance, pagination, multi-factor ranking, 17+ indexes). Everything else relies on ILIKE `%query%` full-table scans with no text indexes.

### Scorecard

| Domain                  | Data Real? | FTS?                     | Pagination?             | Ranking?           | Indexes?        | Grade |
| ----------------------- | ---------- | ------------------------ | ----------------------- | ------------------ | --------------- | ----- |
| PIE / Pricing           | Yes        | Partial (Pi Bridge)      | N/A (by ID)             | Yes (13-tier)      | Yes             | A     |
| /nearby Directory       | Yes        | Yes (tsvector+trigram)   | Yes (24/page)           | Yes (multi-factor) | Yes (17+)       | A     |
| Public Ingredients      | Yes        | Yes (tsvector+trigram)   | Partial (limit)         | Yes (ts_rank)      | Yes             | A-    |
| Consumer Discovery /eat | Yes        | No                       | Partial (capped 32)     | Yes (relevance)    | Partial         | B     |
| Chef Directory /chefs   | Yes        | No (in-memory .includes) | No (limit 200)          | Yes (multi-sort)   | Partial         | C     |
| Dish Index              | Yes        | No (ILIKE)               | Yes (offset)            | Yes (multi-sort)   | Partial         | B-    |
| Universal Search        | Yes        | No (20x ILIKE scans)     | No (8 per type)         | Yes (fuzzy score)  | No              | D     |
| Menus                   | Yes        | No                       | No                      | No                 | Partial         | D     |
| Recipes                 | Yes        | No (ILIKE)               | No                      | No                 | Partial         | D     |
| Ingredients (chef)      | Yes        | No (ILIKE)               | No                      | No                 | Partial         | D     |
| Clients                 | Yes        | No (ILIKE)               | No                      | No                 | No text idx     | D     |
| Events                  | Yes        | No                       | No (client-side filter) | No                 | Yes (unused)    | D     |
| Quotes                  | Yes        | No (ILIKE)               | No                      | No                 | No text idx     | D     |
| Expenses                | Yes        | No (ILIKE)               | No                      | No                 | No text idx     | D     |
| Vendors                 | Yes        | No                       | No                      | No (alpha)         | Yes             | C-    |
| Admin Inquiries         | Yes        | No (JS filter)           | Fake (JS slice)         | No                 | N/A (loads all) | F     |
| Admin Clients           | Yes        | No                       | No                      | No                 | N/A (loads all) | F     |

---

## Critical Findings

### 1. Universal Search: 20 Parallel ILIKE Scans (CRITICAL)

**File:** `lib/search/universal-search.ts`

Searches 20 entity types simultaneously using `ILIKE '%query%'` on unindexed text columns. Every search triggers 20 sequential scans. Columns searched without indexes:

- `clients.full_name`, `clients.email`, `clients.phone`
- `events.occasion`, `events.location_address`, `events.special_requests`
- `inquiries.source_message`, `inquiries.confirmed_occasion`
- `menus.name`, `menus.description`
- `recipes.name`, `recipes.description`
- `quotes.quote_name`, `quotes.internal_notes`
- `expenses.description`, `expenses.vendor_name`
- `messages.subject`, `messages.body`
- `referral_partners.name`, `referral_partners.contact_name`
- `staff_members.name`, `staff_members.email`
- `conversations.last_message_preview`

### 2. Admin Surfaces Load Entire Tables Into Memory (CRITICAL)

**Admin Inquiries** (`lib/admin/inquiry-admin-actions.ts`): Loads ALL inquiries + ALL chefs + ALL clients into memory, filters/paginates in JavaScript. No DB-level filtering, no LIMIT/OFFSET.

**Admin Clients** (`app/(admin)/admin/clients/page.tsx`): Loads all clients across all tenants with no search, no filter, no pagination.

### 3. Chef Directory: No Server-Side Search (HIGH)

**File:** `lib/directory/actions.ts`

`getDiscoverableChefs()` loads all chefs (limit 200) into memory. Text search uses in-memory `.includes()` against a built haystack string. No FTS, no trigram, no server-side text filtering.

### 4. Events Page: Cosmetic Status Filter (MEDIUM)

**File:** `app/(chef)/events/page.tsx`

Status filter appears in URL (`?status=draft`) but all events are loaded from DB then filtered client-side in React. The DB has `idx_events_tenant_status` ready to use.

### 5. No Pagination on Core Surfaces (HIGH)

| Surface     | Action             | Loads                      |
| ----------- | ------------------ | -------------------------- |
| Menus       | `getMenus()`       | All menus for tenant       |
| Recipes     | `getRecipes()`     | All recipes for tenant     |
| Ingredients | `getIngredients()` | All ingredients for tenant |
| Clients     | `getClients()`     | All clients (limit 5000)   |
| Events      | `getEvents()`      | All events (limit 2000)    |
| Vendors     | `getVendors()`     | All vendors for tenant     |

### 6. Security: Unescaped LIKE Input (MEDIUM)

**File:** `app/api/v2/recipes/route.ts:31`

The `q` parameter is passed directly to `.ilike()` without `escapeLikePattern()`. User-supplied `%` or `_` characters alter query behavior.

### 7. N+1 in Client Quick Search (LOW)

**File:** `lib/clients/actions.ts:1753`

`searchClientsQuick()` fires 2 additional DB queries per matched client (events + ledger balance). With 5 results, that is 11 queries per keystroke.

---

## Gold Standard: /nearby Directory

**File:** `lib/discover/actions.ts`

The `/nearby` directory implementation should be the template for all search surfaces:

1. **FTS:** `search_vector @@ to_tsquery()` with `ts_rank_cd` scoring
2. **Trigram:** `idx_directory_listings_city_trgm` for fuzzy city matching
3. **GIN arrays:** `cuisine_types` array containment via GIN index
4. **Geo-distance:** Haversine with bounding-box pre-filter
5. **Pagination:** Server-side LIMIT/OFFSET with total count
6. **Multi-factor ranking:** text_rank + distance + featured + photos + lead_score
7. **17+ indexes:** Covering every filter dimension
8. **Empty-state handling:** Proper zero-result UI with suggestions

---

## Existing FTS Infrastructure

The codebase already has FTS on reference/system tables:

| Table                            | Index Type             | Column                    |
| -------------------------------- | ---------------------- | ------------------------- |
| `system_ingredients`             | GIN tsvector + trigram | `name`                    |
| `directory_listings`             | GIN tsvector           | `search_vector`           |
| `communication_log`              | GIN tsvector           | subject+body composite    |
| `openclaw.products`              | GIN tsvector           | `name`                    |
| `openclaw.canonical_ingredients` | GIN tsvector           | `name`                    |
| `national_vendors`               | GIN tsvector           | name+city+state composite |
| `remy_messages`                  | GIN tsvector           | `content`                 |

The Drizzle schema already defines a custom `tsvector` type (schema.ts line 9-13). The pattern is proven; it just hasn't been applied to business entities.

---

## What Already Works Well

1. **PIE (Pricing Intelligence Engine):** Production-grade. 13-tier resolution, 1.1M+ live prices via Pi Bridge, confidence scoring, anomaly detection, synthetic fallbacks, proper indexes, rate limiting, circuit breakers.

2. **Public Ingredient Search:** Proper FTS + trigram with `ts_rank` scoring and similarity threshold.

3. **Dish Index:** Only chef-facing surface with proper pagination (limit/offset with count) and multi-filter support.

4. **Discovery Rail Scoring:** Sophisticated editorial + preference + suppression scoring algorithm.

5. **Consumer Discovery Feed:** Multi-source aggregation with per-type relevance scoring and timeout safety.

6. **Zero fake data policy:** Explicit guardrails everywhere. `public-stats.ts`: "This file must never fall back to hardcoded or estimated values." Testimonials: "No data = no section."

---

## Database Schema: Index Gap Analysis

### Tables Needing Text Search Indexes (Priority Order)

| Table               | Columns                            | Current Search Pattern | Recommended                     |
| ------------------- | ---------------------------------- | ---------------------- | ------------------------------- |
| `clients`           | full_name, email, phone            | ILIKE '%q%'            | tsvector + trigram on full_name |
| `events`            | occasion, location_address         | ILIKE '%q%'            | tsvector composite              |
| `menus`             | name, description                  | ILIKE '%q%'            | tsvector + trigram on name      |
| `recipes`           | name, description                  | ILIKE '%q%'            | tsvector + trigram on name      |
| `inquiries`         | source_message, confirmed_occasion | ILIKE '%q%'            | tsvector composite              |
| `quotes`            | quote_name                         | ILIKE '%q%'            | trigram on quote_name           |
| `expenses`          | description, vendor_name           | ILIKE '%q%'            | tsvector composite              |
| `messages`          | subject, body                      | ILIKE '%q%'            | tsvector composite              |
| `referral_partners` | name, contact_name                 | ILIKE '%q%'            | trigram on name                 |
| `staff_members`     | name, email                        | ILIKE '%q%'            | trigram on name                 |
| `dish_index`        | name                               | ILIKE '%q%'            | trigram on name                 |

### Tables Needing Filter Indexes

| Table        | Column        | Filter Pattern | Recommended    |
| ------------ | ------------- | -------------- | -------------- |
| `recipes`    | cuisine       | eq filter      | B-tree         |
| `recipes`    | meal_type     | eq filter      | B-tree         |
| `recipes`    | category      | eq filter      | Already exists |
| `menus`      | cuisine_type  | eq filter      | B-tree         |
| `dishes`     | dietaryTags   | array contains | GIN            |
| `dishes`     | allergenFlags | array contains | GIN            |
| `dish_index` | dietaryTags   | array contains | GIN            |
| `dish_index` | tags          | array contains | GIN            |

### Tables Needing Timestamp Indexes

| Table     | Column     | Purpose                   |
| --------- | ---------- | ------------------------- |
| `clients` | created_at | Recency sorting           |
| `recipes` | created_at | Recency sorting           |
| `menus`   | created_at | Already has partial index |
| `quotes`  | created_at | Already has partial index |
