# Public Navigation Restructuring

**Date:** 2026-04-04
**Agent:** Builder (Claude Opus 4.6)
**Status:** Implemented

## Problem

The public landing layer exposed too much surface area at once:

- Homepage stacked 6 sections into a single scroll (hero, service categories, featured chefs, how it works, operator CTA, footer)
- Header nav had only 4 hardcoded items (Book a Chef, Browse Chefs, Discover, For Operators)
- Many pages were unreachable from navigation (About, FAQ, Trust Center, Contact, Services, How It Works)
- No centralized nav config (unlike the chef and client portals)
- /about redirected to / (dead page)

## Solution

Applied the same navigation discipline used in the Chef and Client portals to the public layer.

### New Files

| File                                         | Purpose                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `components/navigation/public-nav-config.ts` | Centralized nav config (types, items, footer sections, active state helpers) |
| `app/(public)/services/page.tsx`             | Dedicated services page (extracted from homepage)                            |
| `app/(public)/how-it-works/page.tsx`         | Dedicated how-it-works page (extracted from homepage)                        |

### Modified Files

| File                                      | Change                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `components/navigation/public-header.tsx` | Rebuilt with config-driven nav, dropdown menus for grouped items, proper ARIA                                    |
| `components/navigation/public-footer.tsx` | Rebuilt with config-driven sections, added Company column (About, How It Works, FAQ, Trust Center)               |
| `app/(public)/about/page.tsx`             | Replaced redirect-to-/ with real About page                                                                      |
| `app/(public)/page.tsx`                   | Removed service categories, how-it-works, and operator CTA sections. Homepage is now hero + featured chefs only. |

### Navigation Structure

**Header (desktop):**

- Find a Chef (dropdown): Book a Chef, Browse Chefs, Services
- Discover
- How It Works
- For Operators

**Header (mobile):**

- Same items, groups shown as labeled sections in expandable menu

**Footer (5 columns):**

1. Brand + description
2. Discover: Book a Chef, Browse Chefs, Services, Food Directory, Contact
3. For Operators: Why ChefFlow, Marketplace Chefs, Become a Partner, Operator sign up
4. Company: About, How It Works, FAQ, Trust Center + Legal: Privacy, Terms
5. Newsletter signup

### Design Decisions

1. **Homepage slimmed to hero + featured chefs** - one screen, one purpose. Service categories and how-it-works now live on dedicated pages reachable from nav.
2. **Dropdown menus on desktop** - "Find a Chef" groups three related pages. Closes on outside click and Escape key.
3. **Mobile menu shows groups as labeled sections** - no nested dropdowns on mobile, just clear section headings.
4. **Footer expanded from 4 to 5 columns** - added "Company" column to surface About, How It Works, FAQ, Trust Center.
5. **Active state detection** - uses path matching with nested route support (e.g., /chef/slug activates "Find a Chef" group).

### Page Inventory After Restructuring

All nav-addressable public pages are now reachable from header or footer:

| Page              | Route              | Reachable via                          |
| ----------------- | ------------------ | -------------------------------------- |
| Home              | /                  | Logo click                             |
| Book a Chef       | /book              | Header (Find a Chef dropdown) + Footer |
| Browse Chefs      | /chefs             | Header (Find a Chef dropdown) + Footer |
| Services          | /services          | Header (Find a Chef dropdown) + Footer |
| Discover          | /discover          | Header + Footer                        |
| How It Works      | /how-it-works      | Header + Footer (Company)              |
| For Operators     | /for-operators     | Header + Footer                        |
| About             | /about             | Footer (Company)                       |
| FAQ               | /faq               | Footer (Company)                       |
| Trust Center      | /trust             | Footer (Company)                       |
| Contact           | /contact           | Footer (Discover)                      |
| Privacy           | /privacy           | Footer (Legal)                         |
| Terms             | /terms             | Footer (Legal)                         |
| Marketplace Chefs | /marketplace-chefs | Footer                                 |
| Partner Signup    | /partner-signup    | Footer                                 |

Token-based pages (/proposal/[token], /review/[token], etc.) are intentionally not in nav. They are accessed via secure direct links.
