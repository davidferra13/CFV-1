import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

const DEFAULT_DAYS = 90
const DEFAULT_THRESHOLD = 5

export async function resolveDishFatigue(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { getOverusedDishes } = await import('@/lib/menus/chef-dish-frequency-actions')

  let overused: Awaited<ReturnType<typeof getOverusedDishes>>

  try {
    overused = await getOverusedDishes(DEFAULT_DAYS, DEFAULT_THRESHOLD)
  } catch (err) {
    console.error('[dish-fatigue-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const dish of overused) {
    const altText =
      dish.suggestedAlternatives.length > 0
        ? `Try instead: ${dish.suggestedAlternatives.slice(0, 3).join(', ')}`
        : 'No recent alternatives found in this course'

    items.push({
      definitionId: `chef.dish_fatigue.${dish.dishName.replace(/\s+/g, '_')}`,
      tier: 'p4',
      label: `You've made ${dish.dishName} ${dish.count} times in ${DEFAULT_DAYS} days`,
      context: `Served to ${dish.uniqueClients} client${dish.uniqueClients === 1 ? '' : 's'}. ${altText}`,
      destination: '/chef/menus',
      icon: 'refresh-cw',
      loopState: 'stale',
      sourceKind: 'client_profile',
      evidenceLabel: 'computed',
      confidence: 0.6,
      nextAction: 'Review your rotation and consider swapping in fresh dishes',
      data: {
        dishName: dish.dishName,
        count: dish.count,
        lastServed: dish.lastServed,
        uniqueClients: dish.uniqueClients,
        suggestedAlternatives: dish.suggestedAlternatives,
      },
    })
  }

  return items
}
