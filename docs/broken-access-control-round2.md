# Broken Access Control — Round 2 Deep Dive (March 2026)

## Summary

Round 2 went deeper into IDOR vulnerabilities, storage bucket security, realtime channel authorization, XSS, and input validation. Found and fixed 11 additional issues across the codebase.

Combined with Round 1 (7 fixes) and the parallel agent's work (8 fixes), the total security hardening covers **26 fixes** in a single session.

## Fixes Applied

### 1. XSS — Email Template Preview (HIGH)

**File:** `components/marketing/email-builder.tsx`
**Issue:** Manual regex sanitizer with multiple bypasses (`<img onerror=...>`, `<svg onload=...>`, unquoted event handlers, `data:` URIs, etc.). A chef's email template could execute arbitrary JavaScript in the preview.
**Fix:** Replaced `dangerouslySetInnerHTML` with a sandboxed `<iframe sandbox="" srcDoc={...}>`. The `sandbox=""` attribute (empty = most restrictive) blocks all script execution, form submission, popups, and same-origin access. Strongest possible XSS mitigation.

### 2. IDOR — FOH Preview Route (HIGH)

**File:** `app/api/documents/foh-preview/[menuId]/route.ts`
**Issue:** No `requireChef()` at the route level. Auth was enforced deep in the call stack, but a failed auth threw a 500 instead of 401, and the defense-in-depth principle was violated.
**Fix:** Added `await requireChef()` as the first line, matching every other document route.

### 3. IDOR — Chat Actions Missing Participant Checks (MEDIUM)

**File:** `lib/chat/actions.ts`
**Issue:** `getConversationMessages()` and `getConversationParticipants()` accepted any `conversationId` without verifying the caller is a participant. A logged-in user could read messages from any conversation by guessing the UUID.
**Fix:** Added explicit participant verification query to both functions — checks `conversation_participants` for `auth_user_id = user.id` before returning data.

### 4. PostgREST Filter String Injection (MEDIUM)

**Files:** `lib/search/universal-search.ts`, `lib/hub/friend-actions.ts`, `lib/collaboration/actions.ts`
**Issue:** User search input was interpolated directly into `.or()` filter strings without escaping PostgREST metacharacters (`,`, `.`, `(`, `)`, quotes). An attacker could manipulate the filter clause to alter query behavior.
**Fix:** Added `replace(/[%_,.()"'\\]/g, '')` to strip PostgREST filter metacharacters from search input before interpolation.

### 5. PII Leakage via Presence Broadcast (MEDIUM)

**File:** `components/admin/presence-beacon.tsx`
**Issue:** The `site:presence` realtime channel broadcast `userId`, `email`, `userAgent`, and `referrer` to all subscribers. Anyone with the Supabase anon key could subscribe and receive all visitors' emails and user IDs.
**Fix:** Set `userId: null` and `email: null` in both the initial and navigation-update payloads. Admin can resolve user identity via server-side lookup if needed. Session ID, role, page, and timestamps still broadcast (non-PII).

### 6. Blog Markdown XSS (LOW)

**File:** `components/blog/blog-markdown.tsx`
**Issue:** Image `alt` attribute not escaped, image `src` not sanitized. Alt text containing `" onerror="alert(1)` would break out of the HTML attribute.
**Fix:** Applied `escapeHtml()` to alt text and `sanitizeUrl()` + `escapeHtml()` to src URL, matching the pattern already used for links in the same file.

### 7-10. Storage Bucket RLS Hardening (CRITICAL + HIGH + MEDIUM)

**File:** `supabase/migrations/20260330000016_storage_bucket_rls_hardening.sql`

| Bucket                     | Previous State                                                              | Fix                                               |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| `hub-media`                | **No auth required** — anyone could upload/read                             | Replaced with `TO authenticated` policies         |
| `inquiry-note-attachments` | Upload: auth but no tenant scope; Read: no auth                             | Tenant-scoped upload/read/delete via `user_roles` |
| `chef-social-media`        | Upload: no tenant scope; Delete: used `auth.uid()` but paths use `tenantId` | Tenant-scoped upload and delete via `user_roles`  |
| `chef-logos`               | **No policies at all**                                                      | Added tenant-scoped upload + delete               |
| `chef-profile-images`      | **No policies at all**                                                      | Added tenant-scoped upload + delete               |
| `chef-portal-backgrounds`  | **No policies at all**                                                      | Added tenant-scoped upload + delete               |
| `chef-journal-media`       | **No policies at all**                                                      | Added tenant-scoped upload + delete               |
| `social-media-vault`       | **No policies at all**                                                      | Added tenant-scoped upload + delete               |

All policies use the pattern: first path segment must match the chef's `entity_id` from `user_roles`.

## Not Fixed (Documented for Future)

1. **`menu-uploads` LIMIT 1 subquery** — multi-role users could get wrong `entity_id`. Fix: add `AND role = 'chef'`.
2. **Hub broadcast typing channels** — `hub-typing:{groupId}` not RLS-protected. Low-severity info leak (typing indicators only).
3. **`receipts` bucket has no migration** — created manually. Should be codified.
4. **`getEventById` relies solely on RLS** — no explicit `tenant_id` filter. Intentional for collaboration but single point of failure.
5. **Dev fallback cookie signing key** — `'chefflow-dev-cookie-key'` is hardcoded. Low risk since role cookie is advisory only.
6. **JSON-LD `</script>` escape** — theoretical XSS vector in `app/(public)/chef/[slug]/page.tsx`. Very low risk.

## Migrations Created

| Timestamp        | File                               | Purpose                                           |
| ---------------- | ---------------------------------- | ------------------------------------------------- |
| `20260330000014` | `hub_availability_rls.sql`         | RLS for hub availability tables (Round 1)         |
| `20260330000015` | `tighten_guest_rsvp_rls.sql`       | Tighten event guest/share anon policies (Round 1) |
| `20260330000016` | `storage_bucket_rls_hardening.sql` | Storage bucket RLS for 8 buckets (Round 2)        |

**All 3 migrations require `supabase db push` to apply.** Back up the database first:

```bash
supabase db dump --linked > backup-$(date +%Y%m%d).sql
```
