# Food Truck: Location Profitability + Social Post Generator

Two features for food truck operators to track which locations perform best and quickly generate social media announcements.

## Feature 1: Location Profitability Tracking

### What it does

Analyzes `truck_schedule` completion data to rank locations by revenue performance. All calculations are deterministic (Formula > AI).

### Key metrics

- **Total revenue** per location (summed from `revenue_cents` on completed visits)
- **Average revenue per visit** and **average covers per visit**
- **Profit score** (0-100 composite): 50% revenue consistency, 30% visit volume, 20% cover count
- **Best/worst day of week** per location
- **Best time slot combos**: which location + day-of-week pairs perform highest

### Server actions (`lib/food-truck/location-profit-actions.ts`)

| Action                                             | Purpose                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `getLocationProfitability(locationId, dateRange?)` | Full detail for one location: visit history, day breakdown, trends |
| `getAllLocationRankings(days?)`                    | Ranked list of all active locations by profit score                |
| `getLocationTrends(locationId)`                    | Last 12 visits revenue/cover trends, best/worst days               |
| `getBestTimeSlots()`                               | Top 20 location + day-of-week combos by avg revenue                |

### UI (`components/food-truck/location-profitability.tsx`)

- Date range filter: 30d, 60d, 90d, All Time
- Summary cards: Best Location, Most Visited, Highest Avg Ticket
- Sortable rankings table (click any column header)
- Click a row to expand detail view with:
  - Stats grid (revenue, visits, avg/visit, avg covers)
  - Day-of-week revenue bars (CSS)
  - Last 12 visits bar chart (CSS)
  - Best/worst day indicators

### Page

`app/(chef)/food-truck/profitability/page.tsx` (server component, requireChef())

---

## Feature 2: Social Media Location Announcements

### What it does

Generates copy-paste social media posts for "We're at [Location] today!" announcements. Uses deterministic template filling, not AI.

### How it works

1. Chef opens the page, sees today's scheduled stops
2. Picks a template (built-in or custom)
3. Clicks "Generate Post" on a stop
4. Template placeholders (`{location}`, `{address}`, `{time}`, `{date}`) are filled
5. Chef edits if needed, selects platform (visual only), clicks "Copy to Clipboard"
6. Pastes into their social media app

No direct social media API integration. This is intentional: OAuth flows for 4 platforms would be complex and fragile. Copy-paste is simple and works with any platform, including Zapier automations.

### Server actions (`lib/food-truck/social-actions.ts`)

| Action                                            | Purpose                                                |
| ------------------------------------------------- | ------------------------------------------------------ |
| `getTodaySchedule()`                              | Today's scheduled stops with location details          |
| `generateLocationPost(scheduleId, templateText?)` | Fill template with schedule entry data                 |
| `getPostHistory()`                                | Previously generated/copied posts                      |
| `savePostDraft(text, platform, locationName)`     | Record what was generated (auto-saves on copy)         |
| `getPostTemplates()`                              | Custom + built-in templates                            |
| `createPostTemplate(name, template)`              | Save a new custom template                             |
| `deletePostTemplate(templateId)`                  | Remove a custom template (built-ins cannot be deleted) |

### Built-in templates

- **Standard Announcement**: "We're at {location} today! {address}. Serving {time}. Come hungry!"
- **Casual Vibe**: "Pulling up to {location} right now. Catch us {time} at {address}. Let's eat!"
- **Weekend Energy**: "It's {date} and we're rolling into {location}! Find us at {address} from {time}."
- **Short and Sweet**: "{location} today, {time}. See you there!"

### Template placeholders

| Placeholder    | Filled with                              |
| -------------- | ---------------------------------------- |
| `{location}`   | Location name from `truck_locations`     |
| `{address}`    | Location address                         |
| `{time}`       | Start - End in 12h format                |
| `{start_time}` | Start time only                          |
| `{end_time}`   | End time only                            |
| `{date}`       | Friendly date (e.g., "Monday, March 10") |

### UI (`components/food-truck/social-post-generator.tsx`)

- Today's schedule with "Generate Post" buttons
- Template selector dropdown
- Platform selector (Instagram, Facebook, Twitter/X, TikTok)
- Editable textarea for generated text
- Prominent "Copy to Clipboard" button
- Template management (create/delete custom templates)
- Post history (last 10)

### Page

`app/(chef)/food-truck/social/page.tsx` (server component, requireChef())

---

## Database dependencies

Both features rely on tables from `supabase/migrations/20260331000016_food_truck_locations_and_schedule.sql`:

- `truck_locations` - location roster (name, address, permit info)
- `truck_schedule` - daily schedule with post-service metrics (revenue_cents, actual_covers)

Social features reference `truck_post_drafts` and `truck_post_templates` tables. If these don't exist yet, the actions gracefully return empty results or defaults. A migration can be created later to persist post history and custom templates.

## Design decisions

- **Formula > AI**: All calculations and text generation are deterministic. No Ollama dependency.
- **Amounts in cents**: All financial values use `revenue_cents` (integer minor units).
- **Tenant scoping**: Every query filters by `tenantId` from authenticated session.
- **Graceful degradation**: If tables don't exist or have no data, the UI shows empty states (not errors or fake data).
- **No direct social integrations**: Copy-paste is simple, reliable, and works everywhere.
