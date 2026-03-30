# Spec: Curated Viewer Experience + Silent Mode

> **Status:** built
> **Priority:** P2 (queued)
> **Depends on:** weekly-meal-board.md, meal-feedback.md
> **Estimated complexity:** small (2-3 files)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-29

---

## What This Does (Plain English)

When a circle is configured as a "residency" circle (new group setting), the default experience for non-chef members changes. Instead of landing on Chat, they land on the Meals tab. Notifications are muted by default for new members. The UI is streamlined: meal board front and center, feedback buttons inline, chat accessible but not the primary view. The billionaire opens the link, sees this week's meals, taps a thumbs up on last night's dinner, and closes the app. 10 seconds, zero friction.

---

## Why It Matters

The default hub experience is chat-first (social, conversational). For a residency chef scenario, the family doesn't want social. They want "what's for dinner." Changing the default landing tab and notification behavior transforms the experience from "group chat with a chef" to "professional meal management dashboard."

---

## Files to Create

None. All changes are to existing files.

---

## Files to Modify

| File                                                                  | What to Change                                                                                                                          |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx`                  | Check group setting for `default_tab`, use it as initial `activeTab` state instead of hardcoded `'chat'`                                |
| `components/hub/hub-group-settings.tsx`                               | Add "Circle Type" setting: Standard (chat-first) or Residency (meals-first). Add "Default Tab" dropdown. Add "Silent by default" toggle |
| `lib/hub/group-actions.ts`                                            | In `joinHubGroup`, set `notifications_muted = true` if group has `silent_by_default` setting                                            |
| `database/migrations/20260401000128_hub_group_settings_residency.sql` | Add columns to hub_groups for default_tab and silent_by_default                                                                         |

---

## Database Changes

### New Columns on Existing Tables

```sql
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS default_tab TEXT DEFAULT 'chat'
  CHECK (default_tab IN ('chat', 'meals', 'events', 'photos', 'notes', 'members'));

ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS silent_by_default BOOLEAN DEFAULT false;

ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS circle_mode TEXT DEFAULT 'standard'
  CHECK (circle_mode IN ('standard', 'residency'));
```

### Migration Notes

- Timestamp `20260401000128` follows `20260401000127`
- Additive only (new nullable columns with defaults)

---

## Data Model

Three new columns on `hub_groups`:

- `default_tab` - which tab non-chef members see first when opening the circle
- `silent_by_default` - if true, new members join with `notifications_muted = true`
- `circle_mode` - 'standard' (social, chat-first) or 'residency' (meal-board-first, quiet)

When `circle_mode = 'residency'`:

- `default_tab` auto-sets to 'meals' (chef can override)
- `silent_by_default` auto-sets to true
- Welcome card text changes to focus on meals instead of chat

---

## Server Actions

| Action                           | Auth                        | Input                                                      | Output                        | Side Effects                                                                       |
| -------------------------------- | --------------------------- | ---------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| `updateHubGroup` (existing)      | Profile token + owner/admin | Add `circleMode`, `defaultTab`, `silentByDefault` to input | `{ success, group?, error? }` | None                                                                               |
| `joinHubGroup` (modify existing) | None                        | No input change                                            | No output change              | Check `silent_by_default` on group, set member's `notifications_muted` accordingly |

---

## UI / Component Spec

### Group Settings Addition

In the Settings tab (chef/admin only), add a new "Circle Mode" section:

- **Circle Mode** radio: "Standard" (chat-first, social) / "Residency" (meals-first, quiet)
- When "Residency" selected:
  - Default tab auto-sets to "Meals" (editable dropdown)
  - "Silent by default" auto-enables (toggle, can be overridden)
  - Hint text: "Members will see the Meal Board first and join with notifications off"

### Hub Group View Change

Line 44 of `hub-group-view.tsx` currently: `const [activeTab, setActiveTab] = useState<Tab>('chat')`

Change to: `const [activeTab, setActiveTab] = useState<Tab>(group.default_tab as Tab || 'chat')`

### Welcome Card Change

When `circle_mode === 'residency'`, the welcome card (lines 252-280) should say:

- "Welcome to your meal planning circle"
- Bullet points: "See this week's meals", "Give feedback on dishes you loved", "Check dietary info for the household"

---

## Edge Cases and Error Handling

| Scenario                                          | Correct Behavior                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Group has no meals yet but default_tab is 'meals' | Meals tab shows empty state (not broken). Chat still accessible via tabs                       |
| Chef changes mode from standard to residency      | Existing members keep their current notification settings. Only new joiners get silent default |
| default_tab set to a tab that has no content      | Tab still renders with its empty state. Not an error                                           |

---

## Verification Steps

1. Open a circle's Settings tab as chef
2. Change Circle Mode to "Residency" - verify default tab and silent toggles update
3. Save settings
4. Open the circle link in incognito (new member) - verify they land on Meals tab
5. Verify the new member's notifications_muted is true
6. Change mode back to "Standard" - verify landing on Chat
7. Screenshot both modes

---

## Out of Scope

- Per-member tab preferences (everyone gets the same default)
- "Executive view" with simplified UI chrome (just the meal board, no tabs)
- Customizable welcome card content

---

## Notes for Builder Agent

- The critical change is one line in hub-group-view.tsx: the initial state of `activeTab`
- The settings UI follows the existing pattern in `hub-group-settings.tsx`
- The join flow modification in `joinHubGroup` is a simple conditional: check group.silent_by_default before setting notifications_muted on the new member
