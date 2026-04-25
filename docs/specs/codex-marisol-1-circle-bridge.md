# Codex Spec: Recurring Service -> Circle Bridge

> **Status:** ready-to-build
> **Priority:** P0 (foundational wiring)
> **Agent type:** Codex (surgical, additive-only)
> **Estimated scope:** 1 new file, 2 small edits to existing files
> **Depends on:** Nothing (uses existing circle + recurring infrastructure)

---

## Problem

ChefFlow has a full recurring services system (`recurring_services`, `meal_prep_programs`, `meal_prep_weeks`) and a full Dinner Circles communication system (`hub_groups`, `hub_messages`, `hub_group_members`). They are not connected. A meal prep chef with 18 recurring clients has no persistent communication channel per client. Every week starts from scratch.

## What To Build

Wire recurring services to Dinner Circles so that when a chef starts a recurring service or meal prep program for a client, that client automatically gets a persistent Dinner Circle for ongoing communication. Lifecycle events (program created, meals prepped, meals delivered) post as system messages to the circle.

---

## Preparation: Read These Files First

Before writing ANY code, read and understand these files completely:

1. `lib/hub/chef-circle-actions.ts` -- see `getChefCircles()` for DB query patterns (compat shim API)
2. `lib/hub/circle-lookup.ts` -- see `getChefHubProfileId()` (you will import and call this)
3. `lib/hub/email-to-circle.ts` -- see `findOrCreateClientHubProfile()` (you will import and call this)
4. `lib/recurring/actions.ts` -- see `createRecurringService()` at line 60 (you will add 4 lines after `revalidateRecurringPaths`)
5. `lib/meal-prep/program-actions.ts` -- see `createMealPrepProgram()` at line 104, `markWeekPrepped()`, `markWeekDelivered()` (you will add non-blocking calls)
6. `lib/db/server.ts` -- see `createServerClient()` usage pattern

---

## Exact Changes

### Part 1: New File -- `lib/recurring/circle-bridge.ts`

Create this NEW file. It exports two functions. Both are non-blocking (try/catch, never throw).

```typescript
'use server'

import { createServerClient } from '@/lib/db/server'
import { getChefHubProfileId } from '@/lib/hub/circle-lookup'
import { findOrCreateClientHubProfile } from '@/lib/hub/email-to-circle'

/**
 * Ensure a recurring client has a Dinner Circle for ongoing communication.
 * If the client already has a circle (via clients.dinner_circle_group_id), returns it.
 * Otherwise creates one and links it.
 *
 * Non-blocking: logs errors, never throws.
 */
export async function ensureRecurringClientCircle(
  chefId: string,
  clientId: string,
  serviceName: string
): Promise<string | null> {
  try {
    const db: any = createServerClient({ admin: true })

    // 1. Check if client already has a circle
    const { data: client } = await db
      .from('clients')
      .select('id, dinner_circle_group_id, full_name, email')
      .eq('id', clientId)
      .eq('tenant_id', chefId)
      .single()

    if (!client) {
      console.warn('[circle-bridge] Client not found:', clientId)
      return null
    }

    if (client.dinner_circle_group_id) {
      return client.dinner_circle_group_id
    }

    // 2. Get or create hub profiles for chef and client
    const chefProfileId = await getChefHubProfileId(chefId)
    if (!chefProfileId) {
      console.warn('[circle-bridge] Chef has no hub profile, skipping circle creation')
      return null
    }

    // Client needs email for hub profile
    if (!client.email) {
      console.warn('[circle-bridge] Client has no email, skipping circle creation')
      return null
    }

    // 3. Create the circle (hub_group)
    const circleName = `${client.full_name || 'Client'} - ${serviceName}`

    const { data: group, error: groupError } = await db
      .from('hub_groups')
      .insert({
        name: circleName,
        group_type: 'circle',
        tenant_id: chefId,
        is_active: true,
        created_by_profile_id: chefProfileId,
        visibility: 'private',
        chef_approval_required: false,
        consent_status: 'ready',
      })
      .select('id, group_token')
      .single()

    if (groupError || !group) {
      console.error('[circle-bridge] Failed to create circle:', groupError?.message)
      return null
    }

    // 4. Add chef as member
    await db.from('hub_group_members').insert({
      group_id: group.id,
      profile_id: chefProfileId,
      role: 'chef',
      can_post: true,
      can_invite: true,
      can_pin: true,
    })

    // 5. Add client as member (creates hub profile if needed)
    const { profileId: clientProfileId } = await findOrCreateClientHubProfile({
      email: client.email,
      name: client.full_name || '',
      circleGroupId: group.id,
    })

    // 6. Link circle to client record
    await db
      .from('clients')
      .update({ dinner_circle_group_id: group.id })
      .eq('id', clientId)
      .eq('tenant_id', chefId)

    // Also link the hub profile to the client record if not already linked
    await db
      .from('hub_guest_profiles')
      .update({ client_id: clientId })
      .eq('id', clientProfileId)
      .is('client_id', null)

    return group.id
  } catch (err) {
    console.error('[circle-bridge] ensureRecurringClientCircle failed:', err)
    return null
  }
}

/**
 * Post a system message to a client's dinner circle.
 * If the client has no circle, silently skips.
 *
 * Non-blocking: logs errors, never throws.
 */
export async function postRecurringLifecycleMessage(
  chefId: string,
  clientId: string,
  messageBody: string
): Promise<void> {
  try {
    const db: any = createServerClient({ admin: true })

    // Get client's circle
    const { data: client } = await db
      .from('clients')
      .select('dinner_circle_group_id')
      .eq('id', clientId)
      .eq('tenant_id', chefId)
      .single()

    if (!client?.dinner_circle_group_id) return

    const groupId = client.dinner_circle_group_id

    // Get chef's hub profile for authorship
    const chefProfileId = await getChefHubProfileId(chefId)
    if (!chefProfileId) return

    // Post system message
    await db.from('hub_messages').insert({
      group_id: groupId,
      author_profile_id: chefProfileId,
      message_type: 'system',
      body: messageBody,
      source: 'system',
    })

    // Update circle's last message metadata
    const preview = messageBody.length > 100 ? messageBody.slice(0, 97) + '...' : messageBody
    await db
      .from('hub_groups')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
      })
      .eq('id', groupId)
  } catch (err) {
    console.error('[circle-bridge] postRecurringLifecycleMessage failed:', err)
  }
}
```

### Part 2: Edit `lib/recurring/actions.ts`

**Add import at the top of the file** (after existing imports):

```typescript
import {
  ensureRecurringClientCircle,
  postRecurringLifecycleMessage,
} from '@/lib/recurring/circle-bridge'
```

**In `createRecurringService()` function** -- add these lines AFTER `revalidateRecurringPaths(inserted?.client_id)` and BEFORE the closing `}` of the function:

```typescript
// Bridge: ensure client has a dinner circle for recurring communication
try {
  if (inserted?.client_id) {
    await ensureRecurringClientCircle(
      chef.id,
      inserted.client_id,
      data.service_type || 'Recurring Service'
    )
    await postRecurringLifecycleMessage(
      chef.id,
      inserted.client_id,
      `Recurring service started: ${data.service_type?.replace(/_/g, ' ') || 'meal prep'}`
    )
  }
} catch (err) {
  console.error('[non-blocking] Recurring circle bridge failed', err)
}
```

**Do NOT change anything else in this file.**

### Part 3: Edit `lib/meal-prep/program-actions.ts`

**Add import at the top of the file** (after existing imports):

```typescript
import {
  ensureRecurringClientCircle,
  postRecurringLifecycleMessage,
} from '@/lib/recurring/circle-bridge'
```

**In `createMealPrepProgram()` function** -- add these lines AFTER `revalidatePath('/meal-prep')` and BEFORE `return { id: data.id }`:

```typescript
// Bridge: ensure client has a dinner circle for meal prep communication
try {
  await ensureRecurringClientCircle(user.tenantId!, parsed.client_id, 'Meal Prep')
  await postRecurringLifecycleMessage(
    user.tenantId!,
    parsed.client_id,
    `Meal prep program created with ${parsed.rotation_weeks}-week rotation cycle`
  )
} catch (err) {
  console.error('[non-blocking] Meal prep circle bridge failed', err)
}
```

**In `markWeekPrepped()` function** -- find where it updates the `prepped_at` timestamp. AFTER that update succeeds, add:

```typescript
// Post prep notification to circle
try {
  const { data: prog } = await db
    .from('meal_prep_programs')
    .select('client_id')
    .eq('id', programId)
    .eq('tenant_id', user.tenantId!)
    .single()
  if (prog?.client_id) {
    await postRecurringLifecycleMessage(
      user.tenantId!,
      prog.client_id,
      `Week ${rotationWeek} meals prepped and ready`
    )
  }
} catch (err) {
  console.error('[non-blocking] Prep circle notification failed', err)
}
```

**In `markWeekDelivered()` function** -- find where it updates the `delivered_at` timestamp. AFTER that update succeeds, add:

```typescript
// Post delivery notification to circle
try {
  const { data: prog } = await db
    .from('meal_prep_programs')
    .select('client_id')
    .eq('id', programId)
    .eq('tenant_id', user.tenantId!)
    .single()
  if (prog?.client_id) {
    await postRecurringLifecycleMessage(
      user.tenantId!,
      prog.client_id,
      `Week ${rotationWeek} meals delivered`
    )
  }
} catch (err) {
  console.error('[non-blocking] Delivery circle notification failed', err)
}
```

Read the actual `markWeekPrepped` and `markWeekDelivered` functions to get the correct variable names for `programId` and `rotationWeek`. The examples above use placeholder names. Use whatever the function actually calls them.

---

## DO NOT TOUCH

- Any database migration files
- Any schema files (`lib/db/schema/`)
- `lib/hub/chef-circle-actions.ts`
- `lib/hub/circle-lookup.ts` (import only)
- `lib/hub/email-to-circle.ts` (import only)
- Any UI/page files
- Any test files
- Any other functions in the files you edit

---

## Anti-Regression Rules

1. Both bridge functions are NON-BLOCKING. They use try/catch and return null/void on error. They NEVER throw.
2. The integration points in existing actions are wrapped in try/catch. If the bridge fails, the original action MUST still succeed exactly as before.
3. Do NOT change the return type, parameters, or behavior of any existing function.
4. Do NOT add required parameters to existing functions.
5. Do NOT modify existing database queries.
6. Do NOT create migration files.
7. Do NOT import from `'use server'` files into non-server files.

---

## Verification

After completing all changes:

1. `npx tsc --noEmit --skipLibCheck` must exit 0
2. The new file `lib/recurring/circle-bridge.ts` must exist and export both functions
3. Both edited files must still export all their original functions unchanged
4. Every bridge call in the edited files must be inside a try/catch block
