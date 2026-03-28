# Login & Settings Navigation QoL Fixes - Follow-up

**Spec:** `docs/specs/login-settings-qol.md`
**Date:** 2026-03-28
**Status:** Built

## What Changed

### 1. Sign-in page: removed duplicate loading indicator

Previously, clicking "Sign In" showed two simultaneous loading indicators:

- The button itself (spinner + "Signing In" text)
- A separate card below the button (spinner + "Signing you in..." text)

Now only the button loading state remains. The `SignInProgress` component and its `LoadingSpinner` import were removed entirely. The button already handles all three states: "Sign In" (idle), "Signing In" (authenticating), and "Signed in successfully" (redirecting).

**File:** `app/auth/signin/page.tsx`

### 2. Desktop sidebar: Settings is now a direct link

Previously, the expanded sidebar had an expandable "Settings" toggle that, when opened, contained a single "Settings" link pointing to `/settings`. This was a pointless extra click.

Now "Settings" is a direct `<Link>` to `/settings` with a gear icon. The collapsed rail mode was already a direct icon link and required no changes.

Removed dead code: `settingsOpen` state, `filteredSettingsItems` memo.

**File:** `components/navigation/chef-nav.tsx`

### 3. Mobile nav drawer: same Settings fix

The mobile slide-out menu had the identical expandable Settings pattern. Replaced with a direct link that also closes the menu on click.

Removed dead code: `mobileSettingsOpen` state, `filteredSettingsItems` memo, unused `visibleBottomItems` memo, unused `standaloneBottom` import.

**File:** `components/navigation/chef-mobile-nav.tsx`

## Verification

- Sign-in page: single loading indicator confirmed via Playwright screenshot
- Sign-in error state: button reverts to "Sign In" correctly
- Desktop sidebar: "Settings" renders as direct link with gear icon, active state works
- Collapsed rail: unchanged, still works as direct icon link
- TypeScript: zero new errors (pre-existing errors in unrelated files only)
