# Favorite Chefs Feature

**Date:** 2026-02-21
**Branch:** `feature/risk-gap-closure`
**Status:** Implemented

## What

A simple, fun settings sub-page where chefs list their culinary heroes — celebrity chefs, mentors, or anyone who inspires their cooking — with a reason for each. The list can be shared on social media via clipboard copy.

## Why

Personality-driven content that enriches the chef's profile and gives them a quick social media post idea. Low effort, high engagement potential.

## What Changed

### New Files

| File                                                    | Purpose                                               |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `supabase/migrations/20260322000038_favorite_chefs.sql` | Table, index, trigger, RLS policies                   |
| `lib/favorite-chefs/actions.ts`                         | Server actions: CRUD, reorder, social text generation |
| `app/(chef)/settings/favorite-chefs/page.tsx`           | Settings sub-page (server component)                  |
| `components/favorite-chefs/favorite-chef-editor.tsx`    | Client editor: inline CRUD + share button             |

### Modified Files

| File                                   | Change                                           |
| -------------------------------------- | ------------------------------------------------ |
| `app/(chef)/settings/page.tsx`         | Added link card in "Profile & Branding" category |
| `components/navigation/nav-config.tsx` | Added shortcut to `settingsShortcutOptions`      |

## Architecture

- Mirrors the **Profile Highlights** pattern exactly
- `favorite_chefs` table: UUID PK, `chef_id` FK → `chefs(id)`, text fields, sort order
- RLS: chef CRUD on own rows + public SELECT for future public profile display
- Social sharing via `generateSocialText()` → clipboard copy (no direct social planner integration)

## Tier

**Free** — no Pro gating. Fun profile enrichment for all chefs.

## Future Enhancements

- Display on public chef profile page
- Image upload via Supabase Storage (currently URL-only)
- Direct post to social planner
- Drag-and-drop reorder
