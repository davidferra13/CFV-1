# Partner Mobile Sign-Out Footer

## Scope

Portal sign-out placement only, for the partner portal mobile navigation.

## Single Highest-Leverage Remaining Action

Add a partner mobile navigation drawer/sheet that exposes all partner routes and places `Sign out` in a dedicated footer section pinned below the nav list.

## Why This Is The Highest-Leverage Remaining Action

- The desktop partner sidebar already has a separated footer sign-out, but the mobile partner nav has no sign-out affordance at all.
- The partner layout renders `PartnerMobileNav` across partner pages, so fixing this component closes the remaining gap for the partner portal without touching unrelated portals.
- Other mobile portal shells already separate sign-out from the main nav list, so the partner portal is now the outlier.

## Evidence

- `PartnerMobileNav` currently renders only four top links and no sign-out control: [components/navigation/partner-nav.tsx](C:/Users/david/Documents/CFv1/components/navigation/partner-nav.tsx:89), [components/navigation/partner-nav.tsx](C:/Users/david/Documents/CFv1/components/navigation/partner-nav.tsx:94), [components/navigation/partner-nav.tsx](C:/Users/david/Documents/CFv1/components/navigation/partner-nav.tsx:95)
- The partner layout mounts `PartnerMobileNav` for the portal shell, so this is the correct scoped entry point: [app/(partner)/partner/layout.tsx](<C:/Users/david/Documents/CFv1/app/(partner)/partner/layout.tsx:45>), [app/(partner)/partner/layout.tsx](<C:/Users/david/Documents/CFv1/app/(partner)/partner/layout.tsx:51>)
- Desktop partner already follows the requested separated-footer pattern, confirming intended behavior for this portal: [components/navigation/partner-nav.tsx](C:/Users/david/Documents/CFv1/components/navigation/partner-nav.tsx:67), [components/navigation/partner-nav.tsx](C:/Users/david/Documents/CFv1/components/navigation/partner-nav.tsx:74)
- Comparable mobile patterns already exist in other portals with sign-out separated by a top border/footer block:
  - Client: [components/navigation/client-nav.tsx](C:/Users/david/Documents/CFv1/components/navigation/client-nav.tsx:330)
  - Admin: [components/navigation/admin-shell.tsx](C:/Users/david/Documents/CFv1/components/navigation/admin-shell.tsx:345)
  - Chef: [components/navigation/chef-mobile-nav.tsx](C:/Users/david/Documents/CFv1/components/navigation/chef-mobile-nav.tsx:697)

## Build Exactly This

Update `PartnerMobileNav` in `components/navigation/partner-nav.tsx` to:

1. Keep the existing quick-access mobile top nav behavior intact for the current primary links.
2. Add a fifth mobile action for `Menu` or `More` that opens a slide-out drawer/sheet.
3. In that drawer/sheet, render the full `NAV_ITEMS` list, including `Preview Page`.
4. Add a dedicated footer section after the nav list, separated by a top border and spacing, containing a single `Sign out` button.
5. Reuse the existing partner sign-out redirect target: `/auth/signin?portal=partner`.
6. Close the drawer when a nav item is chosen or after sign-out is triggered.

## Constraints

- Additive only. Do not remove existing routes or change desktop partner sidebar behavior.
- Stay within partner portal nav scope. Do not edit client, chef, admin, or staff shells.
- Do not break the current mobile quick-nav affordance.
- Match existing portal visual language: dark stone palette, rounded buttons, border-separated footer.

## Files To Change

- `components/navigation/partner-nav.tsx`

## Suggested Implementation Shape

- Introduce `useState(false)` for `menuOpen`.
- Add a `closeMenu()` helper.
- Extend the mobile top bar with a `Menu` trigger icon/button.
- When open, render:
  - backdrop overlay
  - side drawer container
  - nav list for all `NAV_ITEMS`
  - footer block with separated `Sign out`
- Reuse the existing `handleSignOut` behavior pattern already used in the same file for desktop.

## Acceptance Criteria

- On mobile partner pages, the user has a visible path to sign out from portal navigation.
- `Sign out` is visually separated from the main nav links by border and spacing.
- `Preview Page` is reachable from the mobile menu.
- Desktop partner sidebar remains unchanged in behavior.
- Logout redirects to `/auth/signin?portal=partner`.
- `npx eslint "components/navigation/partner-nav.tsx"` passes.
