# Contact Claim Pipeline

## What Changed

The public contact form at `/contact` was saving submissions to a `contact_submissions` table, but nobody was ever notified. Leads submitted through the website were being lost in a database black hole.

This change adds a **claim-based pipeline** that surfaces contact form submissions to chefs and lets them convert submissions into tenant-scoped inquiries with one click.

## Why This Design

ChefFlow is multi-tenant -- multiple chefs share the platform. The contact form lives on the general public site (not a specific chef's page), so we can't auto-assign submissions to a single chef. Instead:

1. **Shared pool**: `contact_submissions` is intentionally not tenant-scoped. All chefs can see unclaimed submissions.
2. **Explicit claim**: A chef clicks "Claim" to take ownership of a lead. This creates a tenant-scoped inquiry under their pipeline.
3. **Optimistic lock**: The claim query filters on `claimed_by_chef_id IS NULL`, preventing two chefs from claiming the same submission.
4. **Dismiss option**: Spam or irrelevant submissions can be dismissed without creating an inquiry.

## How It Works

```
Public Contact Form  -->  contact_submissions table (no tenant_id)
                              |
                     Chef sees in /leads page + priority queue
                              |
                     Chef clicks "Claim"
                              |
                     claimContactSubmission() server action:
                       1. Verifies submission is unclaimed (optimistic lock)
                       2. Calls createInquiry() with channel='website'
                       3. Marks submission as claimed (chef_id + inquiry back-reference)
                              |
                     Redirect to /inquiries/{id} -- normal pipeline flow
```

## Database Changes

Added three columns to `contact_submissions` (migration `20260221000009`):

| Column               | Type                | Purpose                                               |
| -------------------- | ------------------- | ----------------------------------------------------- |
| `claimed_by_chef_id` | UUID (FK chefs)     | Which chef claimed this. NULL = unclaimed.            |
| `claimed_at`         | TIMESTAMPTZ         | When it was claimed.                                  |
| `inquiry_id`         | UUID (FK inquiries) | Back-reference to created inquiry. NULL if dismissed. |

Plus a partial index on `claimed_by_chef_id IS NULL` for fast unclaimed lookups, and an RLS UPDATE policy ensuring chefs can only set `claimed_by_chef_id` to their own ID.

## Integration Points

- **Priority Queue**: Unclaimed submissions surface in the dashboard's priority queue under the `inquiry` domain. They appear as "New website lead" items with a 48-hour response window for scoring.
- **Inquiry Pipeline**: Claiming reuses the existing `createInquiry()` function with `channel: 'website'`. The inquiry auto-links to existing clients by email if a match exists.
- **Navigation**: "Leads" appears as the first item in the Pipeline group in the chef sidebar, before Inquiries.

## Files

| File                                                           | Role                                 |
| -------------------------------------------------------------- | ------------------------------------ |
| `supabase/migrations/20260221000009_contact_claim_columns.sql` | Schema changes                       |
| `lib/contact/claim.ts`                                         | Server actions (get, claim, dismiss) |
| `lib/queue/providers/contact.ts`                               | Queue provider for unclaimed leads   |
| `lib/queue/build.ts`                                           | Modified to wire in contact provider |
| `app/(chef)/leads/page.tsx`                                    | Leads list page                      |
| `components/leads/leads-list.tsx`                              | Lead cards with claim/dismiss UI     |
| `components/navigation/chef-nav.tsx`                           | Added Leads to Pipeline nav group    |
| `middleware.ts`                                                | Added /leads to chef-protected paths |

## Future Considerations

- **Email notification**: When a contact form is submitted, email the chef (requires email service integration -- a separate audit item).
- **Auto-assignment**: If/when chef profiles become public, contact forms on individual chef pages can auto-assign to that chef.
- **Lead count badge**: Add an unread count badge on the "Leads" nav item.
