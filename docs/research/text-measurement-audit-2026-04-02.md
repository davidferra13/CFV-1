# Text Measurement Audit - 2026-04-02

## Purpose

Determine whether ChefFlow currently has a real text measurement or text layout bottleneck that justifies adopting `@chenglou/pretext`, or whether the repo is better served by current browser-native patterns.

## Executive Decision

Do not adopt `Pretext` now.

Current evidence does not show a meaningful text measurement bottleneck in ChefFlow. The repo mostly uses:

- browser-native text layout
- CSS truncation for previews
- bounded query sizes and pagination for message-heavy views
- ordinary scroll anchoring for chat-like interfaces

The few places that do real DOM measurement are overlay and tooltip positioning systems, not text-heavy paragraph layout hot paths. Those areas are better addressed with targeted overlay fixes, not a new paragraph measurement engine.

## Methods Used

1. Static code audit of message-heavy and text-heavy surfaces in `app/`, `components/`, and `lib/`
2. Direct search for measurement APIs and related libraries:
   - `getBoundingClientRect`
   - `offsetHeight`
   - `scrollHeight`
   - `ResizeObserver`
   - `measureText`
   - virtualization libraries
3. Local runtime verification on the live app at `http://localhost:3100`
4. Review of official documentation for current developer workflows:
   - Pretext README and demos
   - MDN docs for `line-clamp`, `measureText()`, and `ResizeObserver`
   - TanStack Virtual docs for dynamic row measurement and scroll adjustment

## What We Verified In ChefFlow

### 1. Message-heavy views are bounded, not unbounded

ChefFlow currently caps or pages the main message-heavy surfaces rather than rendering arbitrarily large text lists in one pass.

- Inbox requests `100` triage items at a time: `app/(chef)/inbox/page.tsx:33`
- Communication inbox fetcher applies `.limit(limit)`: `lib/communication/actions.ts:90-113`
- Raw feed exists, but the client explicitly requests `200` items and renders them as a special view: `components/communication/communication-inbox-client.tsx:232`
- Chat history loads older messages in batches of `50`: `components/chat/chat-view.tsx:186`
- Hub feed loads messages in batches of `50`: `components/hub/hub-feed.tsx:66`, `components/hub/hub-feed.tsx:151`
- Admin transcript pages are paginated at `50` per page: `app/(admin)/admin/conversations/[conversationId]/page.tsx:55`, `app/(admin)/admin/hub/groups/[groupId]/page.tsx:55`

This matters because `Pretext` becomes more compelling when many long text blocks must be measured repeatedly in hot paths. That is not how these views are currently shaped.

### 2. ChefFlow mostly uses CSS truncation and text cleanup, not JS text measurement

The repo already handles preview text by simplifying content and letting CSS clamp the visible output.

- Communication content is cleaned and previewed in `components/communication/message-content.tsx:51-150`
- Compact rendering uses `line-clamp-3`: `components/communication/message-content.tsx:150`

Repo-wide search found no use of:

- `measureText()`
- `TextMetrics`
- `@chenglou/pretext`
- `@tanstack/react-virtual`
- `react-window`
- `react-virtualized`
- `virtuoso`
- `masonic`

That is a strong signal that the app is not currently solving text layout through a JS measurement layer.

### 3. The real DOM measurements are mostly overlay-related

The clearest measurement logic in the repo is not chat or transcript layout. It is positioning logic for overlays and tooltips.

- Tour spotlight measures a target with `getBoundingClientRect()` and uses a hardcoded `estimatedTooltipHeight = 180`: `components/onboarding/tour-spotlight.tsx:41`, `components/onboarding/tour-spotlight.tsx:70`
- Tour spotlight also uses `ResizeObserver` to re-measure the target element: `components/onboarding/tour-spotlight.tsx:138-140`
- Global tooltip provider computes placement from `getBoundingClientRect()` for both anchor and tooltip: `components/ui/global-tooltip-provider.tsx:235`, `components/ui/global-tooltip-provider.tsx:529-531`

This is real measurement, but it is not the same category of problem Pretext is aimed at. These are overlay positioning problems, not paragraph-height prediction problems.

### 4. Existing local evidence already points to overlay estimation as the more realistic pain area

The repo already contains a bugfix spec showing that tooltip estimation has caused real UI issues before.

- `docs/specs/mobile-ux-bugfixes.md:55` records that the onboarding tooltip height estimate was wrong
- The same spec documents the vertical clamp fix now reflected in `tour-spotlight.tsx`: `docs/specs/mobile-ux-bugfixes.md:61`

This reinforces the main finding: the measurable layout pain in ChefFlow is currently around overlays and responsive positioning, not high-volume paragraph measurement.

## Runtime Verification

### What we successfully verified

Using a fresh local sign-in with `.auth/agent.json`, the live `/inbox` route rendered correctly and screenshots were captured to:

- `tmp-screenshots/text-measurement-audit-2026-04-02/inbox-triage-fresh-auth.png`
- `tmp-screenshots/text-measurement-audit-2026-04-02/inbox-raw-feed-fresh-auth.png`

Observed runtime state:

- The agent tenant inbox was an empty-state tenant, not a high-volume text tenant
- Triage view rendered the "Your inbox is ready" empty state
- Raw Feed rendered with zero items
- Recorded layout shift total was extremely small: about `0.000626`

That is not evidence of a text measurement bottleneck.

### What remains unverified

We did not get a current high-volume seeded chef session during this audit. The saved seeded credentials in `.auth/seed-ids.json` were no longer valid for `/api/e2e/auth`.

So the following is still not directly runtime-proven:

- behavior with hundreds of long inbox rows from a real populated tenant
- behavior with unusually long transcripts in a tenant with active communication history

However, the current code structure still strongly reduces the chance that a hidden repo-wide text measurement bottleneck exists:

- list sizes are bounded
- transcripts are paginated
- previews are clamped
- no dedicated JS text measurement layer is already in use

## How Developers Commonly Solve This Problem Today

### 1. Native CSS truncation for previews

For preview text, developers usually let the browser handle layout and use CSS truncation instead of measuring text in JavaScript.

MDN documents `line-clamp` as the CSS property for limiting content to a fixed number of lines:

- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/line-clamp

This matches ChefFlow's current preview strategy well.

### 2. Virtualization for very large lists

When the real problem is many rows, current practice is usually virtualization, not custom paragraph engines.

TanStack Virtual documents the standard workflow:

- provide an `estimateSize`
- optionally measure dynamic rows with `measureElement`
- accept scroll-position correction when measured size differs from the estimate

Relevant docs:

- https://tanstack.com/virtual/latest/docs/api/virtualizer

Important details from the docs:

- dynamic lists commonly start with an estimated row size
- the default `measureElement` behavior uses `getBoundingClientRect()`
- the virtualizer provides scroll-adjustment hooks when measured sizes differ from estimates

This is the mainstream answer for large dynamic lists in React apps today.

### 3. Canvas text measurement for off-DOM sizing

When developers do need text size outside the DOM, the browser-native primitive is canvas measurement.

MDN documents `CanvasRenderingContext2D.measureText()` as returning a `TextMetrics` object:

- https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText

This is the primitive Pretext builds on conceptually.

### 4. ResizeObserver for reacting to element size changes

For overlay, tooltip, and container-driven layout changes, developers commonly use `ResizeObserver`.

MDN:

- https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver

That is already what ChefFlow uses in the overlay system and mascot sizing code.

### 5. Specialized engines like Pretext only for narrow advanced cases

Pretext's own docs describe it as a multiline text measurement and layout library that avoids DOM measurement in hot paths and supports:

- paragraph height without touching the DOM
- manual line routing
- tight multiline bubbles
- masonry/card height prediction
- reduced layout shift when re-anchoring scroll after new text loads

Official sources:

- README: https://raw.githubusercontent.com/chenglou/pretext/main/README.md
- demos: https://chenglou.me/pretext/

This is a specialized tool for advanced text layout systems, not the default fix for normal app text rendering.

## Comparison: Developer Workflows vs ChefFlow's Current State

### Where ChefFlow already matches common practice

- Preview text uses native browser layout plus CSS truncation
- Chat and hub views use batching and incremental loading
- Transcript pages paginate instead of rendering entire histories at once
- Overlay logic uses standard DOM measurement and `ResizeObserver`

### Where ChefFlow does not currently match Pretext's ideal use case

ChefFlow does not currently have evidence of:

- repeated hot-path paragraph height calculation across large datasets
- custom text-card masonry dependent on measured copy height
- obstacle-aware line routing
- browser-free text overflow verification in CI
- scroll re-anchoring bugs caused by frequent dynamic text-height changes in large lists

### The closest live fit, if this ever changes

If a real problem emerges later, the most likely candidates are:

- `components/communication/communication-inbox-client.tsx`
- `components/chat/chat-view.tsx`
- `components/hub/hub-feed.tsx`
- admin transcript pages

Even there, the first likely answer would be list virtualization or tighter batching, not Pretext.

## Recommendation

### Recommendation now

Do nothing product-wide.

Do not add `Pretext`.

### If we want to improve something now

The smarter near-term quality-of-life target is overlay robustness, not paragraph measurement:

- continue tightening tooltip and onboarding measurement logic
- reduce reliance on estimated overlay height where practical
- keep using browser-native text layout for previews and ordinary message views

### Watchlist triggers that would justify revisiting this

Re-open this decision only if one of these becomes true:

1. Inbox, chat, or transcript views start rendering hundreds of long text items in one screen without pagination or virtualization.
2. Profiling shows repeated DOM reads for text height in a render hot path.
3. We build a real text-card masonry or editorial layout where height prediction matters before render.
4. We start seeing scroll re-anchor bugs caused by dynamic text height in long feeds.
5. We need browser-free validation that labels or multiline text fit within strict dimensions during automated checks.

## Bottom Line

The `Pretext` video was useful because it sharpened our understanding of a specialized frontend technique.

It did not reveal an immediate missing feature in ChefFlow.

The current repo does not show the kind of text-measurement-heavy architecture that would make `Pretext` a high-value adoption right now. The better decision is to stay with current browser-native patterns, keep list sizes bounded, and revisit only if a real measured bottleneck appears.
