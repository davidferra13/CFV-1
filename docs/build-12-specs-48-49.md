# Playwright Specs 48 and 49 — Settings Deep and Network/Social Deep

## What Was Added

Two new Playwright interaction-layer spec files were created.

### File: tests/interactions/48-settings-deep.spec.ts

Covers every settings sub-page that had zero prior test coverage.
Routes covered:

- /settings/api-keys
- /settings/appearance
- /settings/contracts
- /settings/custom-fields
- /settings/event-types
- /settings/highlights
- /settings/journal (plus dynamic /settings/journal/[id])
- /settings/portfolio
- /settings/repertoire (plus dynamic /settings/repertoire/[id])
- /settings/stripe-connect
- /settings/templates
- /settings/webhooks
- /settings/delete-account (LOAD ONLY — delete action never triggered)

Each parametric route gets three tests: loads without 500, shows content (innerText length > 20), and no JS console errors.

Additional describe blocks:

- Delete Account: three tests, explicitly never clicking any delete button.
- Journal Detail: list load + first-entry navigation without crash.
- Repertoire Detail: list load + first-item navigation without crash.
- API Keys Interaction: presence check for a generate/create button.
- Webhooks Interaction: presence check for an add-webhook button.
- Event Types Interaction: page shows list or empty state.
- Omnibus test: all 13 routes iterated in one test to confirm no 500s.

### File: tests/interactions/49-network-social-deep.spec.ts

Covers network and social routes with zero prior coverage.
Routes covered:

- /network/[chefId] (own profile, uses seedIds.chefId fixture)
- /network/channels/[slug] (navigated via link from /network)
- /social/connections
- /social/settings
- /social/planner/[month] (tested with fixed month 2026-02)
- /social/planner (next-month navigation without crash)
- /social/posts/[id] (navigated via link from /social and /social/vault)

## Why

The interaction test suite (files 01-45) had zero coverage of the settings deep sub-pages and the network/social dynamic routes. These two files close that gap without touching any routes already covered by earlier specs.

## Design Choices

- Delete Account safety: the page is visited to confirm it renders, but no button interaction is performed. A comment in the test explicitly documents this.
- Dynamic route navigation: journal, repertoire, channels, and social posts are reached by clicking the first link found on the parent list page, using isVisible() guards so tests pass cleanly on empty data.
- seedIds fixture: file 49 uses the seedIds.chefId fixture (from tests/helpers/fixtures.ts) for the /network/[chefId] route, consistent with how other dynamic-ID routes are handled across the suite.
- No mutations: all tests are read-only. No form submissions, no state changes.

## Files Changed

| File                                              | Action                           |
| ------------------------------------------------- | -------------------------------- |
| tests/interactions/48-settings-deep.spec.ts       | Created (7,956 bytes, 232 lines) |
| tests/interactions/49-network-social-deep.spec.ts | Created (7,010 bytes, 197 lines) |
