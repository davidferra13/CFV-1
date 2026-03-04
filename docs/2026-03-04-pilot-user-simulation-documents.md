# Pilot User Simulation — Documents Workflow

## Purpose

Run a realistic "pilot user" simulation before onboarding real customers.

This simulation validates the exact path a private chef follows:

1. Open event documents
2. Follow quick-start steps
3. Generate PDFs
4. Export archive
5. Access blank template fallback

## Command

```bash
npm run test:pilot:documents
```

## What It Verifies

- `/events/{id}/documents` loads and shows the guided workflow.
- Primary one-click generation control is present and usable when data is ready.
- Core document endpoints respond correctly:
  - `/api/documents/{eventId}?type=all`
  - `/api/documents/{eventId}/bulk-generate`
  - `/api/documents/snapshots/export?eventId={eventId}`
  - `/api/documents/templates/event-summary`
- Global grab-anything entry point (`/documents`) exposes:
  - `Open Hub`
  - `Print Pack`
  - `Print All`

## Pass Criteria

- Test suite exits with zero failures.
- No auth redirect for pilot paths.
- PDF and CSV routes return expected content types.
- Attached simulation summary includes successful check markers.

## Fail Criteria

- Any 4xx/5xx from pilot-critical routes.
- Documents hub missing quick-start controls.
- Missing global entry points for event-level docs actions.

## File References

- Test: `tests/journey/15-pilot-user-documents-sim.spec.ts`
- Script: `package.json` (`test:pilot:documents`)
