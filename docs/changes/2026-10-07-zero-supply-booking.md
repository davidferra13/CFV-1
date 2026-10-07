# Zero-supply booking correction — 2026-10-07

Status: BLOCKED at release verification. This change has not been deployed.

## Requested behavior

David explicitly requested a current public-page and implementation check, a truthful zero-supply booking flow, useful lead capture without guaranteed coverage, regression coverage, and live verification.

The public directory and booking page were checked on October 7. The directory reported zero live chefs and zero accepting inquiries; booking still promised typical replies within 24 hours. Production reported build 065916ad4. Readiness returned HTTP 503 and a database connection refusal at 127.0.0.1:54322. An empty public directory is therefore not proof that the underlying marketplace has no chefs.

## Change

The booking page reads the same discoverable directory source and counts chefs listed as accepting inquiries. When that count is zero, it explains coverage before the form and labels submission as saving an event request. Global directory availability never promises a location-specific match or a response deadline.

The existing POST handler continues to save a no_match booking with zero matched chefs and creates no chef inquiries for an empty eligible-chef result. Its response, confirmation email, status page, and form fallback describe the request as saved and explain that no chef received it. Future matching, availability, and replies are not guaranteed. Empty-directory copy uses the same request language.

No matching algorithm, database schema, payment behavior, or notification transport is changed.

## Evidence and limits

- Five rendered regression tests failed against the original copy, then passed after the change.
- Eight focused tests (six rendered public surfaces plus the existing positive POST path and a new empty-chef POST path) passed before final Prettier formatting.
- Final reruns failed before assertions with native Node memory errors, including “Zone Allocation failed - process out of memory” at approximately 24–44 MB heap. A direct renderer process exited 3221226505 without test output. The Windows tasklist command also failed with “Out of memory.” A fresh passing run remains required.
- The zero-chef POST test verifies one persisted no_match booking with matched_chef_count 0, no client/inquiry/event/link writes, and no chef notification transport calls. All records and recipients are synthetic.
- The rendered tests check the zero-supply booking page, initial zero/positive form states, empty directory, zero-match email, and zero-match status page. The inline post-submit fallback is reviewed but is not directly exercised by a client interaction test.
- Read-only review found no critical or important issues; it identified the inline fallback coverage gap above.
- Prettier completed successfully on the nine owned source/test files.
- Regression firewall passed navigation/wiring audits (zero orphan routes) and ingredient-identity tests, then app typecheck failed with native V8 allocation errors. The later canonical-runtime check did not finish; this task's stuck session was stopped.
- Production release gate passed secrets/capability stages but failed audit:completeness: npm preamble broke JSON parsing. A bounded retry with npm_config_loglevel=silent still failed with “Unexpected non-whitespace character after JSON at position 41477 (line 893 column 1).” The underlying audit also reported failures; no gate was bypassed.
- Standalone app typecheck also exited 134 with a native memory-allocation failure.
- The whole unit suite did not complete. The initial suite and a concurrency-limited retry were stopped after stalls/resource failures. Neither is claimed as passed.
- Latest public browser inspection still showed the original booking claims. Candidate UI rendering in unit tests is not live verification.

## Source and release boundary

Work began from origin/main 3fa5a0818 in the isolated fix/zero-supply-booking-20261007 worktree. The canonical CFv1 checkout contained unrelated work and was preserved. Production-live remained on main at 065916ad4; no production build, swap, restart, or database mutation was performed. A generated wiring-audit result from this task was restored to its starting bytes before commit.

Native shared-task admission returned “no .agent-command/project.json found” for this unregistered repository. The bounded source-preservation guard captured a clean isolated baseline before edits. No managed admission policy was bypassed.

## Resume

Restore the existing ChefFlow verification environment, then rerun the focused tests, regression firewall, and verify:release without skipping gates. Resolve the completeness audit failures and the production database connection refusal. With passing evidence, finish the normal main merge path, obtain the existing one-deployer claim, run the stranded-work scan, build main into .next-staging, and use the documented production swap/rollback mechanism. Verify revision identity, readiness, directory, booking desktop/mobile, and the synthetic zero-match outcome without contacting real chefs or customers.

The public correction must not be described as LIVE until those checks succeed.
