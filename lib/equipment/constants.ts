// Equipment constants extracted from actions.ts
// Client components can safely import from here without violating the use server rule.

export const EQUIPMENT_CATEGORIES = [
  'cookware', 'knives', 'smallwares', 'appliances',
  'serving', 'transport', 'linen', 'other',
] as const

export type EquipmentCategory = typeof EQUIPMENT_CATEGORIES[number]
