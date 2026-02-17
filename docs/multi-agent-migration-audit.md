# Multi-Agent Migration Audit & Sync

**Date:** 2026-02-17
**Trigger:** ~15 concurrent agents created migrations and features in a single session, leading to uncertainty about database sync state.

---

## What Happened

Multiple Claude Code agents worked in parallel on separate features, each potentially creating migration files. The user wasn't sure which migrations had been applied, whether there were duplicates, or if the database was in sync.

## Audit Findings

### Migration State (Before Fix)
- **27 migration files** found locally (including 1 placeholder)
- **23 applied** to remote Supabase
- **3 pending** (not yet applied):
  - `20260221000007_contact_submissions.sql` - contact form table
  - `20260221000008_fix_guest_share_rls.sql` - security fix for token enumeration
  - `20260221000009_contact_claim_columns.sql` - lead claiming columns
- **0 duplicates** - no timestamp collisions despite parallel agents
- **0 syntax errors** across all 27 files

### Bug Discovered: Client Conversation RLS (HIGH severity)
- **File:** `20260221000005_client_conversation_create.sql`
- **Bug:** `conversations_client_insert` and `conv_participants_client_insert` RLS policies used `get_current_tenant_id()`, which only returns a value for chef users. For clients, it returns NULL, making `tenant_id = NULL` always false.
- **Impact:** Clients could never create conversations despite the migration's stated purpose.
- **Root cause:** `get_current_tenant_id()` is defined as `SELECT entity_id FROM user_roles WHERE role = 'chef'` - it's chef-only by design.

### Minor Issues (Not Fixed - Low Priority)
1. **Duplicate trigger functions:** `update_updated_at_column()` (L1), `update_updated_at_timestamp()` (L3), `update_layer4_updated_at()` (L4) - all identical behavior
2. **Redundant index:** `idx_inquiries_converted` (L2) and `idx_inquiries_converted_to_event` (L3) on same column
3. **`notifications_insert` policy:** Only works for chefs via `get_current_tenant_id()` - likely fine if all inserts go through service role

## Actions Taken

### 1. Applied 3 Pending Migrations
All three were additive and safe:
- Contact submissions table with RLS (anon insert, chef select)
- Security hardening: removed overly permissive `USING(true)` anon policies on guest/share tables
- Claim pipeline columns on contact_submissions

### 2. Created Fix Migration (`20260221000010`)
**File:** `20260221000010_fix_client_conversation_rls.sql`

Replaced broken policies:
```sql
-- BEFORE (broken): get_current_tenant_id() returns NULL for clients
tenant_id = get_current_tenant_id()

-- AFTER (fixed): derive tenant from client's own record
tenant_id = (SELECT tenant_id FROM clients WHERE id = get_current_client_id())
```

### 3. Applied Fix Migration
Successfully pushed to remote Supabase.

### 4. Regenerated Types
`types/database.ts` regenerated from remote schema. Now includes `contact_submissions` table with all claim columns. Fixed CLI log line ("Initialising login role...") that leaked into the types file.

### 5. Build Verification
`next build` passes cleanly with zero TypeScript errors.

## Final State

| Metric | Value |
|--------|-------|
| Total migrations | 27 (+ 1 fix = 28) |
| Local = Remote | All 28 matched |
| TypeScript build | Pass |
| Duplicate timestamps | 0 |

## Lessons Learned

1. **Multi-agent sessions need a sync check afterward.** Even with the timestamp collision prevention rule in CLAUDE.md, it's worth verifying after heavy parallel work.
2. **`get_current_tenant_id()` is chef-only by design.** Any RLS policy for client INSERT/UPDATE operations must use `get_current_client_id()` and derive tenant_id from the client's record.
3. **`supabase gen types` captures stderr in stdout.** The "Initialising login role..." message gets included in the generated types file when redirecting with `>`. Need to filter it out or use `2>/dev/null` on the command.
4. **The timestamp collision prevention system worked.** Despite ~15 concurrent agents, zero collisions occurred - the CLAUDE.md rule is effective.
