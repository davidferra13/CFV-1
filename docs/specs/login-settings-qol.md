# Spec: Login & Settings Navigation QoL Fixes

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** small (3 files)
> **Created:** 2026-03-28
> **Built by:** not started

---

## What This Does (Plain English)

Two quick UX paper cuts fixed:

1. **Login page:** When you click "Sign In", two separate loading indicators appear simultaneously (the button spinner saying "Signing In" and a card below it saying "Signing you in..."). One gets removed so there's a single, clean loading state.
2. **Settings nav:** The sidebar has an expandable "Settings" group that, when opened, contains a single "Settings" link. That's a pointless extra click. It becomes a direct link to `/settings` instead. This affects both the desktop sidebar and the mobile nav drawer.

---

## Why It Matters

Both are friction points that make the app feel unfinished. The login double-animation is visually noisy, and the Settings-inside-Settings nesting is confusing.

---

## Files to Create

None.

---

## Files to Modify

| File                                        | What to Change                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/auth/signin/page.tsx`                  | Remove the `SignInProgress` component (lines 46-62) and its render call (line 183). Remove the `LoadingSpinner` import (line 15) since it becomes unused. The `<Button loading={isWorking}>` already shows spinner + text.                                                                                                  |
| `components/navigation/chef-nav.tsx`        | Replace the Settings expandable toggle + collapsible panel (lines 1062-1103) with a single `<Link href="/settings">`. Remove the `settingsOpen` state (line 651) and `filteredSettingsItems` memo (lines 726-730). The `visibleBottomItems` memo (lines 722-724) stays because the collapsed rail mode uses it at line 970. |
| `components/navigation/chef-mobile-nav.tsx` | Same fix: replace the Settings expandable toggle + collapsible panel (lines 843-885) with a single `<Link href="/settings">`. Remove the `mobileSettingsOpen` state and `filteredSettingsItems` memo (lines 575-579). The `visibleBottomItems` memo stays if used elsewhere in the file.                                    |

---

## Database Changes

None.

---

## UI / Component Spec

### Fix 1: Login Loading State

**Before:** User clicks Sign In, sees:

- Button changes to spinner + "Signing In"
- A separate card appears below: spinner + "Signing you in..."
- Then both change to "Signed in successfully"

**After:** User clicks Sign In, sees:

- Button changes to spinner + "Signing In"
- Button changes to "Signed in successfully" on redirect stage
- No separate card below the button

The `SignInProgress` component (lines 46-62) and its render call (line 183) are removed entirely. The button text logic on lines 175-180 already handles all three states (`Sign In` / `Signing In` / `Signed in successfully`), so no replacement is needed.

Also remove the `LoadingSpinner` import from line 15; after deleting `SignInProgress`, nothing else in the file uses it. (`CenteredLoadingState` on the same import line is still used by the `Suspense` fallback.)

### Fix 2: Settings Nav (Desktop Sidebar)

**Before:** Expanded sidebar footer has:

```
[v] Settings          (expandable toggle button)
    > Settings        (link to /settings)
```

**After:** Expanded sidebar footer has:

```
Settings              (direct link to /settings, with Settings icon)
```

Replace the `<button>` toggle (lines 1062-1075) and collapsible `<div>` (lines 1076-1103) with a single `<Link>`. Style it consistently with the existing toggle button (same padding, font, icon size). Use `isItemActive(pathname, '/settings', searchParams)` for the active highlight.

The collapsed rail mode (line 970) already renders Settings as a direct icon link via `visibleBottomItems.map()`. No change needed there.

Dead code to remove:

- `settingsOpen` state (line 651: `useState(true)`)
- `filteredSettingsItems` memo (lines 726-730)

### Fix 3: Settings Nav (Mobile Drawer)

The mobile nav in `chef-mobile-nav.tsx` has the identical expandable Settings pattern (lines 843-885). Apply the same fix: replace with a direct `<Link>` that calls `closeMenu` on click.

Dead code to remove:

- `mobileSettingsOpen` state
- `filteredSettingsItems` memo (lines 575-579)

---

## Edge Cases and Error Handling

| Scenario                             | Correct Behavior                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Sign-in fails (wrong password)       | Button reverts to "Sign In" (already handled, no change needed)                      |
| Settings link active state (desktop) | Highlight when pathname starts with `/settings` (use existing `isItemActive` helper) |
| Settings link active state (mobile)  | Same: highlight via `isItemActive`, close drawer on click                            |
| Collapsed sidebar rail               | No change needed; already renders Settings as a direct icon link                     |

---

## Verification Steps

1. Sign in with agent account at `/auth/signin`
2. Click "Sign In" and confirm only ONE loading indicator shows (the button itself)
3. Confirm the button text cycles: "Sign In" -> "Signing In" (with spinner) -> "Signed in successfully"
4. Confirm successful redirect to dashboard
5. In the desktop sidebar (expanded), confirm "Settings" is a direct link (no expand/collapse chevron)
6. Click "Settings", confirm it navigates to `/settings`
7. Confirm the link shows active state when on any `/settings/*` page
8. Collapse the sidebar to rail mode, confirm Settings icon still works
9. Open the mobile nav drawer (resize browser or use mobile viewport), confirm Settings is a direct link there too
10. Test sign-in failure (wrong password): confirm button reverts to "Sign In" with no leftover loading state

---

## Out of Scope

- Not changing the settings hub page itself (`/settings/page.tsx`)
- Not touching the `loading.tsx` / `Suspense` fallback (those cover page-load, not form submission)
- Not restructuring the settings sub-page navigation within the settings area

---

## Notes for Builder Agent

- `SignInProgress` is only used in one place. Safe to delete the entire function (lines 46-62) and the render line (183).
- `LoadingSpinner` becomes unused after removing `SignInProgress`. Remove it from the import on line 15. Keep `CenteredLoadingState` on the same line (used by the Suspense fallback at line 221).
- `standaloneBottom` export in `nav-config.tsx` stays as-is; it's consumed by multiple files.
- `visibleBottomItems` memo stays in both nav files; the collapsed rail in `chef-nav.tsx` uses it (line 970) and it may be referenced elsewhere in `chef-mobile-nav.tsx`.
- After removing `settingsOpen` / `mobileSettingsOpen` states and `filteredSettingsItems` memos, check whether `ChevronDown` is still imported elsewhere in each file before removing the import.
- The `SignInStage` type and `progressStage` derived variable (line 86) can stay. `SignInStage` is used by `stage` state, and `progressStage` is harmless (though the builder may optionally inline the stage check into the button JSX and remove `progressStage` for cleanliness). Not required.
