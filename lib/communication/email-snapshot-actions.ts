'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  EmailVariant,
  ABAssignment,
  EmailSnapshot,
  PortalDeepLink,
  ABVariantStats,
  DiscussedDish,
} from './email-snapshot-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic hash to assign a client to an A/B variant.
 * Uses a simple string hash so the same clientId always gets the same variant.
 * No external dependencies.
 */
function deterministicVariant(clientId: string): EmailVariant {
  let hash = 0
  for (let i = 0; i < clientId.length; i++) {
    const char = clientId.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash) % 2 === 0 ? 'snapshot-heavy' : 'portal-link'
}

function formatSnapshotText(snap: Omit<EmailSnapshot, 'formattedText'>): string {
  const lines: string[] = []
  lines.push('- - -')
  lines.push(`At a Glance: ${snap.eventTitle}`)
  lines.push('')

  if (snap.hostName) lines.push(`Host: ${snap.hostName}`)
  if (snap.guestCount != null) lines.push(`Guests: ${snap.guestCount}`)
  if (snap.occasion) lines.push(`Occasion: ${snap.occasion}`)
  if (snap.eventDate) lines.push(`Date: ${snap.eventDate}`)
  if (snap.location) lines.push(`Location: ${snap.location}`)
  if (snap.dietaryNotes) lines.push(`Dietary: ${snap.dietaryNotes}`)
  if (snap.selectedTier) lines.push(`Course selection: ${snap.selectedTier}`)

  if (snap.discussedDishes.length > 0) {
    lines.push('Dishes discussed:')
    for (const dish of snap.discussedDishes) {
      lines.push(`  - ${dish.name}`)
    }
  }

  lines.push(`Menu confirmed: ${snap.menuConfirmed ? 'Yes' : 'TBD'}`)
  lines.push('')
  lines.push(snap.nextActionCta)

  return lines.join('\n')
}

function computeNextAction(inquiry: Record<string, unknown>): string {
  const date = inquiry.confirmed_date as string | null
  const guestCount = inquiry.confirmed_guest_count as number | null
  const menuConfirmed = inquiry.menu_confirmed as boolean | undefined

  if (!date) return 'Next step: confirm your preferred date.'
  if (!guestCount) return 'Next step: confirm the guest count.'
  if (!menuConfirmed) return 'Next step: review and approve the menu.'
  return 'All set! Looking forward to your dinner.'
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Generate an inline email snapshot for an event/inquiry.
 * Pulls inquiry + event data, computes the rich summary and plain-text block.
 */
export async function generateEmailSnapshot(
  inquiryId: string
): Promise<{ success: true; snapshot: EmailSnapshot } | { success: false; error: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const { data: inquiry, error: iqErr } = await db
      .from('inquiries' as any)
      .select('*')
      .eq('id', inquiryId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (iqErr || !inquiry) {
      return { success: false, error: 'Inquiry not found' }
    }

    // Try to find linked event for menu confirmation status
    let menuConfirmed = false
    if (inquiry.event_id) {
      const { data: evt } = await db
        .from('events' as any)
        .select('menu_id, status')
        .eq('id', inquiry.event_id)
        .eq('tenant_id', user.tenantId!)
        .single()
      if (evt?.menu_id) {
        menuConfirmed = true
      }
    }

    const discussedDishes: DiscussedDish[] = Array.isArray(inquiry.discussed_dishes)
      ? (inquiry.discussed_dishes as string[]).map((name: string) => ({ name }))
      : []

    const contactName = (inquiry.contact_name as string) || 'Client'
    const occasion = (inquiry.confirmed_occasion as string) || null
    const eventTitle = occasion ? `${contactName}'s ${occasion} Dinner` : `${contactName}'s Dinner`

    const dietaryArr = inquiry.confirmed_dietary_restrictions as string[] | null
    const dietaryNotes = dietaryArr && dietaryArr.length > 0 ? dietaryArr.join(', ') : null

    const partial: Omit<EmailSnapshot, 'formattedText'> = {
      eventTitle,
      hostName: contactName,
      guestCount: (inquiry.confirmed_guest_count as number) ?? null,
      occasion,
      eventDate: (inquiry.confirmed_date as string) ?? null,
      location: (inquiry.confirmed_location as string) ?? null,
      dietaryNotes,
      discussedDishes,
      selectedTier: (inquiry.selected_tier as string) ?? null,
      menuConfirmed,
      nextActionCta: computeNextAction({ ...inquiry, menu_confirmed: menuConfirmed }),
    }

    const snapshot: EmailSnapshot = {
      ...partial,
      formattedText: formatSnapshotText(partial),
    }

    return { success: true, snapshot }
  } catch (err) {
    console.error('[generateEmailSnapshot] Error:', err)
    return { success: false, error: 'Failed to generate email snapshot' }
  }
}

/**
 * Generate a portal deep link with UTM tracking params.
 * No external API calls; constructs the URL from known portal base.
 */
export async function generatePortalDeepLink(params: {
  circlePath: string
  source?: string
  medium?: string
  campaign?: string
  content?: string
}): Promise<PortalDeepLink> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'
  const basePath = params.circlePath.startsWith('/') ? params.circlePath : `/${params.circlePath}`

  const utmSource = params.source || 'chef_email'
  const utmMedium = params.medium || 'email'
  const utmCampaign = params.campaign || 'dinner_snapshot'
  const utmContent = params.content || 'portal_link'

  const searchParams = new URLSearchParams({
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
  })

  const url = `${baseUrl}${basePath}?${searchParams.toString()}`

  return {
    url,
    basePath,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
  }
}

/**
 * Assign a client to an A/B email variant using deterministic hash.
 * Idempotent: if an assignment already exists, returns it unchanged.
 */
export async function assignABVariant(
  clientId: string
): Promise<{ success: true; assignment: ABAssignment } | { success: false; error: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    // Check for existing assignment (idempotent)
    const { data: existing } = await db
      .from('email_ab_assignments' as any)
      .select('*')
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (existing) {
      return {
        success: true,
        assignment: mapRowToAssignment(existing),
      }
    }

    const variant = deterministicVariant(clientId)

    const { data: inserted, error: insertErr } = await db
      .from('email_ab_assignments' as any)
      .insert({
        client_id: clientId,
        tenant_id: user.tenantId!,
        variant,
        assigned_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (insertErr || !inserted) {
      return { success: false, error: 'Failed to assign A/B variant' }
    }

    return {
      success: true,
      assignment: mapRowToAssignment(inserted),
    }
  } catch (err) {
    console.error('[assignABVariant] Error:', err)
    return { success: false, error: 'Failed to assign A/B variant' }
  }
}

/**
 * Retrieve the existing A/B assignment for a client.
 * Returns null if no assignment exists yet.
 */
export async function getABAssignment(clientId: string): Promise<ABAssignment | null> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('email_ab_assignments' as any)
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) return null
  return mapRowToAssignment(data)
}

/**
 * Aggregate click-through rates by variant for the current tenant.
 */
export async function getABStats(): Promise<ABVariantStats[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('email_ab_assignments' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (error || !data || data.length === 0) {
    return [
      {
        variant: 'snapshot-heavy',
        assignmentCount: 0,
        totalEmails: 0,
        totalClicks: 0,
        clickThroughRate: 0,
      },
      {
        variant: 'portal-link',
        assignmentCount: 0,
        totalEmails: 0,
        totalClicks: 0,
        clickThroughRate: 0,
      },
    ]
  }

  const rows = data as Array<Record<string, unknown>>
  const buckets: Record<EmailVariant, { count: number; emails: number; clicks: number }> = {
    'snapshot-heavy': { count: 0, emails: 0, clicks: 0 },
    'portal-link': { count: 0, emails: 0, clicks: 0 },
  }

  for (const row of rows) {
    const v = row.variant as EmailVariant
    if (!buckets[v]) continue
    buckets[v].count += 1
    buckets[v].emails += row.last_email_at ? 1 : 0
    buckets[v].clicks += (row.click_count as number) || 0
  }

  return (['snapshot-heavy', 'portal-link'] as EmailVariant[]).map((variant) => {
    const b = buckets[variant]
    return {
      variant,
      assignmentCount: b.count,
      totalEmails: b.emails,
      totalClicks: b.clicks,
      clickThroughRate: b.emails > 0 ? b.clicks / b.emails : 0,
    }
  })
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapRowToAssignment(row: Record<string, unknown>): ABAssignment {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    tenantId: row.tenant_id as string,
    variant: row.variant as EmailVariant,
    assignedAt: row.assigned_at as string,
    lastEmailAt: (row.last_email_at as string) ?? null,
    clickCount: (row.click_count as number) ?? 0,
  }
}
