// Unified timeline display constants - no 'use server', safe for client imports.

export type TimelineItemSource =
  | 'event'
  | 'inquiry'
  | 'message'
  | 'note'
  | 'quote'
  | 'ledger'
  | 'review'
  | 'client_activity'
  | 'menu_revision'
  | 'document_version'

export const SOURCE_CONFIG: Record<TimelineItemSource, { label: string; className: string }> = {
  event: { label: 'Event', className: 'bg-brand-100 text-brand-400' },
  inquiry: { label: 'Inquiry', className: 'bg-violet-100 text-violet-700' },
  message: { label: 'Message', className: 'bg-brand-100 text-brand-700' },
  note: { label: 'Note', className: 'bg-amber-100 text-amber-700' },
  quote: { label: 'Quote', className: 'bg-teal-100 text-teal-700' },
  ledger: { label: 'Payment', className: 'bg-emerald-100 text-emerald-700' },
  review: { label: 'Review', className: 'bg-orange-100 text-orange-700' },
  client_activity: { label: 'Portal', className: 'bg-sky-100 text-sky-700' },
  menu_revision: { label: 'Menu', className: 'bg-lime-100 text-lime-700' },
  document_version: { label: 'Version', className: 'bg-rose-100 text-rose-700' },
}
