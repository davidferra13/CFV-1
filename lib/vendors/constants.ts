// Vendor constants shared by client components and server actions.

export const VENDOR_CATEGORY_VALUES = [
  'grocery',
  'specialty',
  'farmers_market',
  'wholesale',
  'equipment',
  'rental',
  'other',
] as const

export const VENDOR_CATEGORY_OPTIONS = [
  { value: 'grocery', label: 'Grocery' },
  { value: 'specialty', label: 'Specialty' },
  { value: 'farmers_market', label: 'Farmers Market' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'rental', label: 'Rental' },
  { value: 'other', label: 'Other' },
] as const satisfies ReadonlyArray<{
  value: (typeof VENDOR_CATEGORY_VALUES)[number]
  label: string
}>

export const VENDOR_TYPE_VALUES = [
  'grocery',
  'specialty',
  'butcher',
  'fishmonger',
  'farm',
  'liquor',
  'equipment',
  'bakery',
  'produce',
  'dairy',
  'other',
] as const

export const VENDOR_CATEGORY_TO_VENDOR_TYPE: Record<
  (typeof VENDOR_CATEGORY_VALUES)[number],
  (typeof VENDOR_TYPE_VALUES)[number]
> = {
  grocery: 'grocery',
  specialty: 'specialty',
  farmers_market: 'farm',
  wholesale: 'specialty',
  equipment: 'equipment',
  rental: 'equipment',
  other: 'other',
}

export function toVendorType(category: (typeof VENDOR_CATEGORY_VALUES)[number]) {
  return VENDOR_CATEGORY_TO_VENDOR_TYPE[category]
}

export const VENDOR_TYPE_LABELS: Record<string, string> = {
  grocery: 'Grocery Store',
  specialty: 'Specialty / Gourmet',
  butcher: 'Butcher',
  fishmonger: 'Fishmonger / Seafood',
  farm: 'Farm / CSA',
  liquor: 'Liquor / Wine',
  equipment: 'Equipment Rental',
  bakery: 'Bakery',
  produce: 'Produce Market',
  dairy: 'Dairy',
  other: 'Other',
}
