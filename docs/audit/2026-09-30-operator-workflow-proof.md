# Chef operator workflow proof — 2026-09-30

Status: BLOCKED. Regression reproduction and partial runtime audit, not a completed operator release.

## Scope and isolation

Objective: one synthetic DFPC-style job from inquiry through client, quote/menu, booking, production, service, payment, and follow-up, on desktop and phone widths. No real customer messages, bookings, or payments.

Tested source: `065916ad4848539c915a72e350bf619354c84a39`.
Existing worktree: `CFv1-worktrees/chef-operator-release-20260927`.
Branch: `feat/chef-operator-release-20260927`.
Registered session: `0930-0926-2c51`.

A separate database, `chefflow_operator_proof_20260930_2c51`, received schema only from the shared PostgreSQL database. No customer rows were copied. Bootstrap created two synthetic auth users, one chef, and one client. Generated secrets remain in ignored local evidence files.

The isolated server used `http://127.0.0.1:3117`, with outbound notifications disabled, no payment-provider credentials, and no auth bypass. No production listener, tunnel, or system-network setting was changed.

Browser: fresh controlled Chrome context, not the owner's signed-in browser. Viewports: 1365×900 and 390×844. This is viewport emulation, not physical-phone proof.

## Financial regressions

Existing operator/event-spine tests: **19 passed, 0 failed, 0 skipped**.

New `tests/unit/operator-job-financial-truth.test.ts`: **16 scenarios, 1 passed, 15 failed** against unchanged application source. These are failing regression reproductions, not 15 separately established production incidents.

The cases expose these gaps in `buildChefOperatorJob`:

- A positive outstanding ledger balance can be overridden by a paid/settled label or an administrative financially-closed flag.
- A failed deposit read can be overridden by a stale positive paid amount.
- Missing, non-finite, or inconsistent financial inputs do not consistently produce a blocked/unverified state.
- The verified-zero-balance case correctly advances to follow-up and is the passing control.

The application patch was **not applied**. A source-edit tool call was safety-blocked. The earlier Python attempt failed because Python was unavailable; a subsequent Node attempt rejected its text anchors before writing. The blocked mutation was not retried through a different tool or delegated.

Reproduction command:

```text
node --test --import tsx tests/unit/operator-job-financial-truth.test.ts
```

Do not mark payment/deposit capabilities verified or merge this reproduction as a completed fix.

## Public runtime observation

At `2026-09-30T13:38Z`, both public domains returned build-version HTTP 200 and revision `0aa38d6a5`. That is not the tested source revision; no deployed-source equivalence is claimed.

Strict readiness returned HTTP 503 with `aiRuntime.reason=local_only_in_production`. Environment, database, circuit-breaker, and background-job checks reported OK. This does not establish a whole-site or database outage, nor prove required background jobs are configured. No paid AI fallback was enabled.

## Release gate and resource limit

Command: `npm run regression:firewall -- --no-restart`.

The navigation audit passed. The gate reached the app TypeScript check, but did not complete. During parallel verification the isolated Next runtime reported `VirtualAlloc failed`. Windows then reported 14.05 GB free physical memory and 5.33 GB free virtual/commit headroom. This is an environment failure, not a demonstrated application TypeScript error.

Only this task's gate and recorded TypeScript child processes were stopped to release memory. Other agents, production, system pagefile settings, and device networking were not changed. A subsequent isolated child used a 4096 MB JavaScript heap limit; that is not a system-wide setting.

Full regression, build, authenticated end-to-end workflow, and production behavior/revision gates must remain unverified until completed successfully. No production deployment was performed.

## Evidence locations

Ignored local evidence: `test-results/operator-proof-20260930/`.

This includes financial-baseline.log, browser-report JSON files, desktop/phone-width screenshots, runtime.log, public-runtime.json, gate-interruption.json, and regression-firewall.log. Private fixture/auth/environment files and the schema dump are not for publication or commit.

## Completion and handoff accounting

Sign-in rendering was visually inspected at desktop and phone width. That is not proof of an authenticated, completed customer job. Initial harness issues (required-field label matching and cold-start/hydration timing) are not counted as product defects.

No complete synthetic dinner was produced by this audit. Inquiry creation, canonical-client continuity, quote/menu acceptance, booking, event planning, shopping/prep/packing, service, ledger settlement, and follow-up remain **UNVERIFIED as one connected browser workflow**.

The remaining external-app-switch count is **unmeasured**, not zero. A page existing, a local fixture existing, or a unit test passing cannot establish replacement of the chef's actual external tools.

The financial reproductions are preserved for review. Application code is unchanged, the source-edit blocker remains unresolved, and no capability is promoted to VERIFIED by this evidence record. A successful source correction, complete authenticated replay, relevant release gates, and deployed-revision verification are still required before this milestone can be called complete.

## Recovered authenticated browser check

At `2026-09-30T13:49:49Z`, the controlled browser completed real credential sign-in as the synthetic chef and loaded `/inquiries/new`. The sign-in and authenticated inquiry form were verified at both viewport sizes, with no captured browser page errors. The final result was `AUTHENTICATED_FORM_VERIFIED_NOT_FULL_WORKFLOW`.

Screenshots: `01-signin-desktop.png`, `02-signin-phone.png`, `03-inquiry-desktop.png`, and `04-inquiry-phone.png` in the ignored evidence directory. The phone-width form was visually inspected. This recovery does not retroactively turn the interrupted release gate into a pass.

## Final inquiry-save attempt

At `2026-09-30T13:58:09Z`, the save replay ended with `page.waitForURL: net::ERR_CONNECTION_REFUSED`, still at `/inquiries/new`. No inquiry was persisted. The isolated database held one bootstrap client, zero inquiries, zero events, and zero ledger entries.

The replay selected the existing synthetic client, checked the name autofill, filled eight guests, a 156000-cent test budget, and a shellfish-allergy restriction, then attempted `Log Inquiry`. The connection loss prevented verification of save, canonical-client linkage after save, or the quote handoff. This is a blocked runtime result, not proof that inquiry persistence itself contains a diagnosed application defect.

The temporary harness's own locator, hydration-wait, and string-substitution errors were corrected and are not counted as product failures. Final record: `inquiry-save-report.json`; filled-form evidence: `05-inquiry-filled-desktop.png`.

**Milestone verdict: BLOCKED. No complete dinner, no application fix, no production deployment, and no completion-score increase are established by this audit.**

## Cleanup

The isolated port 3117 had no remaining listener at cleanup. The generated Next cache was preserved under the ignored evidence directory. Test-generated changes to `tsconfig.next.json` and `scripts/wiring-audit-results.json` were backed up there and restored. `lib/operator-job/journey.ts` was confirmed unchanged. The only intended repository additions are this report and the financial regression test.
