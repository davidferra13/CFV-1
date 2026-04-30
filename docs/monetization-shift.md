# Monetization Shift: Pro Paywall to Voluntary Patronage

**Date:** 2026-03-20
**Branch:** `feature/external-directory`
**Doctrine update:** 2026-04-30, see `docs/chefflow-access-revenue-doctrine.md`

## What Changed

ChefFlow moved from a freemium model (Free tier + $29/month Pro tier) to a fully free platform with optional voluntary supporter contributions.

### Motivation

1. **Community growth**: Gating community and social features behind a paywall undermines the network effect needed for a vibrant chef community.
2. **Perceived value mismatch**: $29/month felt disproportionate for the perceived locked features, creating adoption friction.
3. **UX damage**: Pervasive "Pro" badges, lock icons, and "Upgrade to unlock" CTAs throughout the nav created constant upsell pressure. Users felt the app was designed to extract money rather than provide value.
4. **Philosophy alignment**: Broad accessibility and community building take priority over paywall revenue.

## Technical Changes

### Core Infrastructure (Neutralized, Not Deleted)

| File                                  | Change                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `lib/billing/require-pro.ts`          | Now a pass-through; calls `requireChef()` only, never throws `ProFeatureRequiredError` |
| `components/billing/upgrade-gate.tsx` | Now renders `{children}` unconditionally                                               |
| `lib/billing/modules.ts`              | All 4 Pro modules changed to `tier: 'free'`                                            |
| `lib/billing/constants.ts`            | Comments updated; price kept for voluntary contribution flow                           |

### Navigation (Pro Badges Removed)

| File                                        | Change                                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `components/navigation/chef-nav.tsx`        | Removed Pro badge, Lock icon, "Upgrade to unlock" link from both collapsed sections and expanded group sections |
| `components/navigation/chef-mobile-nav.tsx` | Same removals for mobile nav                                                                                    |
| `components/navigation/nav-config.tsx`      | "Subscription & Billing" renamed to "Support ChefFlow"                                                          |

### Billing Page (Redesigned)

| File                                             | Change                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/settings/billing/page.tsx`           | Page title changed to "Support ChefFlow", messaging rewritten                                                             |
| `app/(chef)/settings/billing/billing-client.tsx` | Complete rewrite: removed Free vs Pro comparison, added "Everything is included" list, voluntary "Become a Supporter" CTA |
| `components/billing/upgrade-prompt.tsx`          | Changed from "Upgrade to Pro" to "Support ChefFlow" messaging                                                             |

### Other

| File                    | Change                                                                          |
| ----------------------- | ------------------------------------------------------------------------------- |
| `app/(chef)/layout.tsx` | Comment updated (Remy: "available to all chefs" instead of "Pro tier + admins") |
| `CLAUDE.md`             | Section 6 rewritten: no new `requirePro()` or `<UpgradeGate>` in new code       |

## What Was Preserved

- **83+ `requirePro()` call sites** still compile unchanged (function signature preserved)
- **16+ `<UpgradeGate>` wrappers** still compile unchanged (props signature preserved)
- **Stripe checkout/portal flow** still works for voluntary contributions
- **`PRO_FEATURES` registry** retained for reference
- **`ProFeatureRequiredError`** class still exists (unused but not deleted)

## Revenue Model Going Forward

- Core operating infrastructure stays free
- ChefFlow will never charge a chef simply to price a menu with honest local pricing data
- Voluntary monthly contribution via existing Stripe subscription flow
- "Support ChefFlow" page at `/settings/billing`
- Founding members retain their badge (cosmetic, not functional)
- No feature differentiation between supporters and non-supporters
- Future paid offerings may exist only as additive leverage, automation, scale, compliance, commerce, marketplace, partner, or payment revenue

## Future Considerations

- The Stripe subscription infrastructure can be repurposed if a different monetization model emerges (for example marketplace fees or premium integrations)
- The `requirePro()` and `<UpgradeGate>` infrastructure can be re-activated if needed by restoring the original logic
- Consider adding supporter badges/recognition in the community feed as a soft incentive

## Current Interpretation

This document is implementation history for the March 2026 move away from Pro gating.

It no longer means "all possible future features are free forever." It means ChefFlow removed hostile feature withholding and made the operating foundation accessible.

For the active access and revenue rule set, use `docs/chefflow-access-revenue-doctrine.md`.
