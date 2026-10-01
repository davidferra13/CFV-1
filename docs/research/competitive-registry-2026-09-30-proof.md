# Competitive registry verification

Observed on 2026-09-30 in the isolated competitive-registry-20260930 worktree.
Baseline: 065916ad4848539c915a72e350bf619354c84a39.

## Scope

This is read-only developer tooling. No app route, navigation, authentication, payment, database, production process or consumer workflow was changed. Existing capability IDs and proof rules remain authoritative.

## Evidence

- Focused suite: 45 tests passed, zero failed or skipped. Includes new competitive tests and existing capability registry/proof tests.
- Browser report smoke: 13 checks passed, zero page errors, 1440x1000 and 390x844 viewports. Used installed Microsoft Edge headless with an isolated temporary profile; bundled Playwright Chromium was unavailable.
- Report search, category filters, product details, empty results, dependency-aware proposed work order and mobile overflow were checked. Desktop and phone screenshots were visually inspected.
- Direct chef navigation audit passed: 8 top-level visible items, 462 unique navigation hrefs, 505 discoverable static routes covered.
- Full regression firewall: BLOCKED / NO FINAL PASS. Two bounded attempts used a 120-second per-step limit and disabled runtime restarts. The second passed navigation, zero-orphan wiring, 15 ingredient-identity tests and the 25-case Simulation Forge replay; its last observed stage was app typecheck. It did not settle to a final result. A separate compiler invocation produced no diagnostics but its exit code could not be recovered, so it is not counted as a pass. Mainline integration remains held; this is not a diagnosis that the feature or all existing app code is broken. The first npm-launched run stalled after the navigation step beyond its configured timeout. Only that task-owned process was stopped; production was not restarted.
- No canonical proof receipt JSON files were found in this checkout, production-live, or the original CFv1 checkout. This is a proof coverage gap, not evidence that all workflows are missing or broken.

## Actual generated audit

233 named product candidates; 24 categories; 12 reviewed vendor sources; 46 atomic benchmarks; 97 acceptance criteria; 30 mapped IDs out of 84 canonical capabilities. 221 product candidates still require current verification. All 46 benchmarks have mapped references; none is promoted to granular competitive parity.

The HTML and JSON exported to the conversation match the actual generated reports byte-for-byte by SHA-256:

- JSON: 1d3bdf05b3aaeb4af69e4b37002063bad867e71536ac793a84ce4ab0b227fabb
- HTML: c5f3ebd41721c58187fad45e29b1a3b51fce7bbc07e66a152fbb66afbe2c5ba7
