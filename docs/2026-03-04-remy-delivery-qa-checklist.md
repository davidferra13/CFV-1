# Remy Delivery QA Checklist

Generated: 2026-03-04

## Purpose

Final pass checklist for Remy usability, safety, and execution reliability before release.

## Run Smoke Checks

1. Run `npm run qa:remy:delivery`.
2. Confirm lint, unit tests, and typecheck all pass.

## Desktop UX Sweep

1. Open chef portal on desktop and confirm default Remy mode is docked.
2. Expand Remy character and focus a text input on any form.
3. Verify Remy auto-docks and no longer blocks the form.
4. Open a non-Remy modal dialog (for example a settings modal).
5. Verify Remy launcher hides while modal is open.
6. Close the modal and verify Remy restores to its previous mode.
7. In docked mode, cycle launcher corner and confirm placement updates.

## Mobile UX Sweep

1. Open chef portal on mobile viewport.
2. Verify Remy character/launcher is hidden by default.
3. Verify no Remy element blocks navigation, forms, or bottom controls.

## Approval Safety Sweep

1. Trigger a significant Remy action preview (agent or legacy significant action).
2. Confirm approve button is disabled until the exact phrase is entered.
3. Enter incorrect phrase and verify mismatch helper text appears.
4. Enter exact phrase and approve.
5. Confirm action succeeds and audit row updates to `success`.
6. Retry with missing phrase and confirm server blocks with explicit error.

## Runtime Governance Sweep

1. In `Settings > Remy Control Center`, disable runtime.
2. Verify Remy UI is removed from chef layout.
3. Re-enable runtime and verify Remy returns.
4. Use Emergency Lock All and confirm significant actions are blocked.
5. Use Reset All Overrides and confirm defaults restore.

## Metrics and Audit Sweep

1. Open Remy Control Center.
2. Verify quality metrics cards populate:
   - Approve Rate
   - Block Rate
   - Error Rate
   - P95 Duration
3. Verify Reliability Recommendations table populates when high-failure actions exist.
4. Apply one-click block from recommendations and verify override appears in Current Overrides.
5. Filter audit log by status and query to confirm entries are searchable.

## Signoff Criteria

1. No blocking UI overlap regressions on desktop or mobile.
2. Significant actions require typed confirmation both in UI and server.
3. All approval outcomes are logged in audit trail.
4. Smoke script passes without modifications.
