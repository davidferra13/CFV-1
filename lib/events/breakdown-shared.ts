export type BreakdownCategory = 'equipment' | 'cleanup' | 'venue' | 'rentals' | 'staff' | 'admin'

export const CATEGORY_LABELS: Record<BreakdownCategory, string> = {
  equipment: 'Equipment',
  cleanup: 'Cleanup',
  venue: 'Venue',
  rentals: 'Rentals',
  staff: 'Staff',
  admin: 'Admin',
}
