# Task: Outlook - OAuth Integration (Microsoft Graph API)

## Description

Add Outlook/Microsoft 365 email account integration via OAuth, enabling chefs to sync Outlook inbound emails the same way Gmail is synced.

## OAuth Flow

1. Chef clicks "Connect Outlook" in integrations
2. Redirects to Microsoft login (Azure AD)
3. User grants permission to read emails (Mail.Read scope)
4. Callback stores refresh token (long-lived)
5. Background sync fetches inbound emails hourly (like Gmail)

## Implementation

1. **Auth config updates:**
   - Register Azure AD app (client_id, client_secret in env vars)
   - Add Microsoft provider to Auth.js v5 config

2. **New table: `outlook_sync_status`**
   - `chef_id` (PK)
   - `email` (text, display)
   - `refresh_token` (encrypted)
   - `last_sync` (timestamp)
   - `sync_error` (text, nullable)
   - `connected_at` (timestamp)
   - `disconnected_at` (timestamp, nullable)

3. **Sync function: `lib/outlook/sync-emails.ts`**
   - Similar to Gmail sync
   - Fetch inbound emails from past 24h (delta query)
   - Create `communication_events` + stage unknown senders
   - Insert `inbound_email_log` entries
   - Update `last_sync` timestamp

4. **Cron job:**
   - Add to existing email sync cron (every 1h)
   - Iterate all chefs with active Outlook connections
   - Call sync function per chef

5. **Settings UI:**
   - Add "Connect Outlook" button in `/settings/integrations`
   - Show status, email, disconnect option (similar to Twilio pattern)

## Files

- `lib/auth/outlook-provider.ts` (new - Auth.js provider setup)
- `lib/outlook/sync-emails.ts` (new - sync engine)
- `lib/outlook/graph-client.ts` (new - Microsoft Graph wrapper)
- `app/api/auth/callback/outlook/route.ts` (new - OAuth callback)
- `app/(chef)/settings/integrations/page.tsx` (modify: add Outlook section)
- `components/settings/outlook-connect-card.tsx` (new)
- `database/migrations/20260414000002_outlook_sync_status.sql` (new table)

## Scopes

- `Mail.Read` - read user emails
- `offline_access` - refresh token (required for long-lived access)

## Dependencies

- `@microsoft/microsoft-graph-client` npm package
- Azure AD app registration (one-time setup)
- `.env.local`: OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, OUTLOOK_REDIRECT_URI

## Notes

- Delta query: Microsoft Graph supports efficient sync via `/me/mailFolders/inbox/messages/delta`
- Refresh token: auto-refresh when expired (Graph client handles this)
- Sync scope: only Inbox folder (like Gmail)
- Error handling: log sync errors in `outlook_sync_status.sync_error`, retry on next cron
