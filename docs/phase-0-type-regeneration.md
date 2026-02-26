# Phase 0: Type Regeneration & @ts-nocheck Cleanup

## What Changed

Regenerated `types/database.ts` from the remote Supabase schema and removed `@ts-nocheck` from 4 files whose underlying database tables now exist in the generated types.

## Why

All 26 migrations were already applied to the remote database, but `types/database.ts` had not been regenerated since the Layer 6+ migrations were added. This left 10 files with `@ts-nocheck` directives -- the code referenced tables (conversations, chat_messages, households, client_notes, etc.) that existed in the DB but not in the TypeScript types.

## What Was Done

### 1. Type Regeneration

- Ran `supabase gen types typescript --linked > types/database.ts`
- Fixed a Supabase CLI output artifact ("Initialising login role..." was captured in the file header)

### 2. @ts-nocheck Removed (4 files)

| File                          | Tables Now Typed                                        | Type Fixes Required                                                                                         |
| ----------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `lib/chat/actions.ts`         | conversations, chat_messages, conversation_participants | Typed `participants` array with `'chef'                                                                     | 'client'`role union; replaced`Record<string, unknown>` insertData with properly typed object |
| `lib/chat/system-messages.ts` | chat_messages                                           | Cast `system_metadata` to `Record<string, string>` for Json compatibility; added `as const` on message_type |
| `lib/households/actions.ts`   | households, household_members                           | Clean -- no type fixes needed                                                                               |
| `lib/notes/actions.ts`        | client_notes                                            | Clean -- no type fixes needed                                                                               |

### 3. @ts-nocheck Remaining (6 files)

| File                                | Reason                                                                   | Resolution Path                                    |
| ----------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| `lib/insights/actions.ts`           | `chat_insights` table not in generated types (despite migration applied) | Investigate why Supabase type gen skips this table |
| `lib/events/fire-order.ts`          | `menu_sections`, `menu_items` tables don't exist                         | Phase 2 schema or move to deferred                 |
| `lib/waste/actions.ts`              | `waste_entries` table doesn't exist                                      | Phase 2 schema or move to deferred                 |
| `lib/scheduling/calendar-sync.ts`   | Needs `google_connections` refactor                                      | Deferred until Google Calendar feature             |
| `lib/analytics/revenue-engine.ts`   | References `total_price` column on events                                | Phase 2 schema or move to deferred                 |
| `lib/analytics/menu-engineering.ts` | `menu_items` table doesn't exist                                         | Phase 2 schema or move to deferred                 |

## Impact

- **TypeScript errors**: 0 (was 0 before, still 0 -- the `@ts-nocheck` files were suppressing their errors)
- **`@ts-nocheck` count**: 10 -> 6 (4 removed)
- **`as any` count**: 138 (unchanged -- these are structural casts, not caused by missing types)
- **Build**: Passes cleanly

## Connection to System

This is the prerequisite for Phase 1 (Code Health), which will address the remaining 6 `@ts-nocheck` files by either moving deferred code to `lib/deferred/` or building out the missing schema.

## Open Question

The `chat_insights` table exists in migration `20260220000004_chat_insights.sql` (confirmed applied), but is absent from the generated types. This may be a Supabase type generation bug or a schema visibility issue worth investigating.
