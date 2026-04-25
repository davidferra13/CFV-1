# Post-Dinner Circle Onramp

> **Status:** SPEC - Ready for Codex  
> **Priority:** P0  
> **Scope:** After a dinner completes, include a "Join this chef's Dinner Circle" section in the thank-you email so guests become circle members for future events.  
> **Risk:** LOW - modifies one email template (additive section), modifies one Inngest job to pass extra data. No schema changes.

---

## Problem

After a successful dinner, the guest has no frictionless path into the chef's Dinner Circle. The chef would need to manually send them a join link. This gap means repeat clients (like Isabella) stay on Take a Chef instead of graduating to a direct relationship via the circle.

## Solution

Add a "Stay Connected" section to the post-event thank-you email (sent 3 days after event completion). If the event has an associated Dinner Circle, include the circle join link. If the guest is already a circle member, skip the section.

## Existing Infrastructure (DO NOT recreate)

- `lib/jobs/post-event-jobs.ts:107-151` - Inngest job `postEventThankYou` that sends the thank-you email 3 days after completion. This is where we add the circle lookup.
- `lib/hub/circle-lookup.ts:87` - `getCircleForEvent(eventId)` returns `{ groupId, groupToken, tenantId }` or null.
- `lib/email/templates/post-event-thank-you.tsx` - The existing thank-you email template. We add a new section here.
- `lib/email/notifications.ts:1338` - `sendPostEventThankYouEmail()` dispatcher. We add the optional circle props here.

## Files to Modify

### 1. `lib/email/templates/post-event-thank-you.tsx`

**ADD** two optional props to the `PostEventThankYouProps` type:

```ts
type PostEventThankYouProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  bookAgainUrl: string
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
  loyaltyPointsEarned?: number | null
  loyaltyPointsBalance?: number | null
  circleJoinUrl?: string | null // ADD THIS
  circleGroupName?: string | null // ADD THIS
}
```

**ADD** `circleJoinUrl` and `circleGroupName` to the function parameter destructuring.

**ADD** a new section in the email body, AFTER the loyalty section and BEFORE the `<Hr>` divider. This section only renders when `circleJoinUrl` is truthy:

```tsx
{
  circleJoinUrl ? (
    <>
      <Hr style={divider} />
      <Text style={heading}>Stay connected</Text>
      <Text style={paragraph}>
        {chefName} hosts dinners regularly through a Dinner Circle
        {circleGroupName ? ` called "${circleGroupName}"` : ''}. Join to get first access to
        upcoming events, menus, and availability.
      </Text>
      <Button
        style={{
          display: 'inline-block',
          backgroundColor: '#78350f',
          color: '#ffffff',
          padding: '12px 28px',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '15px',
          textDecoration: 'none',
        }}
        href={circleJoinUrl}
      >
        Join the Dinner Circle
      </Button>
    </>
  ) : null
}
```

**IMPORTANT:** No em dashes. The section above uses commas and periods only.

### 2. `lib/email/notifications.ts`

**MODIFY** the `sendPostEventThankYouEmail` function (around line 1338). Add two optional parameters:

Find:

```ts
export async function sendPostEventThankYouEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  bookAgainUrl: string
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
  loyaltyPointsEarned?: number | null
  loyaltyPointsBalance?: number | null
}) {
```

Replace with:

```ts
export async function sendPostEventThankYouEmail(params: {
  clientEmail: string
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  bookAgainUrl: string
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
  loyaltyPointsEarned?: number | null
  loyaltyPointsBalance?: number | null
  circleJoinUrl?: string | null
  circleGroupName?: string | null
}) {
```

**ALSO** pass the two new props through to the `createElement` call inside the same function. Find the `createElement(PostEventThankYouEmail, {` block and add:

```ts
      circleJoinUrl: params.circleJoinUrl ?? null,
      circleGroupName: params.circleGroupName ?? null,
```

### 3. `lib/jobs/post-event-jobs.ts`

**MODIFY** the `postEventThankYou` Inngest function. Inside the `step.run('send-thank-you-email', ...)` callback (around line 120-141), add a circle lookup BEFORE the `sendPostEventThankYouEmail` call.

Find this block (around line 120-141):

```ts
    const result = await step.run('send-thank-you-email', async () => {
      const ctx = await getPostEventContext(
        event.data.eventId,
        event.data.tenantId,
        event.data.clientId
      )
      if (!ctx) return { skipped: true, reason: 'context unavailable or opted out' }

      const { sendPostEventThankYouEmail } = await import('@/lib/email/notifications')

      await sendPostEventThankYouEmail({
        clientEmail: ctx.client.email,
        clientName: ctx.client.name,
        chefName: ctx.chefName,
        occasion: ctx.occasion,
        eventDate: ctx.eventDate,
        bookAgainUrl: `${APP_URL}/book`,
        loyaltyTier: ctx.loyalty.tier,
        loyaltyPointsEarned: ctx.loyalty.pointsEarned,
        loyaltyPointsBalance: ctx.loyalty.pointsBalance,
      })
```

Replace with:

```ts
    const result = await step.run('send-thank-you-email', async () => {
      const ctx = await getPostEventContext(
        event.data.eventId,
        event.data.tenantId,
        event.data.clientId
      )
      if (!ctx) return { skipped: true, reason: 'context unavailable or opted out' }

      // Look up circle for this event to include join CTA
      let circleJoinUrl: string | null = null
      let circleGroupName: string | null = null
      try {
        const { getCircleForEvent } = await import('@/lib/hub/circle-lookup')
        const circle = await getCircleForEvent(event.data.eventId)
        if (circle) {
          // Check if client is already a member
          const { createServerClient } = await import('@/lib/db/server')
          const db: any = createServerClient({ admin: true })

          // Find client's hub profile by auth_user_id or email
          const { data: clientProfile } = await db
            .from('hub_guest_profiles')
            .select('id')
            .or(`auth_user_id.eq.${ctx.client.authUserId ?? 'none'},email.eq.${ctx.client.email}`)
            .limit(1)
            .maybeSingle()

          let alreadyMember = false
          if (clientProfile) {
            const { data: membership } = await db
              .from('hub_group_members')
              .select('id')
              .eq('group_id', circle.groupId)
              .eq('profile_id', clientProfile.id)
              .maybeSingle()
            alreadyMember = !!membership
          }

          if (!alreadyMember) {
            circleJoinUrl = `${APP_URL}/hub/join/${circle.groupToken}`

            const { data: groupData } = await db
              .from('hub_groups')
              .select('name')
              .eq('id', circle.groupId)
              .single()
            circleGroupName = groupData?.name ?? null
          }
        }
      } catch (err) {
        console.error('[non-blocking] Circle lookup for thank-you email failed', err)
      }

      const { sendPostEventThankYouEmail } = await import('@/lib/email/notifications')

      await sendPostEventThankYouEmail({
        clientEmail: ctx.client.email,
        clientName: ctx.client.name,
        chefName: ctx.chefName,
        occasion: ctx.occasion,
        eventDate: ctx.eventDate,
        bookAgainUrl: `${APP_URL}/book`,
        loyaltyTier: ctx.loyalty.tier,
        loyaltyPointsEarned: ctx.loyalty.pointsEarned,
        loyaltyPointsBalance: ctx.loyalty.pointsBalance,
        circleJoinUrl,
        circleGroupName,
      })
```

**NOTE:** The `ctx.client` object may not have `authUserId`. Check the `getPostEventContext` function at the top of the same file. If `authUserId` is not available on the client object, use only the email-based lookup:

```ts
const { data: clientProfile } = await db
  .from('hub_guest_profiles')
  .select('id')
  .eq('email', ctx.client.email)
  .limit(1)
  .maybeSingle()
```

## Verification

After building, verify:

1. `npx tsc --noEmit --skipLibCheck` passes
2. The `PostEventThankYouEmail` component accepts `circleJoinUrl` and `circleGroupName` as optional props
3. When `circleJoinUrl` is null/undefined, the email renders exactly as before (no visible change)
4. The Inngest job still works when no circle exists (circle lookup returns null, props stay null)

## What NOT to Do

- Do NOT modify any database schema or create migrations
- Do NOT modify the post-event survey, review request, referral ask, or tip prompt emails
- Do NOT create new Inngest functions or events
- Do NOT modify the event FSM or transitions
- Do NOT touch `circle-notification-actions.ts` (that is Spec 1's territory)
- Do NOT make the circle lookup blocking (if it fails, the thank-you email still sends without the circle section)
