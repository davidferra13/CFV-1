// CallTypeBadge — colored label for call type

import type { CallType } from '@/lib/calls/actions'

const TYPE_CONFIG: Record<CallType, { label: string; className: string }> = {
  discovery: { label: 'Discovery', className: 'bg-blue-900 text-blue-200' },
  follow_up: { label: 'Follow-up', className: 'bg-yellow-900 text-yellow-200' },
  proposal_walkthrough: {
    label: 'Proposal Walkthrough',
    className: 'bg-purple-900 text-purple-200',
  },
  pre_event_logistics: { label: 'Pre-Event Logistics', className: 'bg-orange-900 text-orange-200' },
  vendor_supplier: { label: 'Vendor / Supplier', className: 'bg-teal-900 text-teal-200' },
  partner: { label: 'Partner', className: 'bg-indigo-900 text-indigo-200' },
  general: { label: 'General', className: 'bg-gray-100 text-gray-700' },
  prospecting: { label: 'Prospecting', className: 'bg-emerald-900 text-emerald-200' },
}

export function callTypeLabel(type: CallType): string {
  return TYPE_CONFIG[type]?.label ?? type
}

export function CallTypeBadge({ type }: { type: CallType }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.general
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  )
}
