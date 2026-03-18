// Vendor constants - extracted from actions.ts so client components can import
// without violating the 'use server' rule (which only permits async function exports).

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
