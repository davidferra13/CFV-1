// Shopping list constants live outside the server action file so client components
// can import them without violating Next.js 'use server' export rules.

export const SHOPPING_CATEGORIES = [
  'Produce',
  'Protein',
  'Dairy',
  'Bakery',
  'Pantry',
  'Frozen',
  'Beverages',
  'Spices/Seasonings',
  'Other',
] as const
