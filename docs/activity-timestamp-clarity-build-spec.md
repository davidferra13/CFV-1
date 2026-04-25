# Activity Timestamp Clarity Build Spec

## Scope

Improve the existing activity timestamp experience so chefs can quickly understand what happened, when it happened, and trust the exact time behind relative labels.

This scope is limited to additive UI and utility work around timestamp display in the existing activity surfaces. Do not change database schema, activity capture semantics, auth, routing, or existing feed query behavior.

## Single Highest-Leverage Action Remaining

Build a shared timestamp presentation layer and replace the duplicated relative-time rendering in the chef and client activity feeds.

This is the highest-leverage action because activity data already exists, is already sorted by recency, and already appears in user-facing feeds, but timestamp formatting is duplicated and only shows compact relative labels without exact-time affordances.

## Evidence

- The Activity page is explicitly intended to answer "What did I do last?" and "Where should I pick up?": `app/(chef)/activity/page.tsx:2`.
- Chef activity already comes from `chef_activity_log`, sorted newest-first by `created_at`: `lib/activity/chef-actions.ts:37` and `lib/activity/chef-actions.ts:40`.
- Client activity is already captured into `activity_events`: `lib/activity/track.ts:23` and inserted at `lib/activity/track.ts:34`.
- The shared client activity type already exposes `last_activity`: `lib/activity/types.ts:65`.
- Chef feed currently formats relative time from `entry.created_at`: `components/activity/chef-activity-feed.tsx:46`.
- Chef feed has its own local `formatTimeAgo` implementation: `components/activity/chef-activity-feed.tsx:144`.
- Client feed separately formats relative time from `event.created_at`: `components/activity/client-activity-feed.tsx:73`.
- Client feed has a second local `formatTimeAgo` implementation: `components/activity/client-activity-feed.tsx:146`.

## Product Behavior

Use relative time for fast scanning, with exact timestamps available via native browser tooltip and semantic `<time>` markup.

Default display examples:

- `now`
- `14m ago`
- `3h ago`
- `yesterday`
- `4d ago`
- `Apr 19`
- `Apr 19, 2025`

When a label is provided:

- `Updated 14m ago`
- `Last activity 3h ago`
- `Created Apr 19`

The exact timestamp must be exposed through:

- `<time dateTime="...">`
- `title="Apr 24, 2026 at 4:18 PM"`

## Implementation Requirements

1. Add a shared timestamp utility and component.

Recommended files:

- `lib/time/format-relative-time.ts`
- `components/ui/activity-timestamp.tsx`

The utility should export:

- `formatRelativeTime(input: string | Date, now?: Date): string`
- `formatExactTimestamp(input: string | Date): string`

The component should export:

- `ActivityTimestamp`

Suggested props:

```ts
type ActivityTimestampProps = {
  at: string | Date | null | undefined
  label?: string
  className?: string
  fallback?: string
}
```

Behavior:

- Return `fallback ?? null` if `at` is missing or invalid.
- Render semantic `<time>`.
- Use compact, readable relative text.
- Use exact local timestamp in `title`.
- Preserve existing small muted styling unless caller overrides `className`.
- Keep output stable during server/client render where possible. This component will be used in client components first.

2. Replace duplicated timestamp rendering in:

- `components/activity/chef-activity-feed.tsx`
- `components/activity/client-activity-feed.tsx`

Remove the local `formatTimeAgo` functions from both files.

3. Preserve existing layout.

The new timestamp must not change row height materially, wrapping behavior, links, badges, or hover behavior.

4. Add tests for the utility.

Use the repo's existing test framework/pattern if present. If no nearby test pattern exists, add a focused unit test near the utility using the established project test command.

Test cases should cover:

- under 1 minute => `now`
- minutes
- hours
- yesterday
- days under 7
- current-year absolute date
- prior-year absolute date
- invalid input fallback behavior at the component level if practical

5. Verify.

Run the narrowest relevant checks available in the repo:

- Typecheck for touched files or project-level typecheck if that is the available path.
- Relevant unit test command.
- If a dev server is already easy to run, visually inspect `/activity` and confirm timestamps still fit.

## Non-Goals

- Do not add database columns.
- Do not alter `chef_activity_log` or `activity_events` write behavior.
- Do not redesign the Activity page.
- Do not add cross-app "last touched" rows/cards yet.
- Do not introduce a third-party date library unless the repo already depends on one and local patterns favor it.

## Acceptance Criteria

- Chef activity feed uses `ActivityTimestamp` for row timestamps.
- Client activity feed uses `ActivityTimestamp` for row timestamps.
- There is one shared relative-time formatter used by both feeds.
- Every rendered timestamp includes semantic `<time dateTime>` and exact-time `title`.
- Existing empty states, links, badges, context lines, and filters continue to work.
- Tests or a documented verification command cover the shared formatter.
- No schema, API, or routing changes are made.
