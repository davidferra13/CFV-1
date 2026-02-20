// Waste Tracking Constants
// Lives in a separate file (no 'use server') so it can be imported by client components.

export type WasteReason =
  | 'OVERPRODUCTION'
  | 'SPOILAGE'
  | 'TRIM'
  | 'MISTAKE'
  | 'CLIENT_RETURN'
  | 'QUALITY_REJECT'
  | 'EXPIRED'
  | 'OTHER'

export const WASTE_REASONS: { value: WasteReason; label: string }[] = [
  { value: 'OVERPRODUCTION', label: 'Overproduction' },
  { value: 'SPOILAGE', label: 'Spoilage' },
  { value: 'TRIM', label: 'Trim / Yield Loss' },
  { value: 'MISTAKE', label: 'Preparation Mistake' },
  { value: 'CLIENT_RETURN', label: 'Client Return' },
  { value: 'QUALITY_REJECT', label: 'Quality Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'OTHER', label: 'Other' },
]

export type IngredientUnit = 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'L' | 'each' | 'bunch' | 'cup'

export const UNITS: IngredientUnit[] = ['g', 'kg', 'oz', 'lb', 'ml', 'L', 'each', 'bunch', 'cup']
