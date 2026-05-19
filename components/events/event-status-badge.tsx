// Event Status Badge - Distinctive visual treatment per status
'use client'

import type { ReactNode } from 'react'
import { STATUS_BADGE_CONTRAST_CLASSES } from '@/lib/ui/contrast-contract'

export type EventStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'paid'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

type StatusConfig = {
  label: string
  icon: ReactNode
  classes: string
}

function Icon({ d, fill }: { d: string; fill?: boolean }) {
  return (
    <svg
      className="h-3.5 w-3.5 flex-shrink-0"
      viewBox="0 0 16 16"
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 flex-shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M5.5 8l2 2 3-3.5" />
    </svg>
  )
}

function XCircleIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 flex-shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6 6l4 4M10 6l-4 4" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 flex-shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 14h6M8 11v3M4 2h8v4a4 4 0 01-8 0V2z" />
      <path d="M4 4H2.5a1 1 0 00-1 1v1a2 2 0 002 2H4M12 4h1.5a1 1 0 011 1v1a2 2 0 01-2 2H12" />
    </svg>
  )
}

const STATUS_CONFIG: Record<EventStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    icon: <Icon d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />,
    classes: `${STATUS_BADGE_CONTRAST_CLASSES.muted} border border-dashed`,
  },
  proposed: {
    label: 'Proposed',
    icon: <Icon d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill />,
    classes: `${STATUS_BADGE_CONTRAST_CLASSES.info} border`,
  },
  accepted: {
    label: 'Accepted',
    icon: (
      <Icon d="M5 14H3a1 1 0 01-1-1V8a1 1 0 011-1h2m0 7V7m0 7h6.5a1.5 1.5 0 001.45-1.12l1-4A1.5 1.5 0 0012.5 7H10V3.5A1.5 1.5 0 008.5 2L5 7" />
    ),
    classes: `${STATUS_BADGE_CONTRAST_CLASSES.info} border`,
  },
  paid: {
    label: 'Paid',
    icon: (
      <Icon d="M8 1v14M11.5 4c0-1.1-1.6-2-3.5-2S4.5 2.9 4.5 4s1.6 2 3.5 2 3.5.9 3.5 2-1.6 2-3.5 2-3.5-.9-3.5-2" />
    ),
    classes: `${STATUS_BADGE_CONTRAST_CLASSES.info} border`,
  },
  confirmed: {
    label: 'Confirmed',
    icon: <CheckCircleIcon />,
    classes: `${STATUS_BADGE_CONTRAST_CLASSES.success} border`,
  },
  in_progress: {
    label: 'Live',
    icon: (
      <Icon
        d="M8 1C6 4 4 6 4 9a4 4 0 008 0c0-1.5-.5-2.5-1.5-3.5C10 6 9 5.5 8 4c-.5 1-1 2-2 3 .5-2 1-4 2-6z"
        fill
      />
    ),
    classes: `${STATUS_BADGE_CONTRAST_CLASSES.warning} border`,
  },
  completed: {
    label: 'Completed',
    icon: <TrophyIcon />,
    classes: `${STATUS_BADGE_CONTRAST_CLASSES.success} border`,
  },
  cancelled: {
    label: 'Cancelled',
    icon: <XCircleIcon />,
    classes: `${STATUS_BADGE_CONTRAST_CLASSES.danger} border line-through`,
  },
}

export function EventStatusBadge({
  status,
  size = 'md',
}: {
  status: EventStatus
  size?: 'sm' | 'md'
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-3 py-1 text-xs gap-1.5'

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium transition-colors duration-150 ${sizeClasses} ${config.classes}`}
    >
      {config.icon}
      {config.label}
    </span>
  )
}
