# Dinner Circle Phase 3: Polish and Integration

## What changed

### 1. Notification Preferences Wired In

The `NotificationPreferences` component (built in Phase 2) is now fully connected:

- **Server action**: `updateMemberNotificationPreferences` in `lib/hub/group-actions.ts` saves preferences to `hub_group_members` (email, push, digest mode, quiet hours, mute)
- **UI integration**: The mute/bell button in the hub header now opens a dropdown popover with the full notification preferences panel
- **Any member** can access their own notification settings directly from the header
- Click outside to dismiss

### 2. Per-Meal Household Attendance

Family members can now indicate who's eating each meal:

- **Migration**: `20260401000134_hub_meal_attendance.sql` creates the `hub_meal_attendance` table (upsert-safe with unique constraint on meal_entry_id + household_member_id)
- **Server actions** in `lib/hub/household-actions.ts`:
  - `getCircleHouseholdMembers(groupId)`: gets all household members across all profiles in a circle
  - `getMealAttendance(mealEntryId)`: get attendance records for a meal
  - `setMealAttendance(...)`: set single member attendance (upsert)
  - `bulkSetMealAttendance(...)`: set all attendance in one call
- **UI component**: `components/hub/meal-attendance.tsx`
  - Compact view: small colored circles with initials (green=in, amber=maybe, dim=out) plus count
  - Click compact to expand into full toggle buttons
  - Each button shows relationship emoji, name, and status indicator
  - Click to cycle: in -> maybe -> out -> in
  - Auto-saves on every change (no save button needed)
  - Collapse button to return to compact view
- **Integration**: Appears on every populated meal slot in the weekly board (between dietary tags and feedback)

### 3. Existing Schema Discovery

The `hub_household_members` table already existed with a rich schema:

- `display_name`, `relationship` (partner/spouse/child/parent/sibling/assistant/house_manager/nanny/other)
- `age_group` (infant/toddler/child/teen/adult)
- `dietary_restrictions`, `allergies`, `dislikes`, `favorites` arrays
- `notes`, `sort_order`

The attendance feature leverages this existing schema rather than creating duplicate data.

## Design decisions

- **Click-to-expand** over always-visible: meal slots are already dense with title, description, head count, prep notes, dietary tags, and feedback. Compact attendance avatars add minimal visual noise but expand on demand.
- **Auto-save on toggle**: one-tap UX. No save button, no friction. The billionaire's kids tap once, done.
- **Three states** (in/out/maybe): "maybe" accommodates uncertain schedules. Status cycles through all three with a single click.
- **Default everyone to "in"**: until someone explicitly opts out, the chef assumes everyone is eating. Less work for the family.

## Files changed

- `lib/hub/group-actions.ts` - added `updateMemberNotificationPreferences`
- `lib/hub/household-actions.ts` - added 4 attendance actions
- `components/hub/meal-attendance.tsx` - new component
- `components/hub/weekly-meal-board.tsx` - integrated attendance
- `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` - wired notification prefs popover
- `database/migrations/20260401000134_hub_meal_attendance.sql` - new migration
