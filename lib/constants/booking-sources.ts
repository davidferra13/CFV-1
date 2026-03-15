// Booking Source Constants
// Maps inquiry_channel enum values to display labels and chart colors
// Used by channel analytics dashboard and source breakdown widgets

// All known inquiry channels from the inquiry_channel enum
export const BOOKING_SOURCES = [
  { value: 'text', label: 'Text', color: '#8b5cf6' },
  { value: 'email', label: 'Email', color: '#06b6d4' },
  { value: 'instagram', label: 'Instagram', color: '#e1306c' },
  { value: 'take_a_chef', label: 'Take a Chef', color: '#f59e0b' },
  { value: 'phone', label: 'Phone', color: '#10b981' },
  { value: 'website', label: 'Website', color: '#3b82f6' },
  { value: 'referral', label: 'Referral', color: '#ec4899' },
  { value: 'walk_in', label: 'Walk-In', color: '#14b8a6' },
  { value: 'wix', label: 'Wix', color: '#f97316' },
  { value: 'campaign_response', label: 'Campaign', color: '#6366f1' },
  { value: 'outbound_prospecting', label: 'Outbound', color: '#a855f7' },
  { value: 'yhangry', label: 'Yhangry', color: '#ef4444' },
  { value: 'kiosk', label: 'Kiosk', color: '#64748b' },
  { value: 'thumbtack', label: 'Thumbtack', color: '#22c55e' },
  { value: 'theknot', label: 'The Knot', color: '#db2777' },
  { value: 'bark', label: 'Bark', color: '#0ea5e9' },
  { value: 'cozymeal', label: 'Cozymeal', color: '#d97706' },
  { value: 'google_business', label: 'Google Business', color: '#4285f4' },
  { value: 'gigsalad', label: 'GigSalad', color: '#84cc16' },
  { value: 'other', label: 'Other', color: '#94a3b8' },
] as const

export const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  BOOKING_SOURCES.map((s) => [s.value, s.label])
)

export const SOURCE_COLORS: Record<string, string> = Object.fromEntries(
  BOOKING_SOURCES.map((s) => [s.value, s.color])
)

// Get a display label for any source value, with fallback
export function getSourceLabel(source: string | null | undefined): string {
  if (!source) return 'Unknown'
  return SOURCE_LABELS[source] || source
}

// Get a color for any source value, with fallback
export function getSourceColor(source: string | null | undefined): string {
  if (!source) return '#94a3b8'
  return SOURCE_COLORS[source] || '#94a3b8'
}
