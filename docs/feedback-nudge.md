# Feedback Nudge Modal

## What Changed

Added a one-time feedback prompt that appears to chefs 7 days after their account was created.

## Files Added

| File | Purpose |
|---|---|
| `lib/feedback/user-feedback-actions.ts` | Server action: inserts a row into `user_feedback` |
| `components/feedback/feedback-nudge-modal.tsx` | Client modal component |

## Files Modified

| File | Change |
|---|---|
| `lib/chef/layout-cache.ts` | Added `business_name` and `created_at` to the `chefs` select query and `ChefLayoutData` type |
| `app/(chef)/layout.tsx` | Imports modal, computes `daysSinceCreation`, conditionally renders `FeedbackNudgeModal` |

## How It Works

1. **Trigger (server-side):** The chef layout computes `differenceInDays(now, chef.created_at)`. If `>= 7`, it renders the `FeedbackNudgeModal` component.

2. **Deduplication (client-side):** On mount, the modal checks `localStorage.getItem('chefflow:feedback-nudge-done')`. If set, it exits immediately and never renders. This is the same pattern used by `CelebrationModal`.

3. **UI:** A centered modal with a 1-second appearance delay. Four emoji sentiment buttons (❤️ Love it / 💡 Suggestions / 😤 Frustrated / 🐛 Found a bug) map 1-to-1 to `user_feedback.sentiment` values. An optional freetext message box appears after a sentiment is selected.

4. **Submission:** Calls `submitUserFeedback()` server action → inserts into `user_feedback` table → sets localStorage key → shows thank-you state. The `user_id` stored is the Supabase auth user ID, role is hardcoded as `'chef'`, and `page_context` is captured as `'/dashboard'`.

5. **Skip:** Clicking "Skip for now" sets the localStorage key without writing a DB row. The modal never appears again.

## Why 7 Days

- Short enough that first impressions are still fresh
- Long enough that the chef has actually run or prepared for at least one event
- Long-term NPS surveys typically use 30-90 days; this is an early-signal prompt, not a recurring survey

## No Migration Needed

The `user_feedback` table was already created in migration `20260313000002_user_feedback.sql`. This feature only adds the UI and server action wrapper.

## Testing

1. Temporarily lower the threshold to `0` days (or set `showFeedbackNudge = true` directly) to test without waiting.
2. Open `/dashboard` → modal should appear after ~1 second.
3. Select a sentiment, optionally type a message, click "Send feedback" → confirm a row appears in Supabase `user_feedback`.
4. Reload → modal does NOT reappear.
5. Clear `localStorage` in DevTools (`localStorage.removeItem('chefflow:feedback-nudge-done')`) → modal reappears.
6. Click "Skip for now" → modal disappears, no new row in `user_feedback`.
