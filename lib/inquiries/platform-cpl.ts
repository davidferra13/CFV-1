'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

export interface PlatformCPLData {
  channel: string
  channelKey: string
  totalSpendCents: number
  totalInquiries: number
  totalConfirmed: number
  totalRevenueCents: number
  cplCents: number | null
  cpcCents: number | null
  roi: number | null
}

const CHANNEL_DISPLAY: Record<string, string> = {
  thumbtack: 'Thumbtack',
  bark: 'Bark',
  theknot: 'The Knot',
  cozymeal: 'Cozymeal',
  gigsalad: 'GigSalad',
  yhangry: 'Yhangry',
  take_a_chef: 'Take a Chef',
  google_business: 'Google',
  privatechefmanager: 'PrivateChefManager',
  hireachef: 'HireAChef',
  cuisineistchef: 'CuisineistChef',
  instagram_ads: 'Instagram Ads',
  google_ads: 'Google Ads',
  facebook_ads: 'Facebook Ads',
  tiktok_ads: 'TikTok Ads',
  print: 'Print',
  event_sponsorship: 'Sponsorship',
  other: 'Other',
}

export const recordPlatformSpendSchema = z.object({
  channel: z.string().min(1),
  amountCents: z.number().int().positive(),
  spendDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  campaignName: z.string().optional(),
  notes: z.string().optional(),
})

export async function recordPlatformSpend(
  input: z.infer<typeof recordPlatformSpendSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsed = recordPlatformSpendSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const data = parsed.data

  try {
    const supabase = createServerClient()
    const { error } = await supabase.from('marketing_spend_log').insert({
      chef_id: user.tenantId!,
      spend_date: data.spendDate,
      channel: data.channel,
      amount_cents: data.amountCents,
      campaign_name: data.campaignName || null,
      notes: data.notes || null,
    })

    if (error) {
      console.error('[platform-cpl] Failed to record spend:', error.message)
      return { success: false, error: 'Failed to record spend' }
    }

    return { success: true }
  } catch (err) {
    console.error('[platform-cpl] Unexpected error recording spend:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

export async function getPlatformCPL(): Promise<PlatformCPLData[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    const supabase = createServerClient()

    // Query 1: Spend by channel
    const { data: spendRows, error: spendErr } = await supabase
      .from('marketing_spend_log')
      .select('channel, amount_cents')
      .eq('chef_id', tenantId)

    if (spendErr) {
      console.error('[platform-cpl] Failed to fetch spend data:', spendErr.message)
      return []
    }

    const spendByChannel: Record<string, number> = {}
    for (const row of spendRows ?? []) {
      spendByChannel[row.channel] = (spendByChannel[row.channel] ?? 0) + row.amount_cents
    }

    // Query 2: Inquiry counts by channel
    const { data: inquiryRows, error: inqErr } = await supabase
      .from('inquiries')
      .select('channel, status')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (inqErr) {
      console.error('[platform-cpl] Failed to fetch inquiry data:', inqErr.message)
      return []
    }

    const inquiryByChannel: Record<string, { total: number; confirmed: number }> = {}
    for (const row of inquiryRows ?? []) {
      const ch = row.channel ?? 'other'
      if (!inquiryByChannel[ch]) {
        inquiryByChannel[ch] = { total: 0, confirmed: 0 }
      }
      inquiryByChannel[ch].total++
      if (row.status === 'confirmed') {
        inquiryByChannel[ch].confirmed++
      }
    }

    // Merge: only include channels that have spend data
    const results: PlatformCPLData[] = []
    for (const [channelKey, totalSpendCents] of Object.entries(spendByChannel)) {
      const inqData = inquiryByChannel[channelKey] ?? { total: 0, confirmed: 0 }
      const totalInquiries = inqData.total
      const totalConfirmed = inqData.confirmed

      let cplCents: number | null = null
      if (totalSpendCents > 0 && totalInquiries > 0) {
        cplCents = Math.round(totalSpendCents / totalInquiries)
      }

      let cpcCents: number | null = null
      if (totalSpendCents > 0 && totalConfirmed > 0) {
        cpcCents = Math.round(totalSpendCents / totalConfirmed)
      }

      results.push({
        channel: CHANNEL_DISPLAY[channelKey] ?? channelKey,
        channelKey,
        totalSpendCents,
        totalInquiries,
        totalConfirmed,
        totalRevenueCents: 0, // deferred to v2
        cplCents,
        cpcCents,
        roi: null, // deferred to v2
      })
    }

    // Sort by spend descending
    results.sort((a, b) => b.totalSpendCents - a.totalSpendCents)

    return results
  } catch (err) {
    console.error('[platform-cpl] Unexpected error:', err)
    return []
  }
}
