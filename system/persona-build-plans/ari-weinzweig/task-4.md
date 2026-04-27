# Build Task: Financial Flexibility:

**Source Persona:** ari-weinzweig
**Gap Number:** 4 of 5
**Severity:** MEDIUM

## What to Build

Implement comprehensive financial reporting and analysis tools for both admin and chef portals, providing detailed insights into platform-wide revenue, expenses, and transactional data.

## Files to Modify

- `app/(admin)/admin/financials/page.tsx` -- Enhance the existing Admin Financials page with additional metrics, error handling improvements, and user-friendly visualizations.
- `app/(admin)/admin/page.tsx` -- Update the Admin Overview page to include a quick link to the financial reporting tools.

## Files to Create (if any)

- `app/(admin)/admin/financials/reports.tsx` -- New file for generating and displaying various financial reports, such as Profit and Loss statements, cash flow analysis, and balance sheet summaries.
- `app/(chef)/cannabis/ledger/reports.tsx` -- Similar to the admin version, create a new file in the chef cannabis ledger section for generating and displaying financial reports specific to their events.

## Implementation Notes

- Utilize Drizzle ORM to fetch and manage financial data securely from the PostgreSQL database.
- Implement Tailwind CSS classes for improved visual appeal and consistency across all newly created pages and components.
- Ensure proper error handling and user feedback mechanisms are in place, especially when fetching data or encountering errors.
- For the admin portal, consider adding role-based access control to certain financial details to maintain confidentiality.

## Acceptance Criteria

1. The Admin Financials page displays a comprehensive overview of platform-wide revenue, expenses, and transactional data, including new visualizations for better understanding.
2. The Chef Cannabis Ledger page includes similar financial reporting tools tailored to their events, providing insights into revenue generated from cannabis-related activities.
3. Error handling is improved across both portals, with meaningful user feedback provided when data cannot be fetched or errors occur.
4. `npx tsc --noEmit --skipLibCheck` passes without any new type errors in the modified and newly created files.

## DO NOT

- Modify existing functionality outside of the financial reporting tools.
- Introduce new npm dependencies not directly related to the implementation of these financial features.
- Alter database schema or make changes that would impact existing system functionality.
