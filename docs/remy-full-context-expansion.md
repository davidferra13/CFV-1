# Remy — Full Context Expansion (All Remaining Gaps Closed)

**Date:** 2026-02-22
**Branch:** feature/risk-gap-closure

## What Changed

Remy's context was expanded from 19 data tables to coverage of the entire ChefFlow database. Every question a chef could reasonably ask Remy can now be answered from real data.

## New Always-Available Context (Tier 2, cached 5 min)

These are loaded on every Remy message, regardless of what page the chef is on:

| Domain                      | What Remy Now Knows                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Calendar & availability** | Blocked dates (next 30 days), calendar entries (vacations, time off, markets, etc.), and waitlist entries                |
| **Year-to-date stats**      | Total revenue, total expenses, net profit, event count, completed count, avg revenue per event, top 5 clients by revenue |
| **Staff roster**            | All active staff with name, role, phone                                                                                  |
| **Equipment inventory**     | Total item count and categories owned                                                                                    |
| **Active goals**            | Title, target date, progress %, status                                                                                   |
| **Todo list**               | Pending/in-progress items with due dates and priority                                                                    |
| **Upcoming calls**          | Scheduled calls with client name, time, purpose                                                                          |
| **Documents**               | Total document and folder counts                                                                                         |
| **Recent Remy artifacts**   | Last 5 things Remy created (emails, drafts, etc.)                                                                        |

## Enhanced Entity Loaders (Tier 3, per-page)

| Entity      | New Data                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------ |
| **Events**  | After-action reviews (rating, went well, to improve, lessons learned, would repeat)              |
| **Clients** | Client notes (up to 10, with category and date) + client reviews (up to 5, with rating and text) |

## System Prompt Updates

- 10 new context sections added to `buildRemySystemPrompt`
- Grounding rule rewritten to enumerate all available data domains by context (always available vs. page-specific)
- Remy now instructed to "never say 'I don't have that info' if it's in one of these sections"

## Architecture

- All new queries added to `loadDetailedContext` as parallel `Promise.all` members (14 new queries, all indexed and limited)
- Top clients computation: aggregates ledger entries by client_id YTD, then resolves names
- CachedContext type updated to properly exclude non-cached fields
- Non-blocking pattern maintained throughout

## Files Modified

- `lib/ai/remy-types.ts` — Added 9 new optional fields to `RemyContext`
- `lib/ai/remy-context.ts` — 14 new parallel queries in `loadDetailedContext`, AAR query in `loadEventEntity`, client notes + reviews in `loadClientEntity`
- `app/api/remy/stream/route.ts` — 10 new system prompt sections, rewritten grounding rule

## Questions Remy Can Now Answer

- "Am I free next Saturday?" — checks availability blocks + calendar entries
- "What's my total revenue this year?" — year-to-date stats
- "Which client tips the most?" / "Who's my best client?" — top clients by revenue
- "How many staff do I have?" — staff roster
- "Do I have a sous vide machine?" — equipment inventory
- "What are my goals?" — active goals with progress
- "What's on my todo list?" — pending todos
- "When's my next call?" — scheduled calls
- "What contracts do I have?" — document counts
- "What did you write for me?" — recent Remy artifacts
- "What notes did I make about this client?" — client notes
- "What reviews did this client leave?" — client reviews
- "What went wrong at this event?" — after-action reviews
- "Who's on my waitlist?" — waitlist entries
