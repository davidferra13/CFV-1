// Universal Status Badge - Consistent status colors across all entities
'use client'

import { HTMLAttributes } from 'react'

type StatusTier = 'neutral' | 'pending' | 'active' | 'progress' | 'success' | 'danger' | 'muted'

const TIER_STYLES: Record<StatusTier, string> = {
  neutral: 'bg-stone-800 text-stone-400',
  pending: 'bg-amber-950 text-amber-700 ring-1 ring-inset ring-amber-800',
  active: 'bg-emerald-950 text-emerald-700 ring-1 ring-inset ring-emerald-800',
  progress: 'bg-sky-950 text-sky-700 ring-1 ring-inset ring-sky-800',
  success: 'bg-emerald-900 text-emerald-800 ring-1 ring-inset ring-emerald-300',
  danger: 'bg-red-950 text-red-700 ring-1 ring-inset ring-red-800',
  muted: 'bg-stone-800 text-stone-400 ring-1 ring-inset ring-stone-700',
}

// Map every entity status to a visual tier
const STATUS_MAP: Record<string, { label: string; tier: StatusTier }> = {
  // Events
  draft: { label: 'Draft', tier: 'neutral' },
  proposed: { label: 'Proposed', tier: 'progress' },
  accepted: { label: 'Accepted', tier: 'pending' },
  paid: { label: 'Paid', tier: 'active' },
  confirmed: { label: 'Confirmed', tier: 'active' },
  in_progress: { label: 'In Progress', tier: 'progress' },
  completed: { label: 'Completed', tier: 'success' },
  cancelled: { label: 'Cancelled', tier: 'muted' },
  // Inquiries
  new: { label: 'New', tier: 'pending' },
  awaiting_client: { label: 'Awaiting Client', tier: 'progress' },
  awaiting_chef: { label: 'Awaiting Chef', tier: 'pending' },
  quoted: { label: 'Quoted', tier: 'progress' },
  declined: { label: 'Declined', tier: 'danger' },
  expired: { label: 'Expired', tier: 'muted' },
  // Quotes
  sent: { label: 'Sent', tier: 'progress' },
  viewed: { label: 'Viewed', tier: 'progress' },
  accepted_quote: { label: 'Accepted', tier: 'active' },
  rejected: { label: 'Rejected', tier: 'danger' },
  // Payment
  unpaid: { label: 'Unpaid', tier: 'pending' },
  partial: { label: 'Partial', tier: 'pending' },
  fully_paid: { label: 'Paid', tier: 'success' },
  overdue: { label: 'Overdue', tier: 'danger' },
  // Menus
  active: { label: 'Active', tier: 'active' },
  archived: { label: 'Archived', tier: 'muted' },
}

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: string
  label?: string
}

export function StatusBadge({ status, label, className = '', ...props }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || { label: status, tier: 'neutral' as StatusTier }
  const displayLabel = label || config.label

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${TIER_STYLES[config.tier]} ${className}`}
      {...props}
    >
      {displayLabel}
    </span>
  )
}
