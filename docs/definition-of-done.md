# ChefFlow Definition of Done

## Core Principle

A feature is not done because code exists.

A feature is not done because it renders.

A feature is not done because the happy path worked once.

A feature is done only when it is verified, honest, and protected against drift.

If the app can silently lie, drift out of sync, pretend success, or guide the user to the wrong thing, the feature is not done.

## Built vs Working vs Done

- Built: code was written.
- Working: someone can make it appear to work.
- Done: it is tied to reality, verified in the real UI, handles failure honestly, and has checks that catch drift later.

Do not confuse these stages.

## Non-Negotiable Standard

Every shipped feature must satisfy all of the following:

- The real user can complete the full flow from start to finish in the actual app.
- Every visible label, number, badge, step, and message is accurate.
- Every button does what it says.
- Every success state is backed by a confirmed success from the real system.
- Every failure state is visible and honest.
- Empty state and error state are treated as first-class flows, not afterthoughts.
- The feature is tested after implementation by actually running it.
- There is at least one automated check that would catch the feature drifting out of sync later.

## Interface Philosophy Compliance

Every UI change must comply with the Universal Interface Philosophy (`docs/specs/universal-interface-philosophy.md`). These checks are release blockers:

- Every surface declares a mode from `docs/specs/surface-grammar-governance.md`, and its shell budget matches that mode
- No more than one `primary` button per screen (Section 5)
- No more than 7 items in any nav group, form section, or visible element group (Section 6)
- No more than 2 hero metrics on any dashboard (Section 6)
- Every data component handles all five states: Empty, Loading, Loaded, Error, Partial (Section 7)
- No anti-patterns from the banned list: cluttered dashboards, vanity metrics, redundant controls, competing CTAs, hidden critical actions, empty feature shells (Section 11)
- Every new widget passes the vanity metric test: "What decision would I make differently based on this number?" (Section 11)
- Every routine data entry task passes the notepad test: completable in under 10 seconds (Section 9)
- All clickable elements have `cursor-pointer` (buttons get it by default; custom clickables need it explicitly)
- All animations respect `prefers-reduced-motion` (no decorative motion for users who opt out)
- Responsive layout verified at 375px, 768px, 1024px, and 1440px (no horizontal scroll, no content behind fixed navbars)

## Release Blockers

Any one of these means the feature is not done:

- The UI claims something happened, but the system did not confirm it.
- A page shows fake, default, or placeholder values as if they are real.
- A button, link, or action is visible but not actually functional.
- A walkthrough step points to the wrong thing.
- A walkthrough step cannot find its target and still keeps talking.
- Progress is marked complete without proving the user actually completed the task.
- A route visit is treated as proof of successful onboarding or successful usage.
- The happy path works, but loading, error, or empty states are broken or misleading.
- The feature works only because someone manually set up the perfect conditions.
- A later UI change can break the feature without any automated signal.

## Truth Over Smoothness

ChefFlow must prefer honest failure over polished lying.

- Fail closed when correctness matters.
- If the system cannot verify the target, data, or state, it must say so.
- Do not fall back to generic success language when the real target is missing.
- Do not auto-complete progress based on guesses.
- Do not hide broken wiring behind graceful-looking UI.

Smooth lies are product debt. Honest friction is fixable.

## Onboarding and Guided Tours

Onboarding has a higher bar than normal UI because it teaches the product. If onboarding is wrong, it trains users incorrectly and destroys trust fast.

An onboarding system is only done if:

- Every step is attached to a real element on the live page.
- The target exists on the actual route for the actual role.
- The overlay points to the exact control the user needs.
- The descriptive text matches the current UI, not an older version of it.
- Desktop and mobile positioning are both checked when both experiences exist.
- Missing targets fail visibly for the team and do not silently fall back to fake guidance for the user.
- Completion is based on verified interaction, not just "user visited the page."
- There is an automated test that checks every configured tour target still exists.
- There is a full manual walkthrough pass before the work is called done.

These are forbidden for onboarding:

- "Good enough."
- "The page probably still has that element."
- "At least the tooltip still shows."
- "We can fix the broken steps later."
- "The config is correct, so the tour is correct."

## Proof Required

Before calling a feature done, there must be proof:

- Real execution in the app.
- Real screenshots or recorded verification when appropriate.
- Real handling of failure cases.
- Real confirmation that the final UI matches the implementation.
- Real automated coverage for the most likely drift points.

If there is no proof, there is no done.

## Required Questions Before Marking Done

Ask all of these:

- What exactly proves this feature works in the real app?
- What would break if the page structure changes tomorrow?
- What prevents the UI from lying if the backend fails?
- What prevents onboarding text from drifting away from the real page?
- What automated check will catch this before a user does?
- What happens on empty, loading, and error states?
- What would make this feature embarrassingly wrong in front of a customer?

If the answers are weak, the feature is not done.

## Working Rule for ChefFlow

Use this sentence as the standard:

> Done means verified, honest, and resilient against drift.

Anything less is built. Maybe working. Not done.
