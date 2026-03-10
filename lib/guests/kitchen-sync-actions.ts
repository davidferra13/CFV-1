'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type AlertLevel = 'critical' | 'warning' | 'info' | 'note' | 'caution'

export type KitchenAlert = {
  level: AlertLevel
  label: string
  detail: string
}

export type GuestKitchenAlerts = {
  guestId: string
  guestName: string
  alerts: KitchenAlert[]
  compactAlert: string
}

export type GuestServiceNotes = {
  guestId: string
  guestName: string
  notes: string[]
  favoriteTable: string | null
  birthdayUpcoming: boolean
  pendingComps: number
  totalVisits: number
  avgSpendCents: number
  lastVisit: string | null
}

// ============================================
// ALLERGY/VIP TAG KEYWORDS
// ============================================

const ALLERGY_TAGS = [
  'allergy',
  'allergic',
  'peanut',
  'shellfish',
  'tree nut',
  'dairy',
  'gluten',
  'soy',
  'egg',
  'fish',
  'wheat',
  'sesame',
  'lactose',
  'celiac',
]

const DIETARY_TAGS = [
  'vegetarian',
  'vegan',
  'keto',
  'halal',
  'kosher',
  'pescatarian',
  'paleo',
  'dairy-free',
  'gluten-free',
  'sugar-free',
  'low-sodium',
]

const VIP_TAGS = ['vip', 'regular', 'frequent']

const CAUTION_TAGS = ['problem', 'complaint', 'difficult', 'comp owed']

function classifyTag(tag: string): AlertLevel | null {
  const lower = tag.toLowerCase()
  if (ALLERGY_TAGS.some((a) => lower.includes(a))) return 'critical'
  if (DIETARY_TAGS.some((d) => lower.includes(d))) return 'warning'
  if (VIP_TAGS.some((v) => lower.includes(v))) return 'info'
  if (CAUTION_TAGS.some((c) => lower.includes(c))) return 'caution'
  return 'note'
}

function levelLabel(level: AlertLevel): string {
  switch (level) {
    case 'critical':
      return 'ALLERGY'
    case 'warning':
      return 'DIETARY'
    case 'info':
      return 'VIP'
    case 'caution':
      return 'CAUTION'
    case 'note':
      return 'NOTE'
  }
}

// ============================================
// GET GUEST KITCHEN ALERTS
// ============================================

/**
 * Returns structured kitchen alerts for a guest:
 * allergies (CRITICAL), dietary restrictions (WARNING),
 * VIP status (INFO), preferences (NOTE), past complaints (CAUTION).
 */
export async function getGuestKitchenAlerts(guestId: string): Promise<GuestKitchenAlerts> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [guestRes, tagsRes] = await Promise.all([
    supabase
      .from('guests')
      .select('id, name, notes')
      .eq('id', guestId)
      .eq('chef_id', user.tenantId!)
      .single(),
    supabase
      .from('guest_tags')
      .select('tag, color')
      .eq('guest_id', guestId)
      .eq('chef_id', user.tenantId!),
  ])

  if (guestRes.error || !guestRes.data) {
    throw new Error('Guest not found')
  }

  const guest = guestRes.data as any
  const tags = (tagsRes.data ?? []) as Array<{ tag: string; color: string | null }>

  const alerts: KitchenAlert[] = []

  // Classify each tag into an alert level
  for (const t of tags) {
    const level = classifyTag(t.tag)
    if (level) {
      alerts.push({
        level,
        label: levelLabel(level),
        detail: t.tag,
      })
    }
  }

  // Parse notes for allergy/preference mentions
  if (guest.notes) {
    const notesLower = guest.notes.toLowerCase()
    if (notesLower.includes('allerg')) {
      alerts.push({ level: 'critical', label: 'ALLERGY', detail: `Notes: ${guest.notes}` })
    } else if (
      notesLower.includes('prefer') ||
      notesLower.includes('dislike') ||
      notesLower.includes('no ')
    ) {
      alerts.push({ level: 'note', label: 'NOTE', detail: `Notes: ${guest.notes}` })
    }
  }

  // Sort by severity: critical first, then warning, info, caution, note
  const levelOrder: Record<AlertLevel, number> = {
    critical: 0,
    warning: 1,
    caution: 2,
    info: 3,
    note: 4,
  }
  alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level])

  // Build compact alert string
  const compactParts: string[] = []
  const allergies = alerts.filter((a) => a.level === 'critical').map((a) => a.detail)
  if (allergies.length > 0) {
    compactParts.push(`ALLERGY: ${allergies.join(', ')}`)
  }
  const isVip = alerts.some((a) => a.level === 'info' && a.detail.toLowerCase().includes('vip'))
  if (isVip) {
    compactParts.push('VIP Guest')
  }
  const dietary = alerts.filter((a) => a.level === 'warning').map((a) => a.detail)
  if (dietary.length > 0) {
    compactParts.push(`Dietary: ${dietary.join(', ')}`)
  }

  return {
    guestId: guest.id,
    guestName: guest.name,
    alerts,
    compactAlert: compactParts.join(' | '),
  }
}

// ============================================
// FORMAT ALLERGY ALERT FOR TICKET
// ============================================

/**
 * Returns a compact string for the KDS ticket allergy_alert field.
 * Example: "ALLERGY: Peanuts, Shellfish | VIP Guest"
 */
export async function formatAllergyAlertForTicket(guestId: string): Promise<string> {
  const result = await getGuestKitchenAlerts(guestId)
  return result.compactAlert
}

// ============================================
// GET GUEST SERVICE NOTES (FOH)
// ============================================

/**
 * Returns notes relevant for front-of-house: favorite table, birthday,
 * pending comps, visit history, average spend.
 */
export async function getGuestServiceNotes(guestId: string): Promise<GuestServiceNotes> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [guestRes, compsRes, visitsRes] = await Promise.all([
    supabase
      .from('guests')
      .select('id, name, notes, phone, email')
      .eq('id', guestId)
      .eq('chef_id', user.tenantId!)
      .single(),
    supabase
      .from('guest_comps')
      .select('id, description, redeemed_at')
      .eq('guest_id', guestId)
      .eq('chef_id', user.tenantId!)
      .is('redeemed_at', null),
    supabase
      .from('guest_visits')
      .select('visit_date, spend_cents, notes')
      .eq('guest_id', guestId)
      .eq('chef_id', user.tenantId!)
      .order('visit_date', { ascending: false })
      .limit(50),
  ])

  if (guestRes.error || !guestRes.data) {
    throw new Error('Guest not found')
  }

  const guest = guestRes.data as any
  const visits = (visitsRes.data ?? []) as any[]
  const comps = (compsRes.data ?? []) as any[]

  const totalVisits = visits.length
  const totalSpend = visits.reduce((sum: number, v: any) => sum + (v.spend_cents || 0), 0)
  const avgSpendCents = totalVisits > 0 ? Math.round(totalSpend / totalVisits) : 0
  const lastVisit = visits.length > 0 ? visits[0].visit_date : null

  // Extract service-relevant notes
  const serviceNotes: string[] = []
  if (guest.notes) {
    serviceNotes.push(guest.notes)
  }

  // Check for a favorite table mention in notes
  let favoriteTable: string | null = null
  if (guest.notes) {
    const tableMatch = guest.notes.match(/table\s*#?\s*(\w+)/i)
    if (tableMatch) {
      favoriteTable = tableMatch[1]
    }
  }

  // Pending comp descriptions
  for (const comp of comps) {
    if (comp.description) {
      serviceNotes.push(`Pending comp: ${comp.description}`)
    }
  }

  return {
    guestId: guest.id,
    guestName: guest.name,
    notes: serviceNotes,
    favoriteTable,
    birthdayUpcoming: false, // Guests table doesn't have a birthday field yet
    pendingComps: comps.length,
    totalVisits,
    avgSpendCents,
    lastVisit,
  }
}

// ============================================
// SYNC GUEST TO CHECK
// ============================================

/**
 * When a guest is linked to a dining check, generate their allergy alert
 * string so it can be attached to all future KDS tickets from that check.
 * Returns the compact alert string to be stored on the check or passed
 * to ticket creation.
 */
export async function syncGuestToCheck(
  checkId: string,
  guestId: string
): Promise<{ allergyAlert: string; guestName: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get the alert string
  const alerts = await getGuestKitchenAlerts(guestId)

  // Update the check with guest info (guest_name is already on dining_checks)
  const { error } = await (supabase
    .from('dining_checks' as any)
    .update({
      guest_name: alerts.guestName,
      notes: alerts.compactAlert || null,
    } as any)
    .eq('id', checkId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) {
    console.error('[kitchen-sync] syncGuestToCheck error:', error)
    throw new Error('Failed to sync guest to check')
  }

  revalidatePath('/commerce/table-service')
  revalidatePath('/commerce/kds')

  return {
    allergyAlert: alerts.compactAlert,
    guestName: alerts.guestName,
  }
}
