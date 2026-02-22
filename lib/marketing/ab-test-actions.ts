// A/B Test Server Actions
// Chef-only: Create, resolve, and query A/B tests for marketing campaigns

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateABTestSchema = z.object({
  campaignId: z.string().uuid('Campaign ID must be a valid UUID'),
  variantASubject: z.string().min(1, 'Variant A subject is required'),
  variantBSubject: z.string().min(1, 'Variant B subject is required'),
  testPercent: z.number().int().min(5).max(50, 'Test percent must be between 5 and 50'),
})

const ResolveABTestSchema = z.object({
  testId: z.string().uuid('Test ID must be a valid UUID'),
  winner: z.enum(['a', 'b']),
})

export type CreateABTestInput = z.infer<typeof CreateABTestSchema>

// ============================================
// RETURN TYPES
// ============================================

export type ABTest = {
  id: string
  campaignId: string
  variantASubject: string
  variantBSubject: string
  testPercent: number
  winner: 'a' | 'b' | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ABTestWithStats = ABTest & {
  variantAOpens: number
  variantAClicks: number
  variantBOpens: number
  variantBClicks: number
}

// ============================================
// HELPERS
// ============================================

function mapABTest(row: any): ABTest {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    variantASubject: row.variant_a_subject,
    variantBSubject: row.variant_b_subject,
    testPercent: row.test_percent,
    winner: row.winner ?? null,
    resolvedAt: row.resolved_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================
// ACTIONS
// ============================================

/**
 * Create a new A/B test for a marketing campaign.
 * Splits the recipient list by testPercent to compare two subject lines.
 */
export async function createABTest(input: CreateABTestInput) {
  const user = await requireChef()
  const validated = CreateABTestSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('ab_tests')
    .insert({
      campaign_id: validated.campaignId,
      chef_id: user.tenantId!,
      variant_a_subject: validated.variantASubject,
      variant_b_subject: validated.variantBSubject,
      test_percent: validated.testPercent,
    })
    .select()
    .single()

  if (error) {
    console.error('[createABTest] Error:', error)
    throw new Error('Failed to create A/B test')
  }

  revalidatePath('/marketing')
  return { success: true, test: mapABTest(data) }
}

/**
 * Resolve an A/B test by selecting a winner.
 * Sets the winner field and resolved_at timestamp.
 */
export async function resolveABTest(testId: string, winner: 'a' | 'b') {
  const user = await requireChef()
  const validated = ResolveABTestSchema.parse({ testId, winner })
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('ab_tests')
    .update({
      winner: validated.winner,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', validated.testId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[resolveABTest] Error:', error)
    throw new Error('Failed to resolve A/B test')
  }

  revalidatePath('/marketing')
  return { success: true, test: mapABTest(data) }
}

/**
 * Get a single A/B test with aggregated stats from campaign recipients.
 * Returns open/click counts per variant for comparison.
 */
export async function getABTestResults(testId: string): Promise<ABTestWithStats> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch the test itself
  const { data: test, error } = await supabase
    .from('ab_tests')
    .select('*')
    .eq('id', testId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !test) {
    console.error('[getABTestResults] Error:', error)
    throw new Error('A/B test not found')
  }

  // Fetch campaign recipients to compute per-variant stats
  const { data: recipients } = await supabase
    .from('campaign_recipients')
    .select('ab_variant, opened_at, pixel_loaded_at, link_clicks')
    .eq('campaign_id', test.campaign_id)

  const rows = recipients ?? []

  let variantAOpens = 0
  let variantAClicks = 0
  let variantBOpens = 0
  let variantBClicks = 0

  for (const r of rows) {
    const opened = r.opened_at || r.pixel_loaded_at
    const clickCount = Array.isArray(r.link_clicks) ? r.link_clicks.length : 0

    if (r.ab_variant === 'a') {
      if (opened) variantAOpens++
      variantAClicks += clickCount
    } else if (r.ab_variant === 'b') {
      if (opened) variantBOpens++
      variantBClicks += clickCount
    }
  }

  return {
    ...mapABTest(test),
    variantAOpens,
    variantAClicks,
    variantBOpens,
    variantBClicks,
  }
}

/**
 * List all A/B tests for the current chef, ordered newest first.
 */
export async function listABTests(): Promise<ABTest[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('ab_tests')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[listABTests] Error:', error)
    throw new Error('Failed to list A/B tests')
  }

  return (data ?? []).map(mapABTest)
}
