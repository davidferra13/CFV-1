'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'

const SaveHubPushSchema = z.object({
  profileToken: z.string().uuid(),
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
})

/**
 * Save a Web Push subscription for a hub guest profile.
 * Token-validated, no auth session required.
 *
 * This is the only client-callable server action in this module.
 * Read/deactivate/increment operations are in hub-push-subscriptions-internal.ts
 * (not a 'use server' file) to prevent direct client invocation.
 */
export async function saveHubPushSubscription(
  input: z.infer<typeof SaveHubPushSchema>
): Promise<void> {
  const validated = SaveHubPushSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  await db.from('hub_push_subscriptions').upsert(
    {
      profile_id: profile.id,
      endpoint: validated.endpoint,
      p256dh: validated.p256dh,
      auth_key: validated.auth,
      is_active: true,
      failed_count: 0,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )
}
