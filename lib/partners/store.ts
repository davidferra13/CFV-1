// Tenant-explicit partner helpers for API v2 routes.
// Accepts tenantId directly instead of calling requireChef().

import { createServerClient } from '@/lib/db/server'

/**
 * Bulk assign events to a partner, with tenant ownership validation.
 * Rejects the whole request if any event/partner/location is outside the tenant.
 */
export async function bulkAssignEventsForTenant(
  tenantId: string,
  partnerId: string,
  locationId: string | null,
  eventIds: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const db: any = createServerClient({ admin: true })

  if (!eventIds.length) return { success: true, count: 0 }

  // Verify partner belongs to this tenant
  const { data: partner } = await db
    .from('referral_partners')
    .select('id')
    .eq('id', partnerId)
    .eq('tenant_id', tenantId)
    .single()

  if (!partner) return { success: false, count: 0, error: 'partner_not_found' }

  // If locationId provided, verify it belongs to this partner
  if (locationId) {
    const { data: location } = await db
      .from('partner_locations')
      .select('id')
      .eq('id', locationId)
      .eq('partner_id', partnerId)
      .eq('tenant_id', tenantId)
      .single()

    if (!location) return { success: false, count: 0, error: 'location_not_found' }
  }

  // Verify ALL events belong to tenant (reject entire request if any don't)
  const { data: ownedEvents } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('id', eventIds)

  const ownedIds = new Set((ownedEvents ?? []).map((e: any) => e.id))
  const foreign = eventIds.filter((id) => !ownedIds.has(id))
  if (foreign.length > 0) {
    return { success: false, count: 0, error: 'cross_tenant_events' }
  }

  // Update events
  const { error } = await db
    .from('events')
    .update({
      referral_partner_id: partnerId,
      partner_location_id: locationId,
    })
    .eq('tenant_id', tenantId)
    .in('id', eventIds)

  if (error) return { success: false, count: 0, error: error.message }
  return { success: true, count: eventIds.length }
}
