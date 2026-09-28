# Internal ChefFlow nav task: Studio route ownership

Task ID: **CF-STUDIO-NAV-20260928**.

Status: **blocked on product implementation**, route to ChefFlow navigation/studio owner. Source revision: `422605dd004b584c459692dcd4726b6322d23fc4`, still present at Forge branch `28686820d25b19df78ca846377f69ea25612e750`.

## Evidence

`components/navigation/nav-config.tsx:1018-1030` advertises a Studio parent and seven destinations:
`/studio`, `/studio/pages`, `/studio/branding`, `/studio/domain`, `/studio/media`, `/studio/seo`, `/studio/analytics`.
`lib/auth/route-policy.ts:113` classifies `/studio` as a protected path. The committed `app` tree has no `/studio` route; its only similarly named route is `/reputation/studio`, which is a separate feature.
`npm run verify:chef-nav` reports exactly seven nav hrefs with no matching routes.

## Acceptance and boundary

The owning product lane must identify the intended Studio feature, implement all seven real protected pages and their routes, or make a deliberate nav scope decision and update navigation and route policy together. Do not add empty placeholder pages to silence the audit. All route additions must follow `AGENTS.md` auth guards, tenant boundaries, loading/empty/error states, and actual user flows. Verify `npm run verify:chef-nav`, `npm run regression:firewall`, affected routes on the canonical server, and production revision after an authorized release.

The Simulation Forge/transport lane did not modify Studio nav or policy. It keeps the release gate red until this owner task is complete.
