// Priority Queue — Culinary Provider
// Surfaces: draft menus on upcoming events, seasonal micro-windows ending soon

import type { SupabaseClient } from '@supabase/supabase-js'
import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'
import { getCurrentSeason, getEndingMicroWindows } from '@/lib/seasonal/helpers'
import type { SeasonalPalette } from '@/lib/seasonal/types'

export async function getCulinaryQueueItems(
  supabase: SupabaseClient,
  tenantId: string
): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  // 1. Draft menus attached to upcoming events
  const { data: draftMenus } = await supabase
    .from('menus')
    .select(`
      id, name, status, event_id,
      event:events(id, occasion, event_date, status, client:clients(full_name))
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')
    .not('event_id', 'is', null)

  for (const menu of (draftMenus || [])) {
    const event = menu.event as any
    if (!event || event.status === 'cancelled' || event.status === 'completed') continue

    const eventDate = new Date(event.event_date)
    if (eventDate < now) continue

    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / 3600000
    const clientName = event.client?.full_name ?? 'Unknown'

    const inputs: ScoreInputs = {
      hoursUntilDue: hoursUntilEvent,
      impactWeight: 0.5,
      isBlocking: true,
      hoursSinceCreated: 0,
      revenueCents: 0,
      isExpiring: false,
    }
    const score = computeScore(inputs)
    items.push({
      id: `culinary:menu:${menu.id}:finalize`,
      domain: 'culinary',
      urgency: urgencyFromScore(score),
      score,
      title: 'Finalize draft menu',
      description: `"${menu.name}" for ${event.occasion || 'event'} (${clientName}) is still in draft.`,
      href: `/menus/${menu.id}`,
      icon: 'UtensilsCrossed',
      context: { primaryLabel: clientName, secondaryLabel: event.occasion || menu.name },
      createdAt: now.toISOString(),
      dueAt: event.event_date,
      blocks: 'Grocery list and prep planning',
      entityId: menu.id,
      entityType: 'menu',
    })
  }

  // 2. Seasonal micro-windows ending within 7 days
  try {
    const { data: palettes } = await supabase
      .from('seasonal_palettes')
      .select('*')
      .eq('tenant_id', tenantId)

    if (palettes && palettes.length > 0) {
      const currentSeason = getCurrentSeason(palettes as unknown as SeasonalPalette[])
      if (currentSeason) {
        const endingWindows = getEndingMicroWindows(currentSeason, 7)
        for (const window of endingWindows) {
          const inputs: ScoreInputs = {
            hoursUntilDue: null,
            impactWeight: 0.15,
            isBlocking: false,
            hoursSinceCreated: 0,
            revenueCents: 0,
            isExpiring: true,
          }
          const score = computeScore(inputs)
          items.push({
            id: `culinary:micro_window:${window.ingredient}:ending`,
            domain: 'culinary',
            urgency: urgencyFromScore(score),
            score,
            title: `${window.ingredient} season ending`,
            description: `${window.name}: ${window.ingredient} window closes soon. ${window.notes || ''}`,
            href: '/recipes',
            icon: 'Leaf',
            context: { primaryLabel: window.ingredient, secondaryLabel: window.name },
            createdAt: now.toISOString(),
            dueAt: null,
            entityId: window.ingredient,
            entityType: 'micro_window',
          })
        }
      }
    }
  } catch {
    // Seasonal palettes may not be configured — graceful degradation
  }

  return items
}
