import type { Database } from '@/types/database'

type EventStatus = Database['public']['Enums']['event_status']

export type EventWorkspacePhaseKey = 'pipeline' | 'scheduled' | 'service' | 'closeout' | 'cancelled'

export type EventWorkspacePhase = {
  id: EventWorkspacePhaseKey
  label: string
  description: string
}

export const EVENT_WORKSPACE_PHASES: EventWorkspacePhase[] = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    description: 'Draft through accepted events. Build docs as requirements stabilize.',
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    description: 'Paid and confirmed events. Finalize and print the full service packet.',
  },
  {
    id: 'service',
    label: 'Live Service',
    description: 'In-progress events. Access execution docs immediately.',
  },
  {
    id: 'closeout',
    label: 'Post-Service',
    description: 'Completed events. Keep final packets and closeout records organized.',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    description: 'Cancelled events kept for historical context and audit trace.',
  },
]

const PHASE_BY_STATUS: Record<EventStatus, EventWorkspacePhaseKey> = {
  draft: 'pipeline',
  proposed: 'pipeline',
  accepted: 'pipeline',
  paid: 'scheduled',
  confirmed: 'scheduled',
  in_progress: 'service',
  completed: 'closeout',
  cancelled: 'cancelled',
}

const STATUS_BADGE_CLASS: Record<EventStatus, string> = {
  draft: 'bg-stone-800 text-stone-300 border border-stone-700',
  proposed: 'bg-blue-950 text-blue-300 border border-blue-800',
  accepted: 'bg-indigo-950 text-indigo-300 border border-indigo-800',
  paid: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
  confirmed: 'bg-green-950 text-green-300 border border-green-800',
  in_progress: 'bg-amber-950 text-amber-300 border border-amber-800',
  completed: 'bg-teal-950 text-teal-300 border border-teal-800',
  cancelled: 'bg-rose-950 text-rose-300 border border-rose-800',
}

export function isEventWorkspacePhaseKey(value: string): value is EventWorkspacePhaseKey {
  return EVENT_WORKSPACE_PHASES.some((phase) => phase.id === value)
}

export function getEventWorkspacePhase(status: string | null | undefined): EventWorkspacePhaseKey {
  if (!status) return 'pipeline'
  if (status in PHASE_BY_STATUS) {
    return PHASE_BY_STATUS[status as EventStatus]
  }
  return 'pipeline'
}

export function getEventStatusBadgeClass(status: string | null | undefined): string {
  if (status && status in STATUS_BADGE_CLASS) {
    return STATUS_BADGE_CLASS[status as EventStatus]
  }
  return STATUS_BADGE_CLASS.draft
}
