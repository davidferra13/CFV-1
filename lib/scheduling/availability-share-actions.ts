'use server'

// Availability Share Token Actions
// Lets chefs generate a shareable URL that shows their open dates - without
// exposing client names, financials, or any private data.
// Uses chef_availability_share_tokens table (migration 20260322000023).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type ShareToken = {
  id: string
  token: string
  is_active: boolean
  created_at: string
  expires_at: string | null
}

export type AvailabilityDay = {
  date: string // YYYY-MM-DD
  available: boolean // true = open, false = has event or protected block
}

// ─── Generate a new share token ───────────────────────────────────────────────

export async function generateShareToken(
  label?: string
): Promise<{ success: boolean; token?: string }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Generate a 32-char hex token server-side using Node crypto
  const { randomBytes } = await import('crypto')
  const token = randomBytes(16).toString('hex')

  const { data, error } = await db
    .from('chef_availability_share_tokens' as any)
    .insert({
      tenant_id: chef.tenantId!,
      token,
      is_active: true,
      ...(label ? { label } : {}),
    })
    .select('token')
    .single()

  if (error) {
    console.error('[generateShareToken] Error:', error)
    throw new Error('Failed to generate share token')
  }

  revalidatePath('/calendar/share')
  return { success: true, token: (data as any)?.token }
}

// ─── Revoke a token ───────────────────────────────────────────────────────────

export async function revokeShareToken(id: string): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_availability_share_tokens' as any)
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', chef.tenantId!)

  if (error) {
    console.error('[revokeShareToken] Error:', error)
    throw new Error('Failed to revoke share token')
  }

  revalidatePath('/calendar/share')
  return { success: true }
}

// ─── List active tokens ───────────────────────────────────────────────────────

export async function getShareTokens(): Promise<ShareToken[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_availability_share_tokens' as any)
    .select('id, token, is_active, created_at, expires_at')
    .eq('tenant_id', chef.tenantId!)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getShareTokens] Error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    token: row.token,
    is_active: row.is_active,
    created_at: row.created_at,
    expires_at: row.expires_at ?? null,
  }))
}

// ─── Public: Get shared availability (no auth required) ──────────────────────

/**
 * Validates a share token and returns availability for the next 60 days.
 * This function is intentionally public - no requireChef() - because it is
 * called from a public page viewed by potential clients.
 *
 * Only exposes: date + available boolean. No client names or financial data.
 */
export async function getSharedAvailability(token: string): Promise<{
  valid: boolean
  days: AvailabilityDay[]
  chefDisplayName?: string
}> {
  // Use admin client to bypass RLS for token validation (public read)
  const db: any = createServerClient({ admin: true })

  // Validate token
  const { data: tokenRow, error: tokenError } = await db
    .from('chef_availability_share_tokens' as any)
    .select('id, tenant_id, is_active, expires_at')
    .eq('token', token)
    .single()

  if (tokenError || !tokenRow) {
    return { valid: false, days: [] }
  }

  const row = tokenRow as any

  if (!row.is_active) {
    return { valid: false, days: [] }
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { valid: false, days: [] }
  }

  const tenantId: string = row.tenant_id

  // Build the next 60-day window
  const today = new Date()
  const dates: string[] = []
  for (let i = 0; i < 60; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }

  const windowStart = dates[0]
  const windowEnd = dates[dates.length - 1]

  // Fetch event dates in the window (non-cancelled)
  const { data: events } = await db
    .from('events')
    .select('event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', windowStart)
    .lte('event_date', windowEnd + 'T23:59:59')
    .not('status', 'in', '("cancelled","draft")')

  // Fetch protected blocks in the window
  const { data: protectedBlocks } = await db
    .from('event_prep_blocks' as any)
    .select('block_date')
    .eq('chef_id', tenantId)
    .in('block_type', ['protected_personal', 'rest'])
    .gte('block_date', windowStart)
    .lte('block_date', windowEnd)

  // Build a set of unavailable dates
  const unavailable = new Set<string>()

  for (const ev of events ?? []) {
    const d = ((ev as any).event_date as string).slice(0, 10)
    unavailable.add(d)
  }

  for (const block of protectedBlocks ?? []) {
    const d = (block as any).block_date as string
    unavailable.add(d)
  }

  // Get chef display name (first_name only - no last name for privacy)
  const { data: chefRow } = await db.from('chefs').select('first_name').eq('id', tenantId).single()

  const days: AvailabilityDay[] = dates.map((date) => ({
    date,
    available: !unavailable.has(date),
  }))

  return {
    valid: true,
    days,
    chefDisplayName: (chefRow as any)?.first_name ?? undefined,
  }
}
