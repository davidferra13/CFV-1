'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export interface ManifestStop {
  order: number
  clientName: string
  address: string
  phone: string | null
  email: string | null
  mealCount: number
  containerCount: number
  deliveryWindow: string
  specialNotes: string | null
  status: string
}

export interface DeliveryManifest {
  date: string
  chefName: string
  totalStops: number
  totalMeals: number
  totalContainers: number
  stops: ManifestStop[]
}

// ============================================
// Actions
// ============================================

/**
 * Generate a structured manifest for a delivery date.
 * Returns all the data needed to render a printable delivery document.
 */
export async function generateDeliveryManifest(deliveryDate: string): Promise<{
  manifest?: DeliveryManifest
  error?: string
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Get chef info
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', tenantId)
    .single()

  // Get all deliveries for this date
  const { data: deliveries, error } = await supabase
    .from('meal_prep_deliveries')
    .select(
      `
      *,
      client:clients(id, full_name, phone, email),
      program:meal_prep_programs(id, delivery_window_start, delivery_window_end)
    `
    )
    .eq('chef_id', tenantId)
    .eq('delivery_date', deliveryDate)
    .order('delivery_order', { ascending: true })

  if (error) {
    return { error: error.message }
  }

  if (!deliveries || deliveries.length === 0) {
    return { error: 'No deliveries found for this date.' }
  }

  const stops: ManifestStop[] = deliveries.map((d: any) => ({
    order: d.delivery_order,
    clientName: d.client?.full_name || 'Unknown Client',
    address: d.delivery_address,
    phone: d.client?.phone || null,
    email: d.client?.email || null,
    mealCount: d.meal_count,
    containerCount: d.container_count,
    deliveryWindow: d.program
      ? `${d.program.delivery_window_start} - ${d.program.delivery_window_end}`
      : d.scheduled_time || 'Not set',
    specialNotes: d.delivery_instructions || d.delivery_notes || null,
    status: d.status,
  }))

  const manifest: DeliveryManifest = {
    date: deliveryDate,
    chefName: chef?.business_name || 'Chef',
    totalStops: stops.length,
    totalMeals: stops.reduce((sum, s) => sum + s.mealCount, 0),
    totalContainers: stops.reduce((sum, s) => sum + s.containerCount, 0),
    stops,
  }

  return { manifest }
}
