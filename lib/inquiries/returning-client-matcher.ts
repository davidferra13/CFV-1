'use server'

import { createServerClient } from '@/lib/db/server'
import { normalizePhone, namesMatch } from '@/lib/utils/name-matching'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ReturningClientMatchType = 'email' | 'phone' | 'name_address'

export type ReturningClientMatch = {
  clientId: string
  clientName: string
  matchType: ReturningClientMatchType
  confidence: 'confirmed' | 'likely' | 'possible'
  previousEvents: number
  lastEventDate: string | null
  totalSpentCents: number
  isLapsed: boolean
  lapsedMonths: number | null
}

type InquirySignals = {
  email?: string | null
  phone?: string | null
  name?: string | null
  address?: string | null
}

// ─── Matcher ────────────────────────────────────────────────────────────────

/**
 * Match a new inquiry's contact info against existing clients for this tenant.
 * Returns the best match (highest confidence), or null if no match.
 *
 * Priority order:
 *   1. Exact email match (confirmed)
 *   2. Exact phone match after normalization (confirmed)
 *   3. Fuzzy name + city/zip overlap (likely)
 */
export async function matchReturningClient(
  tenantId: string,
  inquiry: InquirySignals
): Promise<ReturningClientMatch | null> {
  const db: any = createServerClient()

  // Fetch all active clients for this tenant (with event stats)
  const { data: clients, error } = await db
    .from('clients')
    .select('id, full_name, email, phone, address, last_event_date, total_events_completed, lifetime_value_cents')
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .order('total_events_completed', { ascending: false })
    .limit(2000)

  if (error || !clients || clients.length === 0) return null

  const inquiryEmail = (inquiry.email || '').toLowerCase().trim()
  const inquiryPhone = inquiry.phone ? normalizePhone(inquiry.phone) : null
  const inquiryName = (inquiry.name || '').trim()
  const inquiryAddress = (inquiry.address || '').toLowerCase().trim()

  // ── 1. Exact email match ──────────────────────────────────────────────

  if (inquiryEmail) {
    const emailMatch = clients.find(
      (c: any) => c.email && c.email.toLowerCase().trim() === inquiryEmail
    )
    if (emailMatch && (emailMatch.total_events_completed ?? 0) > 0) {
      return buildMatch(emailMatch, 'email', 'confirmed')
    }
  }

  // ── 2. Exact phone match (normalized) ─────────────────────────────────

  if (inquiryPhone) {
    const phoneMatch = clients.find((c: any) => {
      if (!c.phone) return false
      const normalized = normalizePhone(c.phone)
      return normalized && normalized === inquiryPhone
    })
    if (phoneMatch && (phoneMatch.total_events_completed ?? 0) > 0) {
      return buildMatch(phoneMatch, 'phone', 'confirmed')
    }
  }

  // ── 3. Fuzzy name + address (same last name + same city or zip) ───────

  if (inquiryName && inquiryAddress) {
    const inquiryCity = extractCity(inquiryAddress)
    const inquiryZip = extractZip(inquiryAddress)
    const inquiryLastName = extractLastName(inquiryName)

    if (inquiryLastName && (inquiryCity || inquiryZip)) {
      for (const client of clients) {
        if ((client.total_events_completed ?? 0) === 0) continue
        if (!client.full_name || !client.address) continue

        const clientLastName = extractLastName(client.full_name)
        if (!clientLastName) continue

        // Same last name (case-insensitive)
        if (clientLastName.toLowerCase() !== inquiryLastName.toLowerCase()) continue

        const clientCity = extractCity((client.address || '').toLowerCase())
        const clientZip = extractZip(client.address || '')

        const cityMatch = inquiryCity && clientCity && inquiryCity === clientCity
        const zipMatch = inquiryZip && clientZip && inquiryZip === clientZip

        if (cityMatch || zipMatch) {
          return buildMatch(client, 'name_address', 'likely')
        }
      }
    }
  }

  return null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildMatch(
  client: any,
  matchType: ReturningClientMatchType,
  confidence: 'confirmed' | 'likely' | 'possible'
): ReturningClientMatch {
  const lastEventDate: string | null = client.last_event_date ?? null
  const lapsedInfo = computeLapsed(lastEventDate)

  return {
    clientId: client.id,
    clientName: client.full_name || '',
    matchType,
    confidence,
    previousEvents: client.total_events_completed ?? 0,
    lastEventDate,
    totalSpentCents: client.lifetime_value_cents ?? 0,
    isLapsed: lapsedInfo.isLapsed,
    lapsedMonths: lapsedInfo.months,
  }
}

function computeLapsed(lastEventDate: string | null): { isLapsed: boolean; months: number | null } {
  if (!lastEventDate) return { isLapsed: false, months: null }

  const last = new Date(lastEventDate)
  const now = new Date()
  const diffMs = now.getTime() - last.getTime()
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))

  return {
    isLapsed: months >= 12,
    months,
  }
}

/**
 * Extract last name from a full name string.
 * "Margaret Smith" -> "Smith"
 * "Dr. Margaret Elena Smith" -> "Smith"
 */
function extractLastName(name: string): string | null {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  return parts[parts.length - 1]
}

/**
 * Extract city from an address string (best-effort).
 * Looks for a city-like segment before a state abbreviation or zip.
 * "123 Main St, Boston, MA 02101" -> "boston"
 */
function extractCity(address: string): string | null {
  const lower = address.toLowerCase().trim()
  // Try comma-separated parts: second-to-last part before state/zip
  const parts = lower.split(',').map((p) => p.trim())
  if (parts.length >= 2) {
    // The city is often the second-to-last comma segment
    const candidate = parts[parts.length - 2] || parts[parts.length - 1]
    // Strip numbers (street addresses)
    const cleaned = candidate.replace(/^\d+\s+/, '').trim()
    if (cleaned.length > 1) return cleaned
  }
  return null
}

/**
 * Extract zip code from an address string.
 * Matches 5-digit or 5+4 zip codes.
 */
function extractZip(address: string): string | null {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/)
  return match ? match[1] : null
}
