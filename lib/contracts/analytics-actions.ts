// Contract Analytics - Server Actions
// Provides aggregate metrics for the contracts dashboard.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type ContractAnalytics = {
  total: number
  signed: number
  pending: number
  voided: number
  draft: number
  avgDaysToSign: number | null
  acceptanceRate: number | null
  thisMonth: number
  lastMonth: number
}

export async function getContractAnalytics(): Promise<ContractAnalytics> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: contracts, error } = await db
    .from('event_contracts')
    .select('id, status, sent_at, signed_at, created_at')
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[getContractAnalytics] Error:', error)
    throw new Error('Failed to load contract analytics')
  }

  const all = (contracts ?? []) as Array<{
    id: string
    status: string
    sent_at: string | null
    signed_at: string | null
    created_at: string
  }>

  const total = all.length
  const signed = all.filter((c) => c.status === 'signed').length
  const voided = all.filter((c) => c.status === 'voided').length
  const draft = all.filter((c) => c.status === 'draft').length
  const pending = all.filter((c) => ['sent', 'viewed'].includes(c.status)).length

  // Average days to sign (only for contracts that have both sent_at and signed_at)
  const signedWithDates = all.filter((c) => c.status === 'signed' && c.sent_at && c.signed_at)
  let avgDaysToSign: number | null = null
  if (signedWithDates.length > 0) {
    const totalMs = signedWithDates.reduce((sum, c) => {
      const sentDate = new Date(c.sent_at!).getTime()
      const signedDate = new Date(c.signed_at!).getTime()
      return sum + (signedDate - sentDate)
    }, 0)
    const avgMs = totalMs / signedWithDates.length
    avgDaysToSign = Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10
  }

  // Acceptance rate: signed / (signed + voided)
  const resolved = signed + voided
  const acceptanceRate = resolved > 0 ? Math.round((signed / resolved) * 100) : null

  // This month vs last month
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const thisMonth = all.filter((c) => new Date(c.created_at) >= thisMonthStart).length
  const lastMonth = all.filter((c) => {
    const d = new Date(c.created_at)
    return d >= lastMonthStart && d < thisMonthStart
  }).length

  return {
    total,
    signed,
    pending,
    voided,
    draft,
    avgDaysToSign,
    acceptanceRate,
    thisMonth,
    lastMonth,
  }
}
