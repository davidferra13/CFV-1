# Build Task: Storytelling/Reporting:
**Source Persona:** drew-nieporent
**Gap Number:** 4 of 5
**Severity:** MEDIUM

## What to Build
Implement a feature in the `lib/ai/social-captions.ts` file to generate social media captions for events, menus, and tone. The captions will be based on event details and chef information, and will include hashtags and character count.

## Files to Modify
- `lib/ai/social-captions.ts` -- Add new functions to generate Instagram, Facebook, Twitter, and LinkedIn captions using the event data and chef info from the existing `generateSocialCaptions` function.

## Files to Create (if any)
No new files needed for this task.

## Implementation Notes
- Utilize the existing `generateSocialCaptions` function to fetch event details and chef information.
- Implement separate caption generation logic for each social media platform, considering their character limits and preferred tone.
- Include relevant hashtags based on the event type, menu items, and chef's specialty.
- Ensure the generated captions are of high quality and engaging for the target audience.

## Acceptance Criteria
1. The new functions can generate Instagram, Facebook, Twitter, and LinkedIn captions using event details and chef information.
2. Captions include relevant hashtags and adhere to each platform's character limit.
3. Generated captions are grammatically correct and engaging for the target audience.
4. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to this change.

## DO NOT
- Modify other files not listed above.
- Add new npm dependencies specifically for this task.
- Change the existing database schema or delete functionality unrelated to this feature.
- Use em dashes anywhere in the code.