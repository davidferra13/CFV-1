# Household UI De-emphasis and Client-level Household Tag

Summary

- The previous full "Households" feature (separate tables and UI) remains in the database and codebase but is being de-emphasized in the UI.
- We added a compact per-client household tag stored in `clients.household` JSONB (field structure: `{ tag: string }`). This is non-destructive and reversible.

What changed

- New server action: `updateClientHousehold(formData: FormData)` in `lib/clients/actions.ts` — updates `clients.household` with `{ tag }` or `null`.
- Client detail page (`app/(chef)/clients/[id]/page.tsx`) now shows a compact household tag form instead of the full `HouseholdManager` component.
- The `Households` nav item was removed from `components/navigation/chef-nav.tsx` to de-emphasize the feature.
- `'/households'` was removed from `middleware.ts` chef-protected paths so households routes are no longer treated as a first-class chef route (UI-only change).

Why this approach

- Non-destructive: the existing `households` tables and `household_members` remain untouched. No migrations or data loss.
- Lightweight UX: chefs can still label clients with a simple tag for grouping/notes without the overhead of household management.
- Reversible: full household UI and middleware entries remain in the repo and can be restored if desired.

Notes & follow-ups

- Consider adding a small migration later to copy key household data into `clients.household.tag` for ease of transition (only with explicit approval).
- Add deprecation comments to `lib/households/actions.ts` and household components to document the status.
- This doc should be linked from the main CHANGELOG and from `docs/household-linking.md` noting the de-emphasis.

Verification

- Linter run: `npm run lint` (no blocking errors; warnings remain unrelated to household changes).
- Quick manual test: update a client from the client detail page and verify `clients.household` updates in the DB (requires running app and authenticated chef session).
