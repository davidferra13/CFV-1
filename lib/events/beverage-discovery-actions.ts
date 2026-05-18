'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const BeverageServiceTypes = [
  'chef_provides',
  'client_provides',
  'byob',
  'no_alcohol',
  'tbd',
] as const

const BeverageDiscoverySchema = z.object({
  beverage_expectations: z.string().max(5000).nullable(),
  beverage_service_type: z.enum(BeverageServiceTypes).nullable(),
  alcohol_being_served: z.boolean(),
})

export type BeverageDiscoveryInput = z.infer<typeof BeverageDiscoverySchema>

export type BeverageDiscoveryData = {
  beverage_expectations: string | null
  beverage_service_type: string | null
  alcohol_being_served: boolean
}

export async function getEventBeverageDiscovery(
  eventId: string
): Promise<BeverageDiscoveryData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('events')
    .select('beverage_expectations, beverage_service_type, alcohol_being_served')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) return null
  return {
    beverage_expectations: data.beverage_expectations ?? null,
    beverage_service_type: data.beverage_service_type ?? null,
    alcohol_being_served: data.alcohol_being_served ?? false,
  }
}

export async function updateBeverageDiscovery(
  eventId: string,
  input: BeverageDiscoveryInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const parsed = BeverageDiscoverySchema.parse(input)

  const { error } = await db
    .from('events')
    .update({
      beverage_expectations: parsed.beverage_expectations || null,
      beverage_service_type: parsed.beverage_service_type || null,
      alcohol_being_served: parsed.alcohol_being_served,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[beverage-discovery] update failed', error)
    return { success: false, error: 'Failed to save beverage discovery' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
