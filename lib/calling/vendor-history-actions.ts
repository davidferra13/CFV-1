'use server'

/**
 * Vendor Call History Server Actions
 *
 * Provides per-vendor call history and metrics by querying both
 * supplier_calls and ai_calls tables and merging results.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---- Types ----------------------------------------------------------------

export interface VendorCallRecord {
  id: string
  date: string
  ingredient: string
  result: 'available' | 'unavailable' | 'voicemail' | 'no_answer'
  price?: number
  unit?: string
  duration?: number
  transcript?: string
}

export interface VendorCallMetrics {
  answerRate: number
  avgResponseTime: number
  totalCalls: number
  lastCallDate: string | null
}

// ---- Helpers --------------------------------------------------------------

function mapSupplierResult(
  status: string,
  result: string | null
): 'available' | 'unavailable' | 'voicemail' | 'no_answer' {
  if (status === 'completed' && result === 'yes') return 'available'
  if (status === 'completed' && result === 'no') return 'unavailable'
  if (status === 'voicemail') return 'voicemail'
  if (status === 'no_answer' || status === 'busy') return 'no_answer'
  if (status === 'completed') return 'unavailable'
  return 'no_answer'
}

function mapAiCallResult(
  status: string,
  result: string | null
): 'available' | 'unavailable' | 'voicemail' | 'no_answer' {
  if (status === 'voicemail') return 'voicemail'
  if (status === 'no_answer' || status === 'busy') return 'no_answer'
  if (status === 'completed' && result === 'yes') return 'available'
  if (status === 'completed' && result === 'no') return 'unavailable'
  if (status === 'completed') return 'available'
  return 'no_answer'
}

function parsePrice(quoted: string | null): number | undefined {
  if (!quoted) return undefined
  const cleaned = quoted.replace(/[^0-9.]/g, '')
  const val = parseFloat(cleaned)
  return isNaN(val) ? undefined : val
}

function parseUnit(quoted: string | null): string | undefined {
  if (!quoted) return undefined
  // Try to extract unit from strings like "$4.99/lb" or "4.99 per pound"
  const match = quoted.match(/\/(\w+)|per\s+(\w+)/i)
  return match ? match[1] || match[2] : undefined
}

// ---- Actions --------------------------------------------------------------

/**
 * Get call history for a specific vendor by phone number.
 * Merges supplier_calls and ai_calls, sorted newest first.
 */
export async function getVendorCallHistory(
  vendorPhone: string,
  limit = 50
): Promise<VendorCallRecord[]> {
  if (!vendorPhone) throw new Error('Missing vendorPhone')

  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch supplier calls for this vendor phone
  const { data: supplierData, error: supplierErr } = await db
    .from('supplier_calls')
    .select(
      'id, vendor_phone, ingredient_name, status, result, price_quoted, duration_seconds, speech_transcript, created_at'
    )
    .eq('chef_id', user.tenantId!)
    .eq('vendor_phone', vendorPhone)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (supplierErr) {
    console.error('[vendor-history] supplier_calls query failed:', supplierErr)
    throw new Error('Failed to load vendor call history')
  }

  // Fetch ai_calls for this vendor phone
  const { data: aiData, error: aiErr } = await db
    .from('ai_calls')
    .select(
      'id, contact_phone, subject, status, result, duration_seconds, full_transcript, created_at'
    )
    .eq('chef_id', user.tenantId!)
    .eq('contact_phone', vendorPhone)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (aiErr) {
    console.error('[vendor-history] ai_calls query failed:', aiErr)
    throw new Error('Failed to load vendor call history')
  }

  const supplierRecords: VendorCallRecord[] = (supplierData ?? []).map((row: any) => ({
    id: `s-${row.id}`,
    date: row.created_at,
    ingredient: row.ingredient_name || 'General',
    result: mapSupplierResult(row.status, row.result),
    price: parsePrice(row.price_quoted),
    unit: parseUnit(row.price_quoted),
    duration: row.duration_seconds ?? undefined,
    transcript: row.speech_transcript ?? undefined,
  }))

  const aiRecords: VendorCallRecord[] = (aiData ?? []).map((row: any) => ({
    id: `a-${row.id}`,
    date: row.created_at,
    ingredient: row.subject || 'General',
    result: mapAiCallResult(row.status, row.result),
    duration: row.duration_seconds ?? undefined,
    transcript: row.full_transcript ?? undefined,
  }))

  // Merge and sort newest first, then limit
  return [...supplierRecords, ...aiRecords]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}

/**
 * Get aggregated metrics for a specific vendor phone number.
 */
export async function getVendorCallMetricsSummary(
  vendorPhone: string
): Promise<VendorCallMetrics | null> {
  if (!vendorPhone) return null

  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch all supplier calls for metrics
  const { data: supplierData } = await db
    .from('supplier_calls')
    .select('status, result, duration_seconds, created_at')
    .eq('chef_id', user.tenantId!)
    .eq('vendor_phone', vendorPhone)
    .order('created_at', { ascending: false })

  // Fetch all ai_calls for metrics
  const { data: aiData } = await db
    .from('ai_calls')
    .select('status, result, duration_seconds, created_at')
    .eq('chef_id', user.tenantId!)
    .eq('contact_phone', vendorPhone)
    .order('created_at', { ascending: false })

  const allCalls = [
    ...(supplierData ?? []).map((r: any) => ({
      answered: r.status === 'completed',
      duration: r.duration_seconds,
      date: r.created_at,
    })),
    ...(aiData ?? []).map((r: any) => ({
      answered: r.status === 'completed',
      duration: r.duration_seconds,
      date: r.created_at,
    })),
  ]

  if (allCalls.length === 0) return null

  const totalCalls = allCalls.length
  const answeredCalls = allCalls.filter((c) => c.answered)
  const answerRate = Math.round((answeredCalls.length / totalCalls) * 100)

  // Average response time (duration) for answered calls
  const durations = answeredCalls
    .map((c) => c.duration)
    .filter((d): d is number => d != null && d > 0)
  const avgResponseTime =
    durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : 0

  // Sort all by date descending to find the latest
  allCalls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const lastCallDate = allCalls[0]?.date ?? null

  return { answerRate, avgResponseTime, totalCalls, lastCallDate }
}
