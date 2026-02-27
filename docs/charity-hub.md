# Charity Hub

**Added:** 2026-02-27
**Route:** `/charity`
**Tier:** Free (read-only aggregation view)

## What It Does

The Charity Hub is a read-only aggregation page that surfaces any existing entity in the system that references charity-related keywords. It does not create new data or modify existing records — it's a visibility layer.

## How Keyword Matching Works

All matching logic lives in a single utility: `lib/charity/charity-keywords.ts`.

**Three exports:**

- `CHARITY_KEYWORDS: string[]` — the configurable keyword list. Add/remove terms here and they propagate to all queries automatically.
- `isCharityRelated(text)` — returns `true` if the text contains any keyword (case-insensitive). Used for post-fetch filtering on array fields.
- `buildCharityOrFilter(columns)` — generates a Supabase `.or()` ILIKE filter string for SQL-level search across multiple columns.

**Current keyword list:**

charity, nonprofit, non-profit, fundraiser, fundraising, donation, donate, giveback, philanthropic, philanthropy, foundation, sponsorship, volunteer, community support, pro bono, 501c, 501(c), benefit dinner, benefit gala

Note: `gala` alone was intentionally excluded — too broad (corporate galas, birthday galas). Use `benefit gala` or `charity gala` instead.

## What Gets Searched

| Section             | Table            | Columns                                                                                                |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------ |
| Events              | `events`         | `occasion`, `special_requests`, `kitchen_notes`, `site_notes`                                          |
| Menus               | `menus`          | `name`, `description`, `notes`                                                                         |
| Financials          | `ledger_entries` | `description`, `internal_notes`                                                                        |
| Misc: Client Notes  | `client_notes`   | `note_text`                                                                                            |
| Misc: Inquiry Notes | `inquiry_notes`  | `note_text`                                                                                            |
| Misc: Inquiries     | `inquiries`      | `source_message`, `confirmed_occasion`                                                                 |
| Misc: Client Tags   | `client_tags`    | `tag`                                                                                                  |
| Misc: Prospects     | `prospects`      | `notes`, `talking_points`, `description` (text) + `tags`, `event_types_hosted` (arrays, post-filtered) |
| Misc: Messages      | `messages`       | `subject`, `body`                                                                                      |

All queries are tenant-scoped via `requireChef()`. Results are capped (50 for main entities, 20 for misc, 15 for messages).

**Note on prospects:** Uses `chef_id` (not `tenant_id`) for scoping. Array fields (`tags`, `event_types_hosted`) can't be searched with ILIKE — a bounded fetch (limit 200) + `isCharityRelated()` post-filter is used instead.

## Architecture

- **No database changes.** No migrations, no new columns, no write-path modifications.
- **No `charity_flag` column.** Queries use ILIKE on tenant-scoped data which is small enough to scan per-request.
- **No full-table scans.** Every query filters by `tenant_id` first (hitting the index), then applies ILIKE on the small per-tenant result set.
- **Single source of truth.** All keyword matching goes through `charity-keywords.ts`. No string matching scattered elsewhere.

## File Locations

| File                                     | Purpose                            |
| ---------------------------------------- | ---------------------------------- |
| `lib/charity/charity-keywords.ts`        | Keyword list + matching utilities  |
| `lib/charity/actions.ts`                 | Server actions (4 fetch functions) |
| `components/charity/charity-section.tsx` | Collapsible section UI component   |
| `app/(chef)/charity/page.tsx`            | The Charity Hub page               |
| `components/navigation/nav-config.tsx`   | Nav entry (HeartHandshake icon)    |

## Adding New Keywords

Edit `CHARITY_KEYWORDS` in `lib/charity/charity-keywords.ts`. No other changes needed — all queries rebuild their filter from this array.

## Adding New Entity Types

1. Add a new fetch function in `lib/charity/actions.ts` using the same pattern
2. Add a new `CharitySection` block in `app/(chef)/charity/page.tsx`
3. Update the summary card grid if needed
