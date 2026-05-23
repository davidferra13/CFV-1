'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { CommitmentPortfolio, PortfolioDefinition, PortfolioType } from './portfolio-types'

/** Preset portfolio definitions. Stateless, no DB call needed. */
const PORTFOLIO_DEFINITIONS: PortfolioDefinition[] = [
  {
    type: 'quality-first',
    name: 'Quality First',
    description:
      'Prioritize ingredient quality, recipe refinement, and client satisfaction over volume.',
    seasonal_months: [3, 4, 5, 9, 10, 11], // spring and fall: peak local produce
    commitments: [
      {
        label: 'Source 80% local ingredients',
        category: 'sourcing',
        threshold: 80,
        unit: 'percent',
      },
      {
        label: 'Test every new recipe 2x before serving',
        category: 'quality',
        threshold: 2,
        unit: 'tests',
      },
      { label: 'Max 3 events per week', category: 'capacity', threshold: 3, unit: 'events' },
      {
        label: 'Client feedback score above 4.5',
        category: 'satisfaction',
        threshold: 4.5,
        unit: 'rating',
      },
    ],
  },
  {
    type: 'growth',
    name: 'Growth Mode',
    description: 'Maximize bookings and client acquisition. Accept more events, expand reach.',
    seasonal_months: [1, 2, 6], // January new year push, February valentines, June weddings
    commitments: [
      {
        label: 'Respond to inquiries within 2 hours',
        category: 'responsiveness',
        threshold: 2,
        unit: 'hours',
      },
      {
        label: 'Accept up to 6 events per week',
        category: 'capacity',
        threshold: 6,
        unit: 'events',
      },
      {
        label: 'Follow up with every lead within 24h',
        category: 'sales',
        threshold: 24,
        unit: 'hours',
      },
      {
        label: 'Add 2 new menu options monthly',
        category: 'offerings',
        threshold: 2,
        unit: 'menus',
      },
    ],
  },
  {
    type: 'sustainability',
    name: 'Sustainability',
    description:
      'Balance workload with wellbeing. Prevent burnout while maintaining steady income.',
    seasonal_months: [7, 8, 12], // summer slow-down, holiday recovery
    commitments: [
      { label: 'Max 4 events per week', category: 'capacity', threshold: 4, unit: 'events' },
      { label: 'One full day off per week', category: 'wellbeing', threshold: 1, unit: 'days' },
      { label: 'Maintain 20% profit margin', category: 'finance', threshold: 20, unit: 'percent' },
      {
        label: 'Prep time under 6 hours per event',
        category: 'efficiency',
        threshold: 6,
        unit: 'hours',
      },
    ],
  },
  {
    type: 'recovery',
    name: 'Recovery',
    description: 'Rebuild after a slow period or setback. Focus on relationships and reputation.',
    seasonal_months: [], // not seasonal; triggered by circumstances
    commitments: [
      {
        label: 'Reach out to 5 past clients weekly',
        category: 'outreach',
        threshold: 5,
        unit: 'clients',
      },
      {
        label: 'Offer one complimentary tasting monthly',
        category: 'marketing',
        threshold: 1,
        unit: 'tastings',
      },
      {
        label: 'Update public profile weekly',
        category: 'presence',
        threshold: 1,
        unit: 'updates',
      },
      {
        label: 'Document every recipe used',
        category: 'documentation',
        threshold: 100,
        unit: 'percent',
      },
    ],
  },
]

/**
 * Returns all preset portfolio definitions.
 */
export async function getPortfolios(): Promise<PortfolioDefinition[]> {
  await requireChef()
  return PORTFOLIO_DEFINITIONS
}

/**
 * Activate a portfolio for the current chef.
 * Stores the activation record; commitment enforcement is handled by the commitment engine.
 */
export async function applyPortfolio(
  portfolioType: PortfolioType,
  customizations?: Record<string, unknown>
): Promise<CommitmentPortfolio> {
  const user = await requireChef()
  const db = createServerClient()

  // Verify valid portfolio type
  const definition = PORTFOLIO_DEFINITIONS.find((p) => p.type === portfolioType)
  if (!definition) throw new Error(`Unknown portfolio type: ${portfolioType}`)

  const { data, error } = await db
    .from('commitment_portfolios')
    .insert({
      tenant_id: user.tenantId!,
      portfolio_type: portfolioType,
      customizations: customizations ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to activate portfolio: ${error.message}`)
  return data as CommitmentPortfolio
}

/**
 * Update customizations on the chef's active portfolio.
 * Customizations override default thresholds in the preset.
 */
export async function customizePortfolio(
  portfolioId: string,
  customizations: Record<string, unknown>
): Promise<CommitmentPortfolio> {
  const user = await requireChef()
  const db = createServerClient()

  const { data, error } = await db
    .from('commitment_portfolios')
    .update({ customizations })
    .eq('id', portfolioId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to customize portfolio: ${error.message}`)
  return data as CommitmentPortfolio
}

/**
 * Recommend a portfolio based on the current month.
 * Returns the portfolio whose seasonal_months includes the current month,
 * or 'sustainability' as a safe default.
 */
export async function getSeasonalSuggestion(): Promise<PortfolioDefinition> {
  await requireChef()

  const currentMonth = new Date().getMonth() + 1 // 1-12
  const match = PORTFOLIO_DEFINITIONS.find((p) => p.seasonal_months.includes(currentMonth))

  return match ?? PORTFOLIO_DEFINITIONS.find((p) => p.type === 'sustainability')!
}

/**
 * Get the chef's most recently activated portfolio, if any.
 */
export async function getActivePortfolio(): Promise<CommitmentPortfolio | null> {
  const user = await requireChef()
  const db = createServerClient()

  const { data, error } = await db
    .from('commitment_portfolios')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('activated_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data as CommitmentPortfolio
}
