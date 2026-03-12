// Equipment constants extracted from actions.ts
// Client components can safely import from here without violating the use server rule.

export const EQUIPMENT_CATEGORIES = [
  'cookware',
  'knives',
  'smallwares',
  'appliances',
  'serving',
  'transport',
  'linen',
  'other',
] as const

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  cookware: 'Cookware',
  knives: 'Knives',
  smallwares: 'Smallwares',
  appliances: 'Appliances',
  serving: 'Serving',
  transport: 'Transport',
  linen: 'Linen',
  other: 'Other',
}

export const EQUIPMENT_ASSET_STATES = ['owned', 'wishlist', 'reference'] as const

export type EquipmentAssetState = (typeof EQUIPMENT_ASSET_STATES)[number]

export const EQUIPMENT_ASSET_STATE_LABELS: Record<EquipmentAssetState, string> = {
  owned: 'Owned',
  wishlist: 'Wishlist',
  reference: 'Reference',
}

export const EQUIPMENT_SOURCE_KINDS = [
  'amazon',
  'restaurant_supply',
  'brand_direct',
  'rental_house',
  'local_store',
  'other',
] as const

export type EquipmentSourceKind = (typeof EQUIPMENT_SOURCE_KINDS)[number]

export const EQUIPMENT_SOURCE_KIND_LABELS: Record<EquipmentSourceKind, string> = {
  amazon: 'Amazon',
  restaurant_supply: 'Restaurant supply',
  brand_direct: 'Brand direct',
  rental_house: 'Rental house',
  local_store: 'Local store',
  other: 'Other',
}
