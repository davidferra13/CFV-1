// Event Ambiance Server Actions
// Fetch and update per-event atmosphere notes.
// Works at ANY event status (ambiance is operational, not contractual).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const AmbianceSchema = z.object({
  ambiance_notes: z.string().max(5000).nullable(),
})

export type AmbianceInput = z.infer<typeof AmbianceSchema>

export async function getEventAmbiance(eventId: string): Promise<string | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('events')
    .select('ambiance_notes')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) return null
  return (data as any).ambiance_notes ?? null
}

export async function updateEventAmbiance(
  eventId: string,
  input: AmbianceInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const parsed = AmbianceSchema.parse(input)

  const { error } = await db
    .from('events')
    .update({
      ambiance_notes: parsed.ambiance_notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[ambiance] update failed', error)
    return { success: false, error: 'Failed to save ambiance notes' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
