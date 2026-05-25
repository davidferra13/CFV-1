'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface TacRailInquiry {
  id: string
  clientName: string
  status: string
  createdAt: string
  lastResponseAt: string | null
  guestCount: number | null
  eventDate: string | null
  location: string | null
  occasion: string | null
  dietaryRestrictions: string | null
  externalLink: string | null
  accountEmail: string | null
  hoursWaiting: number
  urgency: 'critical' | 'high' | 'normal'
}

export interface TacRailData {
  inquiries: TacRailInquiry[]
  totalActive: number
  avgResponseHours: number | null
  oldestUnrespondedHours: number | null
}

function computeHoursWaiting(lastResponseAt: string | null, createdAt: string): number {
  const reference = lastResponseAt ?? createdAt
  const diffMs = Date.now() - new Date(reference).getTime()
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60)))
}

function computeUrgency(hours: number): 'critical' | 'high' | 'normal' {
  if (hours > 48) return 'critical'
  if (hours > 24) return 'high'
  return 'normal'
}

export async function getTakeAChefRailData(): Promise<TacRailData> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    const { data: inquiries, error } = await db
      .from('inquiries')
      .select(
        'id, contact_name, status, created_at, last_response_at, confirmed_guest_count, confirmed_date, confirmed_location, confirmed_occasion, confirmed_dietary_restrictions, external_link, contact_email'
      )
      .eq('tenant_id', user.tenantId!)
      .eq('channel', 'take_a_chef')
      .not('status', 'in', '(confirmed,declined,expired,archived)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getTakeAChefRailData] Query error:', error)
      throw new Error('Failed to fetch Take a Chef inquiries')
    }

    const rows = inquiries ?? []

    const mapped: TacRailInquiry[] = rows.map((row: any) => {
      const hoursWaiting = computeHoursWaiting(row.last_response_at, row.created_at)
      return {
        id: row.id,
        clientName: row.contact_name || 'Unknown',
        status: row.status,
        createdAt: row.created_at,
        lastResponseAt: row.last_response_at ?? null,
        guestCount: row.confirmed_guest_count ?? null,
        eventDate: row.confirmed_date ?? null,
        location: row.confirmed_location ?? null,
        occasion: row.confirmed_occasion ?? null,
        dietaryRestrictions: row.confirmed_dietary_restrictions
          ? Array.isArray(row.confirmed_dietary_restrictions)
            ? row.confirmed_dietary_restrictions.join(', ')
            : row.confirmed_dietary_restrictions
          : null,
        externalLink: row.external_link ?? null,
        accountEmail: row.contact_email ?? null,
        hoursWaiting,
        urgency: computeUrgency(hoursWaiting),
      }
    })

    const waitingHours = mapped.map((i) => i.hoursWaiting)
    const avgResponseHours =
      waitingHours.length > 0
        ? Math.round(waitingHours.reduce((sum, h) => sum + h, 0) / waitingHours.length)
        : null
    const oldestUnrespondedHours = waitingHours.length > 0 ? Math.max(...waitingHours) : null

    return {
      inquiries: mapped,
      totalActive: mapped.length,
      avgResponseHours,
      oldestUnrespondedHours,
    }
  } catch (err) {
    console.error('[getTakeAChefRailData] Error:', err)
    throw err
  }
}
