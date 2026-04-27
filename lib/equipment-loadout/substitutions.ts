// Substitution Graph
// When a chef doesn't own the required item, suggest alternatives.

import type { Substitution } from '@/lib/equipment/types'

export const SUBSTITUTION_GRAPH: Substitution[] = [
  // Appliance substitutions
  { for_item: 'Stand Mixer', use_instead: 'Hand Mixer', quality: 'equivalent' },
  {
    for_item: 'Stand Mixer',
    use_instead: 'Whisk',
    quality: 'degraded',
    notes: 'Manual effort, suitable for small batches',
  },
  { for_item: 'Deep Fryer', use_instead: 'Heavy Pot + Thermometer', quality: 'equivalent' },
  { for_item: 'Kitchen Torch', use_instead: 'Broiler', quality: 'equivalent' },
  {
    for_item: 'Immersion Blender',
    use_instead: 'Blender',
    quality: 'equivalent',
    notes: 'Work in batches',
  },
  {
    for_item: 'Food Processor',
    use_instead: 'Blender',
    quality: 'partial',
    notes: 'For purees only',
  },
  {
    for_item: 'Food Processor',
    use_instead: "Chef's Knife",
    quality: 'degraded',
    notes: 'Manual chopping',
  },

  // Cookware substitutions
  {
    for_item: 'Dutch Oven',
    use_instead: 'Heavy Stockpot',
    quality: 'equivalent',
    notes: 'With tight-fitting lid',
  },
  {
    for_item: 'Saute Pan',
    use_instead: 'Skillet',
    quality: 'equivalent',
    notes: 'For most saute tasks',
  },
  {
    for_item: 'Cast Iron Skillet',
    use_instead: 'Heavy Stainless Skillet',
    quality: 'partial',
    notes: 'Less heat retention',
  },
  {
    for_item: 'Fish Poacher',
    use_instead: 'Roasting Pan',
    quality: 'equivalent',
    notes: 'With foil cover',
  },
  {
    for_item: 'Wok',
    use_instead: 'Large Skillet',
    quality: 'partial',
    notes: 'Less heat concentration',
  },
  { for_item: 'Double Boiler', use_instead: 'Bowl over Saucepan', quality: 'equivalent' },
  {
    for_item: 'Steamer Insert',
    use_instead: 'Colander over Pot',
    quality: 'partial',
    notes: 'With foil cover',
  },

  // Prep tool substitutions
  {
    for_item: 'Mandoline',
    use_instead: "Chef's Knife",
    quality: 'degraded',
    notes: 'Less uniform slices',
  },
  { for_item: 'Microplane', use_instead: 'Fine Grater', quality: 'equivalent' },
  { for_item: 'Bench Scraper', use_instead: 'Large Knife (flat side)', quality: 'degraded' },
  {
    for_item: 'Salad Spinner',
    use_instead: 'Towel Method',
    quality: 'degraded',
    notes: 'Wrap in clean towels and shake',
  },
  {
    for_item: 'Pasta Machine',
    use_instead: 'Rolling Pin',
    quality: 'degraded',
    notes: 'Manual, less uniform thickness',
  },
  { for_item: 'Ring Mold', use_instead: 'Can (both ends removed)', quality: 'equivalent' },
  { for_item: 'Piping Bags', use_instead: 'Zip-lock Bag (corner cut)', quality: 'partial' },

  // Bakeware substitutions
  { for_item: 'Cooling Rack', use_instead: 'Oven Rack (removed)', quality: 'equivalent' },
  { for_item: 'Pie Dish', use_instead: 'Cake Pan', quality: 'partial' },
  { for_item: 'Loaf Pan', use_instead: 'Freeform on Sheet Tray', quality: 'partial' },

  // Serving substitutions
  {
    for_item: 'Chafing Dishes',
    use_instead: 'Oven-Safe Dishes + Towel Wrap',
    quality: 'degraded',
    notes: 'Limited heat retention',
  },
  { for_item: 'Plating Tweezers', use_instead: 'Chopsticks', quality: 'equivalent' },
]

/**
 * Find substitutions for a given equipment item.
 * Returns in order of quality: equivalent -> partial -> degraded
 */
export function findSubstitutions(itemName: string): Substitution[] {
  const lower = itemName.toLowerCase()
  return SUBSTITUTION_GRAPH.filter((s) => s.for_item.toLowerCase() === lower).sort((a, b) => {
    const order = { equivalent: 0, partial: 1, degraded: 2 }
    return order[a.quality] - order[b.quality]
  })
}
