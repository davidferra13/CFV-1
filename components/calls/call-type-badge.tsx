// CallTypeBadge — colored label for call type

import type { CallType } from '@/lib/calls/actions'

const TYPE_CONFIG: Record<CallType, { label: string; className: string }> = {
  discovery: { label: 'Discovery', className: 'bg-blue-100 text-blue-800' },
  follow_up: { label: 'Follow-up', className: 'bg-yellow-100 text-yellow-800' },
  proposal_walkthrough: {
    label: 'Proposal Walkthrough',
    className: 'bg-purple-100 text-purple-800',
  },
  pre_event_logistics: { label: 'Pre-Event Logistics', className: 'bg-orange-100 text-orange-800' },
  vendor_supplier: { label: 'Vendor / Supplier', className: 'bg-teal-100 text-teal-800' },
  partner: { label: 'Partner', className: 'bg-indigo-100 text-indigo-800' },
  general: { label: 'General', className: 'bg-gray-100 text-gray-700' },
  prospecting: { label: 'Prospecting', className: 'bg-emerald-100 text-emerald-800' },
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
