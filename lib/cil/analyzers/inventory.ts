// CIL Proactive Analyzer: Inventory
// Detects price spikes and waste patterns from inventory transactions

import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function analyzeInventory(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    const client = createServerClient()
    const signals: ProactiveSignal[] = []
    const now = Date.now()

    // 1. Price spikes: ingredient costs > 20% above 30-day average
    await analyzePriceSpikes(client, tenantId, signals, now)

    // 2. Waste patterns: frequent waste/spoilage transactions
    await analyzeWastePatterns(client, tenantId, signals, now)

    return signals
  } catch (err) {
    console.error(
      '[CIL/inventory] analyzer failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

async function analyzePriceSpikes(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Recent purchases (last 7 days) with cost data
  const { data: recentTx } = await client
    .from('inventory_transactions')
    .select('ingredient_name, cost_cents, quantity')
    .eq('chef_id', tenantId)
    .eq('transaction_type', 'purchase')
    .gte('created_at', sevenDaysAgo.toISOString())

  if (!recentTx || recentTx.length === 0) return

  // Historical purchases (prior 30 days) for comparison
  const { data: historicalTx } = await client
    .from('inventory_transactions')
    .select('ingredient_name, cost_cents, quantity')
    .eq('chef_id', tenantId)
    .eq('transaction_type', 'purchase')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .lte('created_at', sevenDaysAgo.toISOString())

  if (!historicalTx || historicalTx.length === 0) return

  // Build historical cost-per-unit by ingredient
  const historicalCosts = new Map<string, { totalCost: number; totalQty: number }>()
  for (const tx of historicalTx) {
    if (!tx.cost_cents || !tx.quantity || tx.quantity <= 0) continue
    const existing = historicalCosts.get(tx.ingredient_name) || { totalCost: 0, totalQty: 0 }
    existing.totalCost += tx.cost_cents
    existing.totalQty += Number(tx.quantity)
    historicalCosts.set(tx.ingredient_name, existing)
  }

  // Compare recent cost-per-unit
  const recentCosts = new Map<string, { totalCost: number; totalQty: number }>()
  for (const tx of recentTx) {
    if (!tx.cost_cents || !tx.quantity || tx.quantity <= 0) continue
    const existing = recentCosts.get(tx.ingredient_name) || { totalCost: 0, totalQty: 0 }
    existing.totalCost += tx.cost_cents
    existing.totalQty += Number(tx.quantity)
    recentCosts.set(tx.ingredient_name, existing)
  }

  for (const [name, recent] of recentCosts) {
    const historical = historicalCosts.get(name)
    if (!historical || historical.totalQty === 0 || recent.totalQty === 0) continue

    const recentUnitCost = recent.totalCost / recent.totalQty
    const historicalUnitCost = historical.totalCost / historical.totalQty
    const spikePercent = ((recentUnitCost - historicalUnitCost) / historicalUnitCost) * 100

    if (spikePercent > 20) {
      signals.push({
        id: generateId(),
        domain: 'inventory',
        urgency: 3,
        confidence: 0.7,
        title: `Price spike: ${name}`,
        detail: `Unit cost up ${Math.round(spikePercent)}% this week vs 30-day average ($${(recentUnitCost / 100).toFixed(2)} vs $${(historicalUnitCost / 100).toFixed(2)}).`,
        suggestedAction: 'Check alternative vendors or adjust menu pricing',
        actionType: 'navigate',
        actionPayload: { path: '/culinary/ingredients' },
        entityIds: [],
        source: 'inventory.priceSpikes',
        createdAt: now,
      })
    }
  }
}

async function analyzeWastePatterns(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Look for waste/spoilage transactions
  const { data: wasteTx } = await client
    .from('inventory_transactions')
    .select('ingredient_name, cost_cents, quantity, created_at')
    .eq('chef_id', tenantId)
    .eq('transaction_type', 'waste')
    .gte('created_at', thirtyDaysAgo.toISOString())

  if (!wasteTx || wasteTx.length < 3) return

  // Group waste by ingredient
  const wasteByIngredient = new Map<string, { count: number; totalCost: number }>()
  for (const tx of wasteTx) {
    const existing = wasteByIngredient.get(tx.ingredient_name) || { count: 0, totalCost: 0 }
    existing.count++
    existing.totalCost += Math.abs(tx.cost_cents || 0)
    wasteByIngredient.set(tx.ingredient_name, existing)
  }

  // Flag ingredients with repeated waste
  for (const [name, stats] of wasteByIngredient) {
    if (stats.count >= 3) {
      signals.push({
        id: generateId(),
        domain: 'inventory',
        urgency: 3,
        confidence: 0.65,
        title: `Recurring waste: ${name}`,
        detail: `Wasted ${stats.count} times in 30 days${stats.totalCost > 0 ? `, ~$${(stats.totalCost / 100).toFixed(0)} lost` : ''}. Consider adjusting order quantities.`,
        suggestedAction: 'Reduce order quantity or find smaller packaging',
        actionType: 'navigate',
        actionPayload: { path: '/culinary/ingredients' },
        entityIds: [],
        source: 'inventory.wastePatterns',
        createdAt: now,
      })
    }
  }

  // Overall waste summary
  const totalWasteCost = wasteTx.reduce(
    (s: number, tx: { cost_cents: number | null }) => s + Math.abs(tx.cost_cents || 0),
    0
  )
  if (totalWasteCost > 5000) {
    // More than $50 waste in 30 days
    signals.push({
      id: generateId(),
      domain: 'inventory',
      urgency: 3,
      confidence: 0.75,
      title: 'High monthly waste',
      detail: `$${(totalWasteCost / 100).toFixed(0)} in inventory waste over the last 30 days across ${wasteTx.length} incidents.`,
      suggestedAction: 'Review purchasing patterns and storage practices',
      actionType: 'navigate',
      actionPayload: { path: '/culinary/prep/shopping' },
      entityIds: [],
      source: 'inventory.wastePatterns',
      createdAt: now,
    })
  }
}
