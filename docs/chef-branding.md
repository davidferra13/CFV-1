# Chef Branding System

The chef is the brand. ChefFlow is infrastructure.

Every client-facing surface shows the chef's identity (logo, business name, colors). ChefFlow branding appears only as a small "Powered by ChefFlow" footer link for free-tier users, which is removed on Pro.

## Architecture

### Single Source of Truth

`lib/chef/brand.ts` exports `getChefBrand(chefId)`, a cached utility that returns the chef's complete brand data:

```typescript
type ChefBrand = {
  mode: 'text' | 'full' // 'text' = no logo, 'full' = logo uploaded
  businessName: string
  logoUrl: string | null
  profileImageUrl: string | null
  primaryColor: string // accent color, default '#18181b'
  backgroundColor: string // portal background, default '#ffffff'
  backgroundImageUrl: string | null
  isPro: boolean
  showPoweredBy: boolean // true for free tier, false for Pro
}
```

Cached via `unstable_cache` with tag `chef-brand-{chefId}`, revalidated on profile/theme/logo updates.

### Cache Invalidation

The following actions call `revalidateTag(chefBrandTag(chefId))`:

- `updateChefFullProfile` (lib/chef/profile-actions.ts)
- `uploadChefLogo` (lib/chef/profile-actions.ts)
- `updateChefPortalTheme` (lib/profile/actions.ts)
- `uploadChefPortalBackgroundImage` (lib/profile/actions.ts)

## Surfaces

### PDFs (Quotes, Invoices, Contracts)

- `lib/documents/pdf-layout.ts` - `brandedHeader(brand, logoBase64)` renders logo or business name with accent color bar
- `lib/documents/logo-utils.ts` - `fetchLogoAsBase64(logoUrl)` converts logo to base64 data URI for jsPDF
- `lib/documents/generate-quote.ts`, `generate-invoice.ts`, `generate-contract.ts` all fetch brand automatically

### Emails (All 48 notification functions)

- `lib/email/brand-helpers.ts` - `getEmailBrand(chefId)` bridges brand data to email templates
- `lib/email/templates/base-layout.tsx` - Header shows chef logo + name, footer shows "Powered by ChefFlow" (free) or subtle link (Pro)
- All 48 functions in `lib/email/notifications.ts` accept `chefId?: string` and pass brand + fromName

### Guest Portal

- `app/(public)/event/[eventId]/guest/[secureToken]/page.tsx` fetches brand via `portal.chefId`
- `portal-client.tsx` renders branded header (logo + name) and powered-by footer
- Submit button uses chef's `primaryColor` as accent

### Staff Portal

- `app/(public)/staff-portal/[id]/page.tsx` fetches brand via `result.chefId`
- Renders branded header and powered-by footer in server component

### Embeddable Widget

- `app/api/embed/brand/[chefId]/route.ts` - Public API returning brand data (CORS enabled, CDN cached)
- `public/embed/chefflow-widget.js` - Auto-fetches brand when no explicit `data-accent` is set. Button text defaults to "Book with {businessName}"

### Public Chef Profile

- `app/(public)/chef/[slug]/page.tsx` - OG metadata uses `display_name || 'ChefFlow'` as siteName

## Free vs Pro

| Surface      | Free Tier                                              | Pro Tier                                |
| ------------ | ------------------------------------------------------ | --------------------------------------- |
| Emails       | Chef logo/name in header, "Powered by ChefFlow" footer | Chef logo/name in header, no powered-by |
| PDFs         | Chef branded header, "Powered by ChefFlow" footer      | Chef branded header, no powered-by      |
| Guest Portal | Chef header, powered-by footer                         | Chef header, no footer                  |
| Staff Portal | Chef header, powered-by footer                         | Chef header, no footer                  |
| Embed Widget | Auto-fetches brand colors                              | Auto-fetches brand colors               |

## Adding Brand to New Surfaces

1. Import `getChefBrand` from `@/lib/chef/brand`
2. Call it with the chef's ID (from session, event, or token lookup)
3. Use `brand.businessName`, `brand.logoUrl`, `brand.primaryColor` for UI
4. Add "Powered by ChefFlow" footer when `brand.showPoweredBy` is true
5. Link footer to `https://cheflowhq.com`
