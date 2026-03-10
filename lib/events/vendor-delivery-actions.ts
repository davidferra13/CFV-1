'use server'

// Vendor Delivery Schedule - Server Actions
// Manages vendor delivery tracking per event.
// Chef-facing actions for scheduling, updating, and tracking vendor deliveries.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type DeliveryType =
  | 'food'
  | 'equipment'
  | 'rentals'
  | 'flowers'
  | 'av'
  | 'linen'
  | 'ice'
  | 'beverage'
  | 'other'

export type DeliveryStatus =
  | 'scheduled'
  | 'confirmed'
  | 'arrived'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type VendorDelivery = {
  id: string
  event_id: string
  chef_id: string
  vendor_id: string | null
  vendor_name: string
  delivery_type: DeliveryType
  scheduled_time: string | null
  actual_arrival_time: string | null
  contact_name: string | null
  contact_phone: string | null
  items_description: string | null
  special_instructions: string | null
  status: DeliveryStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type AddDeliveryInput = {
  vendor_id?: string | null
  vendor_name: string
  delivery_type: DeliveryType
  scheduled_time?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  items_description?: string | null
  special_instructions?: string | null
  notes?: string | null
}

export type UpdateDeliveryInput = Partial<
  Omit<AddDeliveryInput, 'vendor_id'> & {
    status?: DeliveryStatus
  }
>

// ============================================
// ADD VENDOR DELIVERY
// ============================================

export async function addVendorDelivery(
  eventId: string,
  input: AddDeliveryInput
): Promise<VendorDelivery> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify event belongs to tenant
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  const { data: delivery, error } = await supabase
    .from('event_vendor_deliveries')
    .insert({
      event_id: eventId,
      chef_id: user.tenantId!,
      vendor_id: input.vendor_id || null,
      vendor_name: input.vendor_name,
      delivery_type: input.delivery_type,
      scheduled_time: input.scheduled_time || null,
      contact_name: input.contact_name || null,
      contact_phone: input.contact_phone || null,
      items_description: input.items_description || null,
      special_instructions: input.special_instructions || null,
      notes: input.notes || null,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) {
    console.error('[vendor-deliveries] addVendorDelivery error:', error)
    throw new Error('Failed to add vendor delivery')
  }

  revalidatePath(`/events/${eventId}`)
  return delivery as VendorDelivery
}

// ============================================
// UPDATE VENDOR DELIVERY
// ============================================

export async function updateVendorDelivery(
  deliveryId: string,
  input: UpdateDeliveryInput
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify delivery belongs to tenant
  const { data: existing, error: fetchError } = await supabase
    .from('event_vendor_deliveries')
    .select('id, event_id')
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !existing) {
    throw new Error('Delivery not found')
  }

  const updateData: Record<string, unknown> = {}
  if (input.vendor_name !== undefined) updateData.vendor_name = input.vendor_name
  if (input.delivery_type !== undefined) updateData.delivery_type = input.delivery_type
  if (input.scheduled_time !== undefined) updateData.scheduled_time = input.scheduled_time || null
  if (input.contact_name !== undefined) updateData.contact_name = input.contact_name || null
  if (input.contact_phone !== undefined) updateData.contact_phone = input.contact_phone || null
  if (input.items_description !== undefined)
    updateData.items_description = input.items_description || null
  if (input.special_instructions !== undefined)
    updateData.special_instructions = input.special_instructions || null
  if (input.notes !== undefined) updateData.notes = input.notes || null
  if (input.status !== undefined) updateData.status = input.status

  const { error } = await supabase
    .from('event_vendor_deliveries')
    .update(updateData)
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendor-deliveries] updateVendorDelivery error:', error)
    throw new Error('Failed to update vendor delivery')
  }

  revalidatePath(`/events/${existing.event_id}`)
}

// ============================================
// DELETE VENDOR DELIVERY
// ============================================

export async function deleteVendorDelivery(deliveryId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify delivery belongs to tenant
  const { data: existing, error: fetchError } = await supabase
    .from('event_vendor_deliveries')
    .select('id, event_id')
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !existing) {
    throw new Error('Delivery not found')
  }

  const { error } = await supabase
    .from('event_vendor_deliveries')
    .delete()
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendor-deliveries] deleteVendorDelivery error:', error)
    throw new Error('Failed to delete vendor delivery')
  }

  revalidatePath(`/events/${existing.event_id}`)
}

// ============================================
// GET EVENT VENDOR DELIVERIES
// ============================================

export async function getEventVendorDeliveries(eventId: string): Promise<VendorDelivery[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_vendor_deliveries')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('scheduled_time', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('[vendor-deliveries] getEventVendorDeliveries error:', error)
    return []
  }

  return (data ?? []) as VendorDelivery[]
}

// ============================================
// MARK DELIVERY ARRIVED
// ============================================

export async function markDeliveryArrived(deliveryId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: existing, error: fetchError } = await supabase
    .from('event_vendor_deliveries')
    .select('id, event_id')
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !existing) {
    throw new Error('Delivery not found')
  }

  const { error } = await supabase
    .from('event_vendor_deliveries')
    .update({
      status: 'arrived',
      actual_arrival_time: new Date().toISOString(),
    })
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendor-deliveries] markDeliveryArrived error:', error)
    throw new Error('Failed to mark delivery as arrived')
  }

  revalidatePath(`/events/${existing.event_id}`)
}

// ============================================
// MARK DELIVERY COMPLETE
// ============================================

export async function markDeliveryComplete(deliveryId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: existing, error: fetchError } = await supabase
    .from('event_vendor_deliveries')
    .select('id, event_id')
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !existing) {
    throw new Error('Delivery not found')
  }

  const { error } = await supabase
    .from('event_vendor_deliveries')
    .update({ status: 'completed' })
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendor-deliveries] markDeliveryComplete error:', error)
    throw new Error('Failed to mark delivery as completed')
  }

  revalidatePath(`/events/${existing.event_id}`)
}

// ============================================
// GET VENDOR DELIVERY SUMMARY
// ============================================

export async function getVendorDeliverySummary(eventId: string): Promise<{
  total: number
  arrived: number
  completed: number
  pending: number
  cancelled: number
  noShow: number
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_vendor_deliveries')
    .select('status')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[vendor-deliveries] getVendorDeliverySummary error:', error)
    return { total: 0, arrived: 0, completed: 0, pending: 0, cancelled: 0, noShow: 0 }
  }

  const deliveries = data ?? []
  return {
    total: deliveries.length,
    arrived: deliveries.filter((d: any) => d.status === 'arrived').length,
    completed: deliveries.filter((d: any) => d.status === 'completed').length,
    pending: deliveries.filter((d: any) => d.status === 'scheduled' || d.status === 'confirmed')
      .length,
    cancelled: deliveries.filter((d: any) => d.status === 'cancelled').length,
    noShow: deliveries.filter((d: any) => d.status === 'no_show').length,
  }
}
