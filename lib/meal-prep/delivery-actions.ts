'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// Types
// ============================================

export interface MealPrepDelivery {
  id: string
  chef_id: string
  program_id: string
  client_id: string
  delivery_date: string
  delivery_address: string
  delivery_instructions: string | null
  meal_count: number
  container_count: number
  delivery_order: number
  status: 'scheduled' | 'in_transit' | 'delivered' | 'no_answer' | 'cancelled'
  scheduled_time: string | null
  actual_delivery_time: string | null
  delivery_notes: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
  // Joined
  client?: { id: string; full_name: string; phone: string | null; email: string | null } | null
  program?: {
    id: string
    delivery_window_start: string
    delivery_window_end: string
  } | null
}

// ============================================
// Day-of-week mapping (meal_prep_programs.delivery_day is 0=Sun..6=Sat)
// ============================================

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00') // noon to avoid TZ edge
  return d.getDay()
}

// ============================================
// Actions
// ============================================

/**
 * Auto-generate delivery stops for all active programs delivering on the given date.
 * Sets delivery_order by sorting addresses alphabetically (city/zip).
 */
export async function generateDeliveryRoute(deliveryDate: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Check if route already exists for this date
  const { data: existing } = await supabase
    .from('meal_prep_deliveries')
    .select('id')
    .eq('chef_id', tenantId)
    .eq('delivery_date', deliveryDate)
    .limit(1)

  if (existing && existing.length > 0) {
    return {
      error:
        'A delivery route already exists for this date. Delete existing stops first or pick a different date.',
    }
  }

  // Get the day of week for this date
  const dayOfWeek = getDayOfWeek(deliveryDate)

  // Find all active programs that deliver on this day
  const { data: programs, error: progErr } = await supabase
    .from('meal_prep_programs')
    .select(
      `
      id,
      client_id,
      delivery_address,
      delivery_instructions,
      delivery_window_start,
      delivery_window_end,
      client:clients(id, full_name, address_line1, city, state, zip)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .eq('delivery_day', dayOfWeek)

  if (progErr) {
    return { error: progErr.message }
  }

  if (!programs || programs.length === 0) {
    return { error: 'No active meal prep programs deliver on this day of the week.' }
  }

  // Build delivery entries with address from program or client
  const deliveries = programs.map((p: any) => {
    const address =
      p.delivery_address ||
      [p.client?.address_line1, p.client?.city, p.client?.state, p.client?.zip]
        .filter(Boolean)
        .join(', ') ||
      'Address not set'

    return {
      chef_id: tenantId,
      program_id: p.id,
      client_id: p.client_id,
      delivery_date: deliveryDate,
      delivery_address: address,
      delivery_instructions: p.delivery_instructions,
      meal_count: 0, // chef updates per stop
      container_count: 0,
      delivery_order: 0, // set below
      status: 'scheduled',
      scheduled_time: p.delivery_window_start || null,
    }
  })

  // Sort alphabetically by address for basic route ordering
  deliveries.sort((a: any, b: any) => a.delivery_address.localeCompare(b.delivery_address))
  deliveries.forEach((d: any, i: number) => {
    d.delivery_order = i + 1
  })

  const { error: insertErr } = await supabase.from('meal_prep_deliveries').insert(deliveries)

  if (insertErr) {
    return { error: insertErr.message }
  }

  revalidatePath('/meal-prep/delivery')
  return { success: true, count: deliveries.length }
}

/**
 * Get all deliveries for a specific date, sorted by delivery_order.
 */
export async function getDeliveryRoute(deliveryDate: string): Promise<MealPrepDelivery[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('meal_prep_deliveries')
    .select(
      `
      *,
      client:clients(id, full_name, phone, email),
      program:meal_prep_programs(id, delivery_window_start, delivery_window_end)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('delivery_date', deliveryDate)
    .order('delivery_order', { ascending: true })

  if (error) {
    console.error('[delivery] getRoute error:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Manually reorder delivery stops.
 */
export async function updateDeliveryOrder(deliveries: { id: string; order: number }[]) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  for (const d of deliveries) {
    const { error } = await supabase
      .from('meal_prep_deliveries')
      .update({ delivery_order: d.order })
      .eq('id', d.id)
      .eq('chef_id', tenantId)

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath('/meal-prep/delivery')
  return { success: true }
}

/**
 * Mark a delivery as delivered with optional notes.
 */
export async function markDelivered(deliveryId: string, notes?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updates: Record<string, any> = {
    status: 'delivered',
    actual_delivery_time: new Date().toISOString(),
  }
  if (notes) updates.delivery_notes = notes

  const { error } = await supabase
    .from('meal_prep_deliveries')
    .update(updates)
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/meal-prep/delivery')
  return { success: true }
}

/**
 * Mark a delivery as no answer (client not available).
 */
export async function markNoAnswer(deliveryId: string, notes?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updates: Record<string, any> = {
    status: 'no_answer',
    actual_delivery_time: new Date().toISOString(),
  }
  if (notes) updates.delivery_notes = notes

  const { error } = await supabase
    .from('meal_prep_deliveries')
    .update(updates)
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/meal-prep/delivery')
  return { success: true }
}

/**
 * Start a delivery run: mark all scheduled deliveries for this date as in_transit.
 */
export async function startDeliveryRun(deliveryDate: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('meal_prep_deliveries')
    .update({ status: 'in_transit' })
    .eq('chef_id', user.tenantId!)
    .eq('delivery_date', deliveryDate)
    .eq('status', 'scheduled')

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/meal-prep/delivery')
  return { success: true }
}

/**
 * Get delivery history, optionally filtered by client and date range.
 */
export async function getDeliveryHistory(
  clientId?: string,
  startDate?: string,
  endDate?: string
): Promise<MealPrepDelivery[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('meal_prep_deliveries')
    .select(
      `
      *,
      client:clients(id, full_name, phone, email),
      program:meal_prep_programs(id, delivery_window_start, delivery_window_end)
    `
    )
    .eq('chef_id', user.tenantId!)
    .order('delivery_date', { ascending: false })
    .order('delivery_order', { ascending: true })
    .limit(100)

  if (clientId) query = query.eq('client_id', clientId)
  if (startDate) query = query.gte('delivery_date', startDate)
  if (endDate) query = query.lte('delivery_date', endDate)

  const { data, error } = await query

  if (error) {
    console.error('[delivery] getHistory error:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Send a delivery notification email to the client for this stop.
 */
export async function notifyClientDelivery(deliveryId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get delivery with client and program info
  const { data: delivery, error } = await supabase
    .from('meal_prep_deliveries')
    .select(
      `
      *,
      client:clients(id, full_name, email, phone),
      program:meal_prep_programs(id, delivery_window_start, delivery_window_end)
    `
    )
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !delivery) {
    return { error: 'Delivery not found' }
  }

  const clientEmail = delivery.client?.email
  if (!clientEmail) {
    return { error: 'Client has no email address on file' }
  }

  // Get chef info for branding
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, logo_url, primary_color')
    .eq('id', user.tenantId!)
    .single()

  const timeWindow = delivery.program
    ? `${delivery.program.delivery_window_start} - ${delivery.program.delivery_window_end}`
    : delivery.scheduled_time || 'your scheduled window'

  try {
    const { sendEmail } = await import('@/lib/email/send')
    const { DeliveryNotificationEmail } =
      await import('@/lib/email/templates/delivery-notification')
    const React = await import('react')

    await sendEmail({
      to: clientEmail,
      subject: 'Your meals are on the way!',
      react: React.createElement(DeliveryNotificationEmail, {
        clientName: delivery.client?.full_name || 'there',
        chefName: chef?.business_name || 'Your Chef',
        deliveryWindow: timeWindow,
        mealCount: delivery.meal_count,
        containerCount: delivery.container_count,
        deliveryInstructions: delivery.delivery_instructions,
        brand: {
          businessName: chef?.business_name || undefined,
          logoUrl: chef?.logo_url || null,
          primaryColor: chef?.primary_color || undefined,
        },
      }),
    })
  } catch (err) {
    console.error('[delivery] notification email failed:', err)
    // Non-blocking: email failure should not block delivery operations
  }

  return { success: true }
}

/**
 * Update meal/container counts for a delivery stop.
 */
export async function updateDeliveryCounts(
  deliveryId: string,
  mealCount: number,
  containerCount: number
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('meal_prep_deliveries')
    .update({ meal_count: mealCount, container_count: containerCount })
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/meal-prep/delivery')
  return { success: true }
}
