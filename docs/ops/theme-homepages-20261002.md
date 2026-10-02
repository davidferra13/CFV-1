# ChefFlow theme and homepage correction — 2026-10-02

Status: BLOCKED at the mandatory release gate. Not deployed.
Owner direction: “I hate the color theme ... all of the homepages”; “fix everything”; “keep improving. I HATE DARK MODE. this app needs to feel inviting”; “I aprove fix it now”.
Deployment is already authorized. The outstanding blocker is verification, not permission.

Target: davidferra13/CFV-1; branch fix/theme-homepages-20261002; draft PR #23.
Base origin/main: 3fa5a0818. Last observed production build: 065916ad4.
Design commits: 709e3743a and c3a40e6dd. Release repairs: 14517de39. All pushed.
Production checkout, runtime, database contents, and public release have not been changed.

## Design delivered in the branch
- Forced light theme regardless of saved dark preference or operating-system setting; removed public theme switches.
- Warm ivory surfaces, green accents, pale peach/sage cards, serif homepage headings, softer photo caption, rounded actions.
- Light browser/PWA chrome and a compact two-column mobile footer.
- Public homepage connects existing /eat, /hub, /find, and /for-operators destinations.
- Corrected dark Find a Chef/operator surfaces and chef/client status, readiness, and error cards.
- Preserved data records, event actions, and navigation destinations; no fabricated content or new backend.

## Verified
- Native Edge desktop 1440px and mobile 390px: forced light before/after reload with saved dark preference and dark OS, no horizontal overflow, zero page errors; mobile menu opens/closes. Screenshots visually reviewed.
- Focused ESLint and contrast/theme tests (8/8) pass. Updated homepage destination/operator-path tests (2/2) pass.
- Full release TypeScript check passed independently and in subsequent full release runs.
- Secret scan, capability gate, completeness audit, and database contract audit all pass in the final serial release run.
- DB contract includes schema, planner, and rollback checks: zero failures. Rollback transactions made no persistent changes.
- Focused tests for JSON streams, credential isolation, admin denial, brand scope, bounded query plans, and isolated runtime targeting pass.
- Git whitespace check passes. SQL migration renames are byte-identical (100% rename similarity).

## Release repairs
- Machine-readable npm commands suppress banners; stdout JSON is parsed separately from stderr. Failed exits and malformed JSON remain blockers.
- Completeness checks use current canonical layouts and include four missing chef route registrations.
- Documented the existing dietary guest-token authorization and restricted the unused Meta conversion relay to platform administrators.
- Scoped regional business copy to DFPC's own surface; public ChefFlow copy remains national.
- Resolved two colliding SQL filenames without applying migrations.
- Tiny-table sequential scans require every heap <=256 KiB plus separate proof that required indexes are usable. Larger scans and missing indexes still fail.
- DB audit reads the established environment directly via CF_VERIFY_DB_ENV_FILE. Credentials were not copied or supplied to unit/browser tests.
- Added bounded rollback lock/statement timeouts.
- CF_VERIFY_PORT supports explicit isolated read-only runtime verification, preserving checkout ownership; non-default ports cannot start/restart/stop services.

## Remaining release blockers
- Final serial run verify-89596-1790954229839 failed lint:strict with 13 errors and 75 warnings across 68 files. Every reported file is unchanged from origin/main.
- Examples: conditional React hooks in event, pricing, costing, and recipe components; invalid generated schema syntax at lib/db/migrations/schema.ts:1442; MFA function naming interpreted as a hook; missing combobox ARIA properties.
- Full captured lint findings: docs/ops/theme-homepages-release-lint-20261002.txt.
- Attestation: .agents/release-attestations/full-verify-89596-1790954229839.json.
- Earlier concurrent run exhausted Windows memory. Serial retry completed lint and exposed the genuine source failures above.
- Isolated firewall preview on 3112 also exited on memory allocation failure while compiling the homepage. Its runner exited and cleaned up the owned server. No production service was restarted.
- Critical/unit suites, production build, release smoke, full firewall, and authenticated chef/client browser verification are not yet proven. Earlier firewall subchecks passed navigation/wiring, ingredient identity (15/15), and simulation (25 cases, zero violations).

Next action: repair the baseline lint failures, then pass both required gates and role-flow checks before merging origin/main and deploying through production-live staging/swap. Do not bypass checks or treat this PR as the live app.
