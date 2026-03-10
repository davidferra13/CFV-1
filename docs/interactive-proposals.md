# Interactive Proposals with Photos

**Date:** 2026-03-09
**Branch:** `feature/risk-gap-closure`
**Status:** Implemented, pending migration push

## What Changed

Upgraded the Smart Proposal system from a text-only quote page to a visual, Curate-style interactive proposal experience. Clients now see dish photos, chef info, galleries, testimonials, and a personal message alongside the pricing/contract/payment flow.

## New Files

| File                                                           | Purpose                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `supabase/migrations/20260330000099_interactive_proposals.sql` | Adds `proposal_sections` table + `cover_photo_url`/`chef_message` columns on `quotes`      |
| `components/proposal/proposal-hero.tsx`                        | Full-width cover photo hero with gradient overlay, or graceful fallback to original header |
| `components/proposal/proposal-chef-info.tsx`                   | About the Chef section (avatar, bio, tagline)                                              |
| `components/proposal/proposal-gallery.tsx`                     | Photo gallery grid with lightbox (keyboard nav, swipe)                                     |
| `components/proposal/proposal-section-editor.tsx`              | Chef-side editor for adding/ordering/editing proposal sections                             |
| `lib/proposal/types.ts`                                        | Shared type definitions for `ProposalSection` and `SectionType`                            |

## Modified Files

| File                                        | Changes                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/proposal/proposal-services.tsx` | Added photo support: dish cards with images in responsive grid (1/2/3 col), dietary tag badges, graceful text-only fallback when no photos                                                                                                                                                                    |
| `components/proposal/proposal-flow.tsx`     | Swapped `ProposalHeader` for `ProposalHero`, integrated chef info, gallery, text sections, testimonials from `proposalSections`                                                                                                                                                                               |
| `lib/proposal/actions.ts`                   | `getProposalByToken` now fetches menu+dishes, chef profile (bio/tagline/profile_image_url), cover_photo_url, chef_message, and proposal_sections. Added 5 new server actions: `getProposalSections`, `upsertProposalSection`, `reorderProposalSections`, `deleteProposalSection`, `updateQuoteProposalFields` |

## Database Changes (Migration 20260330000099)

**New table: `proposal_sections`**

- `id`, `quote_id`, `tenant_id`, `section_type` (hero/menu/text/gallery/testimonial/divider)
- `title`, `body_text`, `photo_url`, `photo_urls` (text array), `sort_order`, `is_visible`
- RLS: chef owns, service_role has full access

**New columns on `quotes`:**

- `cover_photo_url TEXT` - hero cover photo for the proposal
- `chef_message TEXT` - personal note from chef to client

All changes are additive. No existing columns or tables modified.

## How It Works

### Client-Facing Flow

1. Client opens proposal link (`/proposal/[token]`)
2. If the quote has a `cover_photo_url`, they see a full-width hero with gradient overlay
3. Menu section displays dishes grouped by course with photos (from `dishes.photo_url`)
4. Chef info section shows bio and tagline (from `chefs` table)
5. Text, testimonial, and gallery sections render from `proposal_sections`
6. Add-ons, contract, and payment sections unchanged

### Chef-Side Editor

The `ProposalSectionEditor` component lets chefs build their proposal layout:

- Add sections by type (hero, text, gallery, testimonial, divider, menu)
- Reorder with up/down arrows
- Toggle visibility without deleting
- Inline editing for title, body text, photo URLs
- Saves are persisted via server actions

### Graceful Degradation

- No cover photo: falls back to the original gradient header
- No dish photos: falls back to text-only menu list
- No bio/tagline: chef info section hidden entirely
- No proposal sections: no custom sections rendered (core flow still works)
- The system is fully backward compatible with existing proposals
