# Notification action boundary (2026-09-28)

Source: `main e944ed554897ddb0d7686b38312c7e28083a3e71`. This branch changes only the cannabis notification dispatch helper and its boundary test.

`lib/cannabis/notifications.ts` had a top-level `'use server'` directive and six exported functions accepting `tenantId` and `recipientId` without a direct authorization check. Its known importers are `lib/admin/cannabis-actions.ts`, `lib/admin/cannabis-age-actions.ts`, `lib/cannabis/client-portal-actions.ts`, and the `lib/jobs/post-event-cannabis-closeout.ts` job. The first three authenticate at their action boundary; the job has no user request. Removing the directive and marking the helper `server-only` keeps those trusted imports available while preventing its exports from being registered as client-callable Server Actions.

**Open high-priority boundary:** `lib/notifications/actions.ts#createNotification` remains an exported Server Action that accepts caller-supplied tenant and recipient IDs and uses an admin database client without its own auth check. The name `createNotification` appears in about 90 tracked TypeScript files, including trusted system and webhook flows. This narrow branch does not change that function or claim the wider notification surface is secure.

Safe follow-on migration:

1. Inventory actual `createNotification` imports and classify browser actions versus internal, webhook and job callers.
2. Move the privileged implementation into a `server-only` internal module without `'use server'`; migrate trusted callers to that import in bounded batches.
3. Make any browser-callable notification action derive identity and tenant from a verified session, or require the appropriate admin role. Never expose the privileged internal function as a Server Action.
4. Test anonymous, cross-tenant, admin and trusted job paths, then run typecheck, build and release gates before integration.

The existing tenant-isolation test remains unchanged. Its other six flagged files require their own guard and call-chain review.
