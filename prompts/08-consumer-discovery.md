# BUILD: Consumer Discovery Layer

## Context

ChefFlow is a Next.js + PostgreSQL (Drizzle ORM) + Auth.js v5 private chef operations platform. Read `CLAUDE.md` before doing anything. The spec exists at `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md` - READ IT.

## Problem

A consumer visiting ChefFlow's public site has no intuitive way to find and hire a chef. The current state:

- `/book` is a cold form with no browsing
- `/chefs` or `/nearby` exists but is disconnected from booking
- No menu/photo-aware discovery
- Gift cards not discoverable from public nav
- After open booking submission: "sent to N chefs" with zero chef cards or profiles to browse
- No buyer education for someone who has never hired a private chef

## What to Build

### 1. Chef Discovery Page Enhancement

- Find the chef listing/directory page (likely `/chefs`, `/nearby`, or `/discover`)
- Add: chef photos, cuisine tags, service types, starting price range, availability indicator
- Add filters: cuisine type, location, service type (dinner party, meal prep, cooking class), price range
- Each chef card links to their profile page
- If chef profile pages exist (`/chef/[slug]`), verify they're compelling and have a clear "Inquire" or "Book" CTA

### 2. Open Booking Success Improvement

- After `/book` submission, instead of just "sent to N chefs":
  - Show chef cards/profiles that the booking was sent to (if matching logic exposes them)
  - OR show "Browse chefs while you wait" with a link to the discovery page filtered by their criteria
  - Include the booking status link (from prompt 03 if built, otherwise a "we'll email you" message)

### 3. Gift Card Discovery

- Gift cards currently only accessible from chef portal nav
- Add gift card discovery to public navigation or a dedicated public page
- Consumer should be able to: browse chefs who offer gift cards, purchase one from a specific chef's profile
- Check existing gift card implementation: search for `gift` in routes and components

### 4. "How It Works" / Buyer Education

- Check if `/how-it-works` exists. If so, read it and improve. If not, create it.
- Simple 3-4 step explanation: Browse chefs -> Submit inquiry -> Get a proposal -> Book and enjoy
- Include: typical pricing ranges, what to expect, FAQ
- Link from homepage, chef directory, and booking page
- This is NOT a marketing page. It's practical education for someone who has never hired a private chef.

### 5. Public Navigation Cohesion

- Ensure public nav includes: Home, Find a Chef, How It Works, Gift Cards (if built)
- Read existing public layout (`app/(public)/layout.tsx`) and nav components
- Add missing links. Remove dead links.

## Key Files to Read First

- `CLAUDE.md` (mandatory)
- `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md` (full spec)
- `app/(public)/` - all public pages and layout
- `app/(public)/book/` - booking flow
- Search for `gift` in routes and components
- Search for `how-it-works` in routes
- `app/(public)/chef/` or `app/(public)/chefs/` - chef profiles
- `components/public/` - public-facing components
- `docs/specs/universal-interface-philosophy.md` - UI philosophy

## Rules

- Read CLAUDE.md fully before starting
- No em dashes anywhere
- "OpenClaw" must never appear in any user-facing surface
- Public pages = no auth required
- Follow existing public page patterns (layout, styling, components)
- Test with Playwright / screenshots
- Images: use existing chef photos if available, placeholder silhouettes if not
- Price ranges should come from real data (chef settings), not hardcoded
- SEO: add appropriate meta tags and structured data (JSON-LD) to new public pages
