'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

// ── Types ──────────────────────────────────────────────────────────────────

export type TestimonialRow = {
  id: string
  tenant_id: string
  client_id: string | null
  event_id: string | null
  client_name: string
  rating: number | null
  content: string
  is_approved: boolean
  is_featured: boolean
  is_public: boolean
  request_token: string | null
  request_sent_at: string | null
  submitted_at: string | null
  display_name: string | null
  event_type: string | null
  created_at: string
}

export type TestimonialFilters = {
  approved?: boolean
  featured?: boolean
  eventId?: string
}

export type TestimonialStats = {
  total: number
  approved: number
  pending: number
  featured: number
  averageRating: number | null
  approvalRate: number
}

// ── Chef Actions (auth required) ──────────────────────────────────────────

/**
 * Generate a review request for a specific event.
 * Creates a testimonial row with a unique token and returns the review URL.
 */
export async function requestTestimonial(eventId: string): Promise<{
  token: string
  url: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Look up event + client info
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, occasion, client_id, clients(full_name)')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  const token = crypto.randomUUID()
  const clientName = (event.clients as any)?.full_name ?? 'Guest'

  const { error } = await db.from('testimonials' as any).insert({
    tenant_id: tenantId,
    client_id: event.client_id,
    event_id: eventId,
    client_name: clientName,
    content: '',
    request_token: token,
    request_sent_at: new Date().toISOString(),
    event_type: event.occasion ?? null,
  })

  if (error) {
    console.error('[requestTestimonial] Insert error:', error)
    throw new Error('Failed to create review request')
  }

  revalidatePath('/testimonials')

  return {
    token,
    url: `/review/${token}`,
  }
}

/**
 * Get testimonials with optional filters. Chef only.
 */
export async function getTestimonials(filters?: TestimonialFilters): Promise<TestimonialRow[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('testimonials' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.approved !== undefined) {
    query = query.eq('is_approved', filters.approved)
  }

  if (filters?.featured !== undefined) {
    query = query.eq('is_featured', filters.featured)
  }

  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getTestimonials] Error:', error)
    return []
  }

  return (data ?? []) as TestimonialRow[]
}

/**
 * Approve a testimonial. Chef only.
 */
export async function approveTestimonial(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('testimonials' as any)
    .update({ is_approved: true })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[approveTestimonial] Error:', error)
    throw new Error('Failed to approve testimonial')
  }

  revalidatePath('/testimonials')
}

/**
 * Toggle featured status on a testimonial. Chef only.
 */
export async function featureTestimonial(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch current state to toggle
  const { data: current, error: fetchError } = await db
    .from('testimonials' as any)
    .select('is_featured')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !current) {
    throw new Error('Testimonial not found')
  }

  const { error } = await db
    .from('testimonials' as any)
    .update({ is_featured: !(current as any).is_featured })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[featureTestimonial] Error:', error)
    throw new Error('Failed to update testimonial')
  }

  revalidatePath('/testimonials')
}

/**
 * Delete a testimonial. Chef only.
 */
export async function deleteTestimonial(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('testimonials' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteTestimonial] Error:', error)
    throw new Error('Failed to delete testimonial')
  }

  revalidatePath('/testimonials')
}

/**
 * Get public testimonials for a chef (no auth needed).
 * Used for chef website / public profile display.
 */
export async function getPublicTestimonials(chefId: string): Promise<
  {
    id: string
    display_name: string | null
    client_name: string
    rating: number | null
    content: string
    event_type: string | null
    is_featured: boolean
    submitted_at: string | null
  }[]
> {
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('testimonials' as any)
    .select('id, display_name, client_name, rating, content, event_type, is_featured, submitted_at')
    .eq('tenant_id', chefId)
    .eq('is_approved', true)
    .eq('is_public', true)
    .not('submitted_at', 'is', null)
    .order('is_featured', { ascending: false })
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('[getPublicTestimonials] Error:', error)
    return []
  }

  return (data ?? []) as any[]
}

/**
 * Get stats for the testimonial dashboard. Chef only.
 */
export async function getTestimonialStats(): Promise<TestimonialStats> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('testimonials' as any)
    .select('id, rating, is_approved, is_featured, submitted_at')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getTestimonialStats] Error:', error)
    return {
      total: 0,
      approved: 0,
      pending: 0,
      featured: 0,
      averageRating: null,
      approvalRate: 0,
    }
  }

  const rows = (data ?? []) as any[]
  const submitted = rows.filter((r: any) => r.submitted_at !== null)
  const approved = submitted.filter((r: any) => r.is_approved)
  const featured = submitted.filter((r: any) => r.is_featured)
  const rated = submitted.filter((r: any) => r.rating !== null)

  const avgRating =
    rated.length > 0
      ? Math.round((rated.reduce((sum: number, r: any) => sum + r.rating, 0) / rated.length) * 10) /
        10
      : null

  return {
    total: submitted.length,
    approved: approved.length,
    pending: submitted.length - approved.length,
    featured: featured.length,
    averageRating: avgRating,
    approvalRate: submitted.length > 0 ? Math.round((approved.length / submitted.length) * 100) : 0,
  }
}
