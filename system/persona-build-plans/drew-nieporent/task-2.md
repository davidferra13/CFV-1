# Build Task: Vendor Management:
**Source Persona:** drew-nieporent
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build
Implement vendor management features, allowing admins to manage and control which vendors are connected and enabled for each chef. This will involve creating a new section within the admin dashboard where vendors can be added, removed, and toggled on/off for individual chefs.

## Files to Modify
- `app/(admin)/admin/flags/page.tsx` -- Add vendor information alongside feature flags in the admin dashboard. Update KNOWN_FLAGS array to include vendor management flag.
- `app/(chef)/availability/page.tsx` -- Integrate vendor management into the availability broadcaster page, showing which vendors are connected and enabled for each chef.

## Files to Create (if any)
- `app/(admin)/admin/flags/new-vendor-tab.tsx` -- New tab within the admin dashboard where vendors can be managed.
- `app/(admin)/admin/vendors/index.tsx` -- Page listing all connected vendors, with options to add or remove them.

## Implementation Notes
- Use React hooks and state management to handle vendor data and updates.
- Ensure proper authentication and authorization checks are in place before allowing access to the vendor management features.
- Implement a clear UI for adding, removing, and toggling vendors on/off for individual chefs.
- Integrate with existing database schema to store and retrieve vendor information.

## Acceptance Criteria
1. Admins can view a list of connected vendors within the admin dashboard.
2. Admins can add new vendors to the system by providing necessary details.
3. Admins can remove vendors from the system, disconnecting them from all chefs.
4. Vendors can be toggled on/off for individual chefs, controlling their access and visibility.
5. The vendor management features are seamlessly integrated into the existing admin dashboard layout.
6. `npx tsc --noEmit --skipLibCheck` passes without any new type errors or warnings.

## DO NOT
- Modify files not listed above or in the "Files to Create" section.
- Add new npm dependencies unrelated to vendor management.
- Change database schema outside of the scope of vendor management features.
- Delete existing functionality related to feature flags or availability broadcaster.