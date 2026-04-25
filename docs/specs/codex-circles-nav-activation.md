# Codex Build Spec: Circles Nav Activation

> **Purpose:** Add the Circles page to the chef sidebar navigation. The page is fully built at `/circles` but has zero nav entries, making it invisible to users.
>
> **Complexity:** TRIVIAL (one file, one insertion)
>
> **Risk:** NONE (additive only, no existing behavior changed)

---

## STRICT RULES FOR THIS TASK

1. **DO NOT create any new files.**
2. **DO NOT delete any existing code.**
3. **DO NOT modify any files not listed in the "Files to Modify" section.**
4. **DO NOT use em dashes anywhere.** Use commas, semicolons, or separate sentences.
5. **Test your changes by running `npx tsc --noEmit --skipLibCheck` before committing.** Fix any type errors.

---

## What to Build

### 1. Add Circles to the primary nav (`standaloneTop`)

**File:** `components/navigation/nav-config.tsx`

The `standaloneTop` array (starting at line 138) contains the primary sidebar links: Today, Inbox, Events, Culinary, Clients, Finance. Add a Circles entry AFTER Clients and BEFORE Finance.

The icon `MessagesSquare` is already imported at line 59. Do NOT add a duplicate import.

Add this entry to the `standaloneTop` array, between the Clients entry (ends around line 185) and the Finance entry (starts around line 186):

```typescript
  {
    href: '/circles',
    label: 'Circles',
    icon: MessagesSquare,
    coreFeature: true,
    tier: 'primary',
    subMenu: [
      { href: '/circles', label: 'All Circles' },
      { href: '/hub/circles', label: 'Browse Community' },
    ],
  },
```

That is the ONLY change needed.

---

## Files to Modify (Complete List)

| File                                   | Change Type                                |
| -------------------------------------- | ------------------------------------------ |
| `components/navigation/nav-config.tsx` | Add Circles entry to `standaloneTop` array |

**NO OTHER FILES should be modified.**

---

## Done Criteria

1. `npx tsc --noEmit --skipLibCheck` passes with zero errors
2. The sidebar shows "Circles" between "Clients" and "Finance"
3. Clicking "Circles" navigates to `/circles`
4. The submenu shows "All Circles" and "Browse Community"
5. `MessagesSquare` icon is NOT imported a second time (it is already imported at line 59)
6. No em dashes in any file
7. No existing nav entries were moved or removed
