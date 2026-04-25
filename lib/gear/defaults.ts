export type GearCategory = 'uniform' | 'tools' | 'carry' | 'grooming' | 'safety'

export type DefaultGearItem = {
  item_name: string
  category: GearCategory
}

export const DEFAULT_GEAR_ITEMS: DefaultGearItem[] = [
  // Uniform
  { item_name: 'Chef jacket', category: 'uniform' },
  { item_name: 'Chef pants', category: 'uniform' },
  { item_name: 'Apron', category: 'uniform' },
  { item_name: 'Hat / skull cap', category: 'uniform' },
  { item_name: 'Cravat / neckerchief', category: 'uniform' },
  { item_name: 'Non-slip shoes', category: 'uniform' },
  // On-Person Tools
  { item_name: 'Watch', category: 'tools' },
  { item_name: 'Instant-read thermometer', category: 'tools' },
  { item_name: 'Tasting spoons', category: 'tools' },
  { item_name: 'Sharpie / marker', category: 'tools' },
  { item_name: 'Lighter / torch', category: 'tools' },
  { item_name: 'Knife roll', category: 'tools' },
  // Carry Bag
  { item_name: 'Notebook + pen', category: 'carry' },
  { item_name: 'Business cards', category: 'carry' },
  { item_name: 'Phone charger', category: 'carry' },
  { item_name: 'Extra apron', category: 'carry' },
  // Grooming Kit
  { item_name: 'Lint roller', category: 'grooming' },
  { item_name: 'Stain remover pen', category: 'grooming' },
  { item_name: 'Hair ties / bobby pins', category: 'grooming' },
  { item_name: 'Travel deodorant', category: 'grooming' },
  // Safety / Compliance
  { item_name: 'Disposable gloves (box)', category: 'safety' },
  { item_name: 'Hand sanitizer', category: 'safety' },
  { item_name: 'First aid kit', category: 'safety' },
  { item_name: 'Cut gloves', category: 'safety' },
]

export const GEAR_CATEGORY_LABELS: Record<GearCategory, string> = {
  uniform: 'Uniform',
  tools: 'On-Person Tools',
  carry: 'Carry Bag',
  grooming: 'Grooming Kit',
  safety: 'Safety / Compliance',
}

export const GEAR_CATEGORY_ORDER: GearCategory[] = [
  'uniform',
  'tools',
  'carry',
  'grooming',
  'safety',
]
