# Spec: App Final Touches

> **Status:** in-progress
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** small (5-8 files, 1 session)
> **Created:** 2026-03-30
> **Built by:** Claude Code (2026-03-30)

---

## What This Does (Plain English)

Extracted from the superseded `app-polish-and-completion.md` after Planner Gate validation found 5 of 7 workstreams already done. This spec covers the two remaining items that have real value: alphabetical nav sorting and renaming user-facing "onboarding" to "Setup."

---

## Why It Matters

Navigation groups are in arbitrary order, making the "All Features" directory harder to scan than it needs to be. And the word "onboarding" appears in user-facing UI when "Setup" or "Get Started" would feel more natural for a chef.

---

## Change 1: Alphabetical Navigation Sort

### Problem

The 15 nav groups in `components/navigation/nav-config.tsx` are in an arbitrary order (Pipeline, Clients, Events, Commerce...). Items within each group are also unsorted. A chef scanning "All Features" has to read every item instead of jumping to the right letter.

### Files to Modify

| File                                              | What to Change                                                                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/navigation/nav-config.tsx`            | Sort the `navGroups` array alphabetically by `label`. Sort `items` within each group alphabetically by `label`. Sort `children` within each item alphabetically by `label`. |
| `components/navigation/all-features-collapse.tsx` | Change default collapsed state from `true` to `false` so groups render expanded when "All Features" is first opened.                                                        |

### What NOT to Change

- `standaloneTop` order stays as-is (those are intentionally ordered by importance, not alphabet)
- `actionBarItems` order stays as-is (daily-driver shortcuts, intentionally curated)
- No group renames (Pipeline, Protection, etc. stay as-is for now)
- No dead link audit (wiring verification already covered this)

### Verification

- Open sidebar, expand "All Features"
- Confirm groups are A-Z
- Confirm items within each group are A-Z
- Confirm standaloneTop and actionBarItems are unchanged

---

## Change 2: Rename "Onboarding" to "Setup" in User-Facing UI

### Problem

The onboarding wizard and related UI still use the word "onboarding" in some user-facing places. "Setup" or "Get Started" feels more natural. The 6-step wizard itself is already rebuilt and working (per `onboarding-overhaul.md`, verified 3/27). This is purely a copy pass.

### Files to Audit and Modify

| File                                                  | What to Change                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `components/dashboard/onboarding-reminder-banner.tsx` | Change any user-visible "onboarding" text to "setup" or "get started"            |
| `app/(chef)/onboarding/page.tsx`                      | Change page title/heading from "Onboarding" to "Setup" (URL stays `/onboarding`) |
| `components/onboarding/onboarding-wizard.tsx`         | Change any user-visible "onboarding" text in the wizard UI to "setup"            |

### What NOT to Change

- File names (stay as `onboarding-*.tsx`)
- URL routes (stay as `/onboarding`)
- Internal variable names
- Component names
- The wizard steps themselves (already rebuilt and working)

### Verification

- Navigate to `/onboarding`
- Confirm no user-visible text says "onboarding"
- Check dashboard banner copy
- Confirm wizard still works end-to-end (all 6 steps)

---

## Database Changes

None.

---

## Edge Cases

| Scenario                                      | Correct Behavior                                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Chef has customized nav order via preferences | Alphabetical sort only affects the "All Features" directory, not standaloneTop (which respects saved preferences) |
| Search/Cmd+K results                          | Unaffected. Search indexes by label, not by position in nav.                                                      |
| Mobile nav                                    | Same sort order applies                                                                                           |

---

## Implementation Order

1. Sort navGroups + items + children alphabetically in nav-config.tsx
2. Change all-features-collapse.tsx default to expanded
3. Audit and rename "onboarding" to "setup" in user-facing UI (3 files)
4. Type check
5. Playwright verification (nav sort + onboarding flow)

---

## Notes for Builder Agent

- `nav-config.tsx` is ~2000 lines. Read the full file before sorting. Sorting means reordering the objects in the arrays, not renaming anything.
- The alphabetical sort is on the `label` property, not the `href` or internal `id`.
- Be careful not to change the `standaloneTop` array order. Only sort within `navGroups`.
- For the "onboarding" rename, only change strings that a user would see on screen. Don't rename files, components, or variables.
