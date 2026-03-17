// Shared constants for prep timeline display.
// Extracted from prep-timeline.ts because 'use server' files cannot export
// non-async values (Next.js restriction).

export type PrepCategory = 'day-before' | 'morning' | 'afternoon' | 'final-hour' | 'plating'

export const CATEGORY_LABELS: Record<PrepCategory, string> = {
  'day-before': 'Day Before',
  morning: 'Morning Of',
  afternoon: 'Afternoon',
  'final-hour': 'Final Hour',
  plating: 'Plating / Service',
}
