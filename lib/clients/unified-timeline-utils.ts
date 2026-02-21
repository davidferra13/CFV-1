// Unified timeline display constants — no 'use server', safe for client imports.

export type TimelineItemSource = 'event' | 'inquiry' | 'message' | 'ledger' | 'review'

export const SOURCE_CONFIG: Record<TimelineItemSource, { label: string; className: string }> = {
  event:   { label: 'Event',   className: 'bg-brand-100 text-brand-700' },
  inquiry: { label: 'Inquiry', className: 'bg-violet-100 text-violet-700' },
  message: { label: 'Message', className: 'bg-sky-100 text-sky-700' },
  ledger:  { label: 'Payment', className: 'bg-emerald-100 text-emerald-700' },
  review:  { label: 'Review',  className: 'bg-amber-100 text-amber-700' },
}
