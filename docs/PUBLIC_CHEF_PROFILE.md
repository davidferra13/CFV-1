# Public Chef Profile & Partner Showcase

## Overview

A public-facing page where anyone can discover a chef's partner venues (Airbnbs, hotels, B&Bs), browse seasonal photo galleries, and click through to book a stay and hire the chef — all from one beautiful page. This creates a virtuous referral loop: clients discover partners, partners discover clients, and the chef sits at the center.

---

## Public URL Structure

```
/chef/[slug]
```

Example: `chefflow.com/chef/chef-david`

The slug is set by the chef in Settings → Public Profile. It must be:
- Lowercase letters, numbers, and hyphens only
- Unique across all chefs
- Stored in `chefs.slug` column

---

## Profile Actions (`lib/profile/actions.ts`)

| Function | Auth | Description |
|----------|------|-------------|
| `getPublicChefProfile(slug)` | None (public) | Returns chef name, business name, tagline, bio, profile image, and all showcase-visible partners with locations and images. Uses admin client. |
| `updateChefSlug(slug)` | Chef | Set/change slug with uniqueness check and format validation |
| `updateChefTagline(tagline)` | Chef | Update public tagline |
| `getChefSlug()` | Chef | Returns current chef's slug and tagline for settings display |

### Public Data Shape

```typescript
{
  chef: {
    display_name: string
    business_name: string | null
    tagline: string | null
    bio: string | null
    profile_image_url: string | null
  }
  partners: Array<{
    id: string
    name: string
    partner_type: string
    booking_url: string | null
    description: string | null
    cover_image_url: string | null
    partner_locations: Array<{
      id: string
      name: string
      city: string | null
      state: string | null
      booking_url: string | null
      description: string | null
      max_guest_count: number | null
    }>
    partner_images: Array<{
      id: string
      image_url: string
      caption: string | null
      season: string | null
      display_order: number
      location_id: string | null
    }>
  }>
}
```

---

## Public Page (`app/(public)/chef/[slug]/page.tsx`)

Server component inside the existing `(public)` route group.

### Sections

1. **Hero** — Chef profile image (or initials fallback), display name, business name, tagline, bio
2. **Partner Showcase Grid** — 2-column responsive grid of partner cards
3. **CTA Section** — "Ready to Book?" call-to-action at the bottom

### SEO

- Dynamic `metadata` with chef name and tagline
- Clean URL structure

---

## Partner Showcase (`components/public/partner-showcase.tsx`)

The showcase is the centerpiece — a grid of beautiful partner cards.

### Partner Card Features

- **Cover Image** — Full-width hero image with type badge overlay (Airbnb, Hotel, Venue, etc.)
- **Fallback** — Gradient placeholder when no cover image
- **Description** — Partner's public description
- **Locations** — Each location shown with:
  - Name and city/state
  - Guest capacity (`Users` icon)
  - Location-specific booking link
- **Seasonal Photo Gallery** — Expandable gallery with:
  - Season filter buttons (All, Spring, Summer, Fall, Winter)
  - Image grid with captions and season tags
  - Hover zoom effect
- **Action Buttons**:
  - "Book This Venue" → partner's booking URL (external link)
  - "Hire [Chef Name]" → contact page

### Seasonal Gallery

Images tagged with `season` (spring/summer/fall/winter) can be filtered to show how a venue looks year-round. Images without a season tag appear in all views. This lets partners showcase their properties beautifully across all seasons.

---

## Chef Settings (`app/(chef)/settings/public-profile/page.tsx`)

### Settings Page

Accessible from Settings → Public Profile section.

### Features

1. **Profile URL** — Set/edit slug with live preview of the full URL
2. **Tagline** — Edit the subtitle shown below the chef's name
3. **Partner Showcase Toggles** — Per-partner checkbox to show/hide on public profile

### Component

`PublicProfileSettings` (`components/settings/public-profile-settings.tsx`) — Client component handling:
- Slug editing with input validation (lowercase, alphanumeric, hyphens)
- Tagline textarea
- Partner showcase visibility toggles (calls `updatePartner` to flip `is_showcase_visible`)
- Save with optimistic UI feedback

---

## Privacy & Security

1. **Public data is opt-in** — Partners only appear on the showcase when `is_showcase_visible = true`
2. **No private fields exposed** — `notes`, `commission_notes`, internal stats are never included in public queries
3. **Admin client pattern** — Public queries use `createServerClient({ admin: true })` to bypass RLS, matching the existing share-page pattern. The RLS public SELECT policy serves as an additional safety layer.
4. **No auth required** — The public page is fully accessible without login

---

## The Referral Loop

```
Client visits chef's public profile
  → Discovers partner venues (Airbnbs, hotels, B&Bs)
  → Books a stay via partner's booking URL
  → Hires the chef for their stay

Partner refers a new client
  → Client inquiry linked to partner
  → Chef tracks attribution in analytics
  → Monthly report shows partner the value
  → Partner is motivated to refer more
```

This creates a self-reinforcing flywheel where the chef's public profile acts as a discovery hub connecting clients with partner venues.

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/profile/actions.ts` | Public profile server actions |
| `app/(public)/chef/[slug]/page.tsx` | Public profile page |
| `components/public/partner-showcase.tsx` | Showcase grid and cards |
| `app/(chef)/settings/public-profile/page.tsx` | Showcase settings page |
| `components/settings/public-profile-settings.tsx` | Settings client component |

## Files Modified

| File | Change |
|------|--------|
| `app/(chef)/settings/page.tsx` | Added "Public Profile" section with link and URL preview |
