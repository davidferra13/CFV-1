# Build Spec: Private Circle Messaging

## Context

Dinner circles have full public group chat (`hub_messages`) but zero private messaging. Chefs need private 1:1 threads with individual circle members for: dietary restrictions guests don't want public, payment/billing, surprise coordination, sensitive logistics.

## Scope

- Chef can message any member privately within a circle
- Member can message the chef privately within a circle
- Text only. No images, no file sharing, no reactions
- No real-time SSE. Use `router.refresh()` after sending a message
- No email notifications (V2)
- No member-to-member DMs. Only chef-to-member

## Architecture

Two new tables, completely isolated from `hub_messages`. A new server actions file. Two new UI components. Two small integration points into existing pages.

**Why separate tables (not reusing hub_messages)?** Safety. Zero risk of private messages leaking into the public group feed. Clean separation. No filter bugs.

---

## DO NOT (read this before writing any code)

1. Do NOT modify `hub_messages`, `hub_message_reactions`, or `hub_message_reads` tables
2. Do NOT modify `lib/hub/message-actions.ts` or any existing message code
3. Do NOT add SSE, WebSocket, or any real-time push for this feature
4. Do NOT add image/file upload support
5. Do NOT add member-to-member messaging
6. Do NOT use em dashes anywhere (use commas, semicolons, colons instead)
7. Do NOT delete or rename anything in existing files
8. Do NOT modify any existing server actions, components, or types
9. Do NOT add `@ts-nocheck` to any file
10. Do NOT run `drizzle-kit push` or apply the migration

---

## Phase 1: Migration

**File:** `database/migrations/20260426000004_hub_private_threads.sql`

Copy this SQL exactly:

```sql
-- =============================================================================
-- Migration: Private Circle Messaging
-- Layer: Hub Extension
-- Purpose: 1:1 private threads between chef and circle members
-- =============================================================================

-- Private threads: one per chef-member pair per circle
CREATE TABLE IF NOT EXISTS hub_private_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  chef_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  member_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  chef_unread_count INTEGER NOT NULL DEFAULT 0,
  member_unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, chef_profile_id, member_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_private_threads_chef
  ON hub_private_threads(chef_profile_id, group_id);

CREATE INDEX IF NOT EXISTS idx_private_threads_member
  ON hub_private_threads(member_profile_id, group_id);

-- Private messages within a thread
CREATE TABLE IF NOT EXISTS hub_private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES hub_private_threads(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_private_messages_thread_created
  ON hub_private_messages(thread_id, created_at DESC);

-- Trigger: update thread metadata on new message
CREATE OR REPLACE FUNCTION update_private_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hub_private_threads SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 100),
    updated_at = now(),
    chef_unread_count = CASE
      WHEN NEW.sender_profile_id != chef_profile_id THEN chef_unread_count + 1
      ELSE chef_unread_count
    END,
    member_unread_count = CASE
      WHEN NEW.sender_profile_id != member_profile_id THEN member_unread_count + 1
      ELSE member_unread_count
    END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_private_message_update_thread
  AFTER INSERT ON hub_private_messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION update_private_thread_last_message();

-- RLS (permissive, app-layer validates access)
ALTER TABLE hub_private_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_private_threads_all" ON hub_private_threads
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "hub_private_messages_all" ON hub_private_messages
  FOR ALL USING (true) WITH CHECK (true);
```

---

## Phase 2: Types

**File:** `lib/hub/types.ts`

**Action:** APPEND the following types at the end of the file, before the final closing line. Do not modify any existing types.

```typescript
// ---- Private Messages ----

export interface PrivateThread {
  id: string
  group_id: string
  chef_profile_id: string
  member_profile_id: string
  last_message_at: string | null
  last_message_preview: string | null
  chef_unread_count: number
  member_unread_count: number
  created_at: string
  updated_at: string
  // Joined
  chef_profile?: HubGuestProfile
  member_profile?: HubGuestProfile
}

export interface PrivateMessage {
  id: string
  thread_id: string
  sender_profile_id: string
  body: string
  created_at: string
  deleted_at: string | null
  // Joined
  sender?: HubGuestProfile
}
```

---

## Phase 3: Server Actions

**File:** `lib/hub/private-message-actions.ts` (NEW FILE)

Create this file with exactly these 5 exported functions. Every function must:

- Use `createServerClient({ admin: true })` for DB access
- Validate `profileToken` by looking up `hub_guest_profiles` where `profile_token = input.profileToken`
- Return clear errors on auth failure

```typescript
'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { PrivateThread, PrivateMessage } from './types'

// ---------------------------------------------------------------------------
// Private Circle Messaging: 1:1 threads between chef and circle members
// ---------------------------------------------------------------------------

/**
 * Resolve a profile_token to a profile ID. Throws on invalid token.
 */
async function resolveProfile(db: any, profileToken: string): Promise<string> {
  const { data } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()
  if (!data) throw new Error('Invalid profile token')
  return data.id
}

/**
 * Find the chef's profile_id in a group (role = 'owner' or 'chef').
 */
async function findChefInGroup(db: any, groupId: string): Promise<string | null> {
  const { data } = await db
    .from('hub_group_members')
    .select('profile_id, role')
    .eq('group_id', groupId)
    .in('role', ['owner', 'chef'])
    .order('role', { ascending: true })
    .limit(1)
  return data?.[0]?.profile_id ?? null
}

/**
 * Verify that a profile is a participant in a thread. Returns 'chef' or 'member'.
 */
async function verifyThreadAccess(
  db: any,
  threadId: string,
  profileId: string
): Promise<{ thread: any; role: 'chef' | 'member' }> {
  const { data: thread } = await db
    .from('hub_private_threads')
    .select('*')
    .eq('id', threadId)
    .single()
  if (!thread) throw new Error('Thread not found')
  if (thread.chef_profile_id === profileId) return { thread, role: 'chef' }
  if (thread.member_profile_id === profileId) return { thread, role: 'member' }
  throw new Error('Access denied: not a participant in this thread')
}

// ---------------------------------------------------------------------------
// 1. Get or create a private thread
// ---------------------------------------------------------------------------

const GetOrCreateThreadSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  targetProfileId: z.string().uuid(),
})

/**
 * Get or create a private thread between the caller and a target profile.
 * One of the two participants MUST be the circle's chef (owner/chef role).
 * If no thread exists, creates one.
 */
export async function getOrCreatePrivateThread(
  input: z.infer<typeof GetOrCreateThreadSchema>
): Promise<PrivateThread> {
  const validated = GetOrCreateThreadSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const callerProfileId = await resolveProfile(db, validated.profileToken)
  const chefProfileId = await findChefInGroup(db, validated.groupId)

  if (!chefProfileId) throw new Error('No chef found in this circle')

  // Determine which participant is the chef and which is the member
  let threadChefId: string
  let threadMemberId: string

  if (callerProfileId === chefProfileId) {
    // Chef is initiating: target must be a member
    threadChefId = callerProfileId
    threadMemberId = validated.targetProfileId
  } else if (validated.targetProfileId === chefProfileId) {
    // Member is messaging the chef
    threadChefId = validated.targetProfileId
    threadMemberId = callerProfileId
  } else {
    throw new Error('Private messages are only between the chef and a member')
  }

  // Verify the member is actually in this group
  const { data: membership } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', validated.groupId)
    .eq('profile_id', threadMemberId)
    .single()
  if (!membership) throw new Error('Target is not a member of this circle')

  // Check for existing thread
  const { data: existing } = await db
    .from('hub_private_threads')
    .select(
      '*, hub_guest_profiles!chef_profile_id(id, display_name, avatar_url, profile_token), member_prof:hub_guest_profiles!member_profile_id(id, display_name, avatar_url, profile_token)'
    )
    .eq('group_id', validated.groupId)
    .eq('chef_profile_id', threadChefId)
    .eq('member_profile_id', threadMemberId)
    .maybeSingle()

  if (existing) {
    return {
      ...existing,
      chef_profile: existing.hub_guest_profiles ?? undefined,
      member_profile: existing.member_prof ?? undefined,
      hub_guest_profiles: undefined,
      member_prof: undefined,
    } as PrivateThread
  }

  // Create new thread
  const { data: newThread, error } = await db
    .from('hub_private_threads')
    .insert({
      group_id: validated.groupId,
      chef_profile_id: threadChefId,
      member_profile_id: threadMemberId,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create thread: ${error.message}`)
  return newThread as PrivateThread
}

// ---------------------------------------------------------------------------
// 2. Send a private message
// ---------------------------------------------------------------------------

const SendMessageSchema = z.object({
  threadId: z.string().uuid(),
  profileToken: z.string().uuid(),
  body: z.string().min(1).max(2000),
})

/**
 * Send a message in a private thread. Caller must be a participant.
 */
export async function sendPrivateMessage(
  input: z.infer<typeof SendMessageSchema>
): Promise<PrivateMessage> {
  const validated = SendMessageSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const callerProfileId = await resolveProfile(db, validated.profileToken)
  await verifyThreadAccess(db, validated.threadId, callerProfileId)

  const { data, error } = await db
    .from('hub_private_messages')
    .insert({
      thread_id: validated.threadId,
      sender_profile_id: callerProfileId,
      body: validated.body.trim(),
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to send message: ${error.message}`)
  return data as PrivateMessage
}

// ---------------------------------------------------------------------------
// 3. Get messages in a thread (paginated)
// ---------------------------------------------------------------------------

/**
 * Get paginated messages for a private thread. Caller must be a participant.
 * Returns newest first. Use cursor for older messages.
 */
export async function getPrivateMessages(input: {
  threadId: string
  profileToken: string
  cursor?: string
  limit?: number
}): Promise<{ messages: PrivateMessage[]; nextCursor: string | null }> {
  const db: any = createServerClient({ admin: true })
  const limit = input.limit ?? 50

  const callerProfileId = await resolveProfile(db, input.profileToken)
  await verifyThreadAccess(db, input.threadId, callerProfileId)

  let query = db
    .from('hub_private_messages')
    .select('*, hub_guest_profiles!sender_profile_id(id, display_name, avatar_url)')
    .eq('thread_id', input.threadId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (input.cursor) {
    query = query.lt('created_at', input.cursor)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load messages: ${error.message}`)

  const rows = data ?? []
  const hasMore = rows.length > limit
  const messages = (hasMore ? rows.slice(0, limit) : rows).map((m: any) => ({
    ...m,
    sender: m.hub_guest_profiles ?? undefined,
    hub_guest_profiles: undefined,
  })) as PrivateMessage[]

  return {
    messages,
    nextCursor: hasMore ? (messages[messages.length - 1]?.created_at ?? null) : null,
  }
}

// ---------------------------------------------------------------------------
// 4. List threads for a profile in a group
// ---------------------------------------------------------------------------

/**
 * Get all private threads for the caller in a specific circle.
 * Chef sees all threads. Member sees only their thread (0 or 1).
 */
export async function getMyPrivateThreads(input: {
  groupId: string
  profileToken: string
}): Promise<PrivateThread[]> {
  const db: any = createServerClient({ admin: true })
  const callerProfileId = await resolveProfile(db, input.profileToken)

  // Try both: threads where caller is chef OR member
  const { data, error } = await db
    .from('hub_private_threads')
    .select(
      '*, hub_guest_profiles!chef_profile_id(id, display_name, avatar_url, profile_token), member_prof:hub_guest_profiles!member_profile_id(id, display_name, avatar_url, profile_token)'
    )
    .eq('group_id', input.groupId)
    .or(`chef_profile_id.eq.${callerProfileId},member_profile_id.eq.${callerProfileId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) throw new Error(`Failed to load threads: ${error.message}`)

  return (data ?? []).map((t: any) => ({
    ...t,
    chef_profile: t.hub_guest_profiles ?? undefined,
    member_profile: t.member_prof ?? undefined,
    hub_guest_profiles: undefined,
    member_prof: undefined,
  })) as PrivateThread[]
}

// ---------------------------------------------------------------------------
// 5. Mark a thread as read
// ---------------------------------------------------------------------------

/**
 * Reset the caller's unread count to 0.
 */
export async function markPrivateThreadRead(input: {
  threadId: string
  profileToken: string
}): Promise<void> {
  const db: any = createServerClient({ admin: true })
  const callerProfileId = await resolveProfile(db, input.profileToken)
  const { role } = await verifyThreadAccess(db, input.threadId, callerProfileId)

  const updateField = role === 'chef' ? 'chef_unread_count' : 'member_unread_count'

  await db
    .from('hub_private_threads')
    .update({ [updateField]: 0 })
    .eq('id', input.threadId)
}
```

---

## Phase 4: UI Components

### 4a. Private Thread List (chef-side)

**File:** `components/hub/private-thread-list.tsx` (NEW FILE)

This component shows a list of private conversations. Used in the chef's circle detail "Private" tab.

Props:

```typescript
interface PrivateThreadListProps {
  threads: PrivateThread[]
  currentProfileId: string
  onSelectThread: (thread: PrivateThread) => void
  selectedThreadId?: string | null
}
```

Requirements:

- Import `PrivateThread` from `@/lib/hub/types`
- `'use client'` at top
- Each thread card shows: member avatar (first letter fallback), member display_name, last_message_preview (truncated), relative timestamp, unread badge (red dot with count if `chef_unread_count > 0`)
- Selected thread gets a highlighted border (`border-amber-600`)
- Empty state: "No private conversations yet. Members can reach you from their circle view."
- Sort: threads with unread first, then by last_message_at descending (already sorted from server)
- Use Tailwind only. Dark theme (stone-800/900 palette). No external UI libraries.

### 4b. Private Thread Chat

**File:** `components/hub/private-thread-chat.tsx` (NEW FILE)

This component shows the message history for a single private thread and lets the user send messages.

Props:

```typescript
interface PrivateThreadChatProps {
  threadId: string
  profileToken: string
  currentProfileId: string
  otherParticipantName: string
  onBack?: () => void // mobile: go back to thread list
}
```

Requirements:

- `'use client'` at top
- On mount: call `getPrivateMessages({ threadId, profileToken })` to load messages. Also call `markPrivateThreadRead({ threadId, profileToken })`.
- Messages displayed in chronological order (reverse the array since server returns newest-first)
- Sent messages (sender_profile_id === currentProfileId) aligned RIGHT with amber/orange background
- Received messages aligned LEFT with stone-700 background
- Each message shows: body text, timestamp (hour:minute format)
- "Load more" button at the TOP for older messages (uses cursor pagination)
- Text input at the bottom: use a simple `<textarea>` + send button. Do NOT import HubInput (to avoid coupling). Enter key sends (shift+enter for newline).
- After sending: call `sendPrivateMessage`, prepend the new message to the list optimistically, then call `router.refresh()` (import `useRouter` from `next/navigation`)
- Wrap send in try/catch. On error, remove the optimistic message and show `toast.error()` (import from `sonner`)
- Back button (arrow left icon) at top if `onBack` is provided
- Header: shows other participant's name
- Use Tailwind only. Dark theme.
- Max height for message area: `flex-1 overflow-y-auto` in a flex column layout

### 4c. Private Messages Tab Wrapper (for circle detail, chef-side)

**File:** `components/hub/private-messages-tab.tsx` (NEW FILE)

This component combines the thread list and chat into a single tab view for the chef's circle detail page.

Props:

```typescript
interface PrivateMessagesTabProps {
  groupId: string
  chefProfileToken: string
  chefProfileId: string
}
```

Requirements:

- `'use client'` at top
- On mount: call `getMyPrivateThreads({ groupId, profileToken: chefProfileToken })` to load threads
- State: `selectedThread: PrivateThread | null`
- If no thread selected: show `<PrivateThreadList>` full width
- If thread selected: show `<PrivateThreadChat>` with `onBack` to deselect
- Loading state: simple "Loading..." text while fetching threads

### 4d. Guest Private Chat (for hub group view, guest-side)

**File:** `components/hub/guest-private-chat.tsx` (NEW FILE)

This component is the guest's view of private messaging. Shows their single thread with the chef, or an empty state to start one.

Props:

```typescript
interface GuestPrivateChatProps {
  groupId: string
  profileToken: string
  currentProfileId: string
  chefProfileId: string
  chefName: string
}
```

Requirements:

- `'use client'` at top
- On mount: call `getMyPrivateThreads({ groupId, profileToken })` to check for existing thread
- If thread exists (array length > 0): render `<PrivateThreadChat>` with the thread
- If no thread: show empty state with chef name and "Start a private conversation" button
- When button clicked: call `getOrCreatePrivateThread({ groupId, profileToken, targetProfileId: chefProfileId })`, then render the chat
- Loading state while checking for thread
- Use Tailwind only. Dark theme.

---

## Phase 5: Integration

### 5a. Chef-side: Circle Detail Page

**File:** `app/(chef)/circles/[id]/circle-detail-client.tsx`

Three small changes:

**Change 1:** Update the Tab type on line 18:

```typescript
// BEFORE:
type Tab = 'overview' | 'members' | 'events' | 'sourcing' | 'messages'

// AFTER:
type Tab = 'overview' | 'members' | 'events' | 'sourcing' | 'messages' | 'private'
```

**Change 2:** Add the tab entry to the `tabs` array (after the 'messages' entry, around line 30):

```typescript
{ key: 'messages', label: 'Messages', count: circle.message_count },
{ key: 'private', label: 'Private' },
```

**Change 3:** Add the tab content render. Find where `{tab === 'messages' && <MessagesTab .../>}` is rendered and add below it:

```typescript
{tab === 'private' && <PrivateMessagesTabWrapper circle={circle} />}
```

**Change 4:** Add the wrapper component inside the same file (or as a separate function above the main export). This wrapper needs to get the chef's profile token. Add this component:

```typescript
import { PrivateMessagesTab } from '@/components/hub/private-messages-tab'

function PrivateMessagesTabWrapper({ circle }: { circle: CircleDetail }) {
  const [chefProfile, setChefProfile] = useState<{
    profileToken: string
    profileId: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const { getChefHubProfile } = await import('@/lib/hub/private-message-actions')
        // We need the chef's hub profile. The chef's profile is the owner of this circle's group.
        // For now, use a simple fetch approach.
        setLoading(false)
      } catch {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  // ... render PrivateMessagesTab
}
```

**IMPORTANT:** The `CircleDetail` type (from `lib/hub/circle-detail-actions.ts`) may not include the chef's hub profile token. You will need to either:

1. Add a new server action `getChefHubProfileForCircle(groupId)` in `private-message-actions.ts` that looks up the owner's profile_token and profile_id
2. OR pass it from the server page component

**Recommended approach:** Add this function to `lib/hub/private-message-actions.ts`:

```typescript
/**
 * Get the chef's hub profile for a circle (used by chef-side UI to initialize private messaging).
 * Must be called by an authenticated chef.
 */
export async function getChefHubProfileForCircle(groupId: string): Promise<{
  profileId: string
  profileToken: string
} | null> {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id, profile_token')
    .eq('auth_user_id', user.userId)
    .maybeSingle()

  if (!profile) return null
  return { profileId: profile.id, profileToken: profile.profile_token }
}
```

### 5b. Guest-side: Hub Group View

**File:** `app/(public)/hub/g/[groupToken]/hub-group-view.tsx`

Three small changes:

**Change 1:** Add 'private' to the Tab type (around line 57):

```typescript
// BEFORE:
type Tab =
  | 'dashboard'
  | 'chat'
  | 'meals'
  // ... etc
  | 'settings'

// AFTER (add 'private' to the union):
type Tab =
  | 'dashboard'
  | 'chat'
  | 'meals'
  // ... etc
  | 'settings'
  | 'private'
```

**Change 2:** Add the tab to baseTabs array. Insert AFTER the 'chat' entry (around line 204):

```typescript
{ id: 'chat', label: 'Chat', emoji: '💬' },
// Add this line:
...(profileToken ? [{ id: 'private' as Tab, label: 'Private', emoji: '🔒' }] : []),
```

The tab only shows when the user has a profileToken (is logged in / identified).

**Change 3:** Add the tab content render. Find the section where tabs are rendered (look for `{activeTab === 'chat' && ...}`) and add:

```tsx
{
  activeTab === 'private' && profileToken && currentProfileId && (
    <GuestPrivateChat
      groupId={group.id}
      profileToken={profileToken}
      currentProfileId={currentProfileId}
      chefProfileId={(() => {
        const chefMember = members.find((m) => m.role === 'owner' || m.role === 'chef')
        return chefMember?.profile_id ?? ''
      })()}
      chefName={(() => {
        const chefMember = members.find((m) => m.role === 'owner' || m.role === 'chef')
        return chefMember?.profile?.display_name ?? 'Chef'
      })()}
    />
  )
}
```

Add the import at the top of the file:

```typescript
import { GuestPrivateChat } from '@/components/hub/guest-private-chat'
```

---

## Verification Checklist

After all code is written, run:

```bash
npx tsc --noEmit --skipLibCheck
```

This MUST pass with zero errors. If it fails, fix the type errors before committing.

**Manual verification (do NOT do this, just write the code):**

- [ ] Migration file exists at correct path with correct timestamp
- [ ] Types appended to lib/hub/types.ts without modifying existing types
- [ ] Server actions file has all 5 exported functions + 1 helper (getChefHubProfileForCircle)
- [ ] 4 new component files exist
- [ ] circle-detail-client.tsx has 'private' tab
- [ ] hub-group-view.tsx has 'private' tab (only when profileToken exists)
- [ ] No em dashes in any file
- [ ] No `@ts-nocheck` in any file

---

## File Summary

| Action | File                                                           |
| ------ | -------------------------------------------------------------- |
| CREATE | `database/migrations/20260426000004_hub_private_threads.sql`   |
| APPEND | `lib/hub/types.ts` (add 2 interfaces at end)                   |
| CREATE | `lib/hub/private-message-actions.ts`                           |
| CREATE | `components/hub/private-thread-list.tsx`                       |
| CREATE | `components/hub/private-thread-chat.tsx`                       |
| CREATE | `components/hub/private-messages-tab.tsx`                      |
| CREATE | `components/hub/guest-private-chat.tsx`                        |
| MODIFY | `app/(chef)/circles/[id]/circle-detail-client.tsx` (add tab)   |
| MODIFY | `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` (add tab) |
