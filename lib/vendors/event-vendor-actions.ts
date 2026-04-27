'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const AssignVendorSchema = z.object({
  eventId: z.string().uuid(),
  vendorId: z.string().uuid(),
  notes: z.string().optional(),
  amountCents: z.number().int().min(0).optional(),
})

const RemoveAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
})

const AddDeliverySchema = z.object({
  eventId: z.string().uuid(),
  vendorId: z.string().uuid().nullable().optional(),
  vendorName: z.string().min(1, 'Vendor name is required'),
  deliveryType: z.enum([
    'food',
    'equipment',
    'rentals',
    'flowers',
    'av',
    'linen',
    'ice',
    'beverage',
    'other',
  ]),
  scheduledTime: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  itemsDescription: z.string().optional(),
  specialInstructions: z.string().optional(),
  notes: z.string().optional(),
})

const UpdateDeliveryStatusSchema = z.object({
  deliveryId: z.string().uuid(),
  status: z.enum([
    'scheduled',
    'confirmed',
    'arrived',
    'completed',
    'cancelled',
    'no_show',
  ]),
})

// ============================================
// VENDOR-EVENT ASSIGNMENTS
// ============================================

/**
 * List all vendors assigned to an event, with vendor details.
 */
export async function getEventVendorAssignments(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('vendor_event_assignments')
    .select('*, vendor:vendors(*)')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[event-vendors] getEventVendorAssignments error:', error)
    throw new Error('Failed to load vendor assignments')
  }

  return data ?? []
}

/**
 * Assign a vendor to an event.
 */
export async function assignVendorToEvent(input: z.infer<typeof AssignVendorSchema>) {
  const user = await requireChef()
  const parsed = AssignVendorSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('vendor_event_assignments')
    .insert({
      tenant_id: user.tenantId!,
      vendor_id: parsed.vendorId,
      event_id: parsed.eventId,
      notes: parsed.notes || null,
      amount_cents: parsed.amountCents ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('This vendor is already assigned to this event')
    }
    console.error('[event-vendors] assignVendorToEvent error:', error)
    throw new Error('Failed to assign vendor to event')
  }

  revalidatePath(`/events/${parsed.eventId}`)
  return { success: true, data }
}

/**
 * Remove a vendor assignment from an event.
 */
export async function removeVendorFromEvent(assignmentId: string) {
  const user = await requireChef()
  RemoveAssignmentSchema.parse({ assignmentId })
  const db: any = createServerClient()

  const { error } = await db
    .from('vendor_event_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[event-vendors] removeVendorFromEvent error:', error)
    throw new Error('Failed to remove vendor assignment')
  }

  revalidatePath('/events')
  return { success: true }
}

// ============================================
// VENDOR DELIVERIES
// ============================================

/**
 * List all deliveries for an event, ordered by scheduled time.
 */
export async function getEventVendorDeliveries(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_vendor_deliveries')
    .select('*, vendor:vendors(*)')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('scheduled_time', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('[event-vendors] getEventVendorDeliveries error:', error)
    throw new Error('Failed to load vendor deliveries')
  }

  return data ?? []
}

/**
 * Schedule a new vendor delivery for an event.
 */
export async function addVendorDelivery(input: z.infer<typeof AddDeliverySchema>) {
  const user = await requireChef()
  const parsed = AddDeliverySchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_vendor_deliveries')
    .insert({
      event_id: parsed.eventId,
      chef_id: user.tenantId!,
      vendor_id: parsed.vendorId || null,
      vendor_name: parsed.vendorName,
      delivery_type: parsed.deliveryType,
      scheduled_time: parsed.scheduledTime || null,
      contact_name: parsed.contactName || null,
      contact_phone: parsed.contactPhone || null,
      items_description: parsed.itemsDescription || null,
      special_instructions: parsed.specialInstructions || null,
      notes: parsed.notes || null,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) {
    console.error('[event-vendors] addVendorDelivery error:', error)
    throw new Error('Failed to schedule delivery')
  }

  revalidatePath(`/events/${parsed.eventId}`)
  return { success: true, data }
}

/**
 * Update the status of a delivery (e.g. scheduled -> confirmed -> arrived -> completed).
 */
export async function updateDeliveryStatus(input: z.infer<typeof UpdateDeliveryStatusSchema>) {
  const user = await requireChef()
  const parsed = UpdateDeliveryStatusSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_vendor_deliveries')
    .update({
      status: parsed.status,
      actual_arrival_time:
        parsed.status === 'arrived' ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.deliveryId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[event-vendors] updateDeliveryStatus error:', error)
    throw new Error('Failed to update delivery status')
  }

  revalidatePath('/events')
  return { success: true, data }
}

/**
 * Delete a delivery record.
 */
export async function removeVendorDelivery(deliveryId: string) {
  const user = await requireChef()
  z.string().uuid().parse(deliveryId)
  const db: any = createServerClient()

  const { error } = await db
    .from('event_vendor_deliveries')
    .delete()
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[event-vendors] removeVendorDelivery error:', error)
    throw new Error('Failed to remove delivery')
  }

  revalidatePath('/events')
  return { success: true }
}
