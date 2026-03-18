'use client'

import type { DeviceStatus } from '@/lib/devices/types'

interface DeviceStatusBadgeProps {
  status: DeviceStatus
  onlineStatus?: 'online' | 'stale' | 'offline'
}

const statusConfig: Record<DeviceStatus, { label: string; className: string }> = {
  pending_pair: {
    label: 'Pending',
    className: 'bg-blue-950 text-blue-300 border-blue-800',
  },
  active: {
    label: 'Active',
    className: 'bg-green-950 text-green-300 border-green-800',
  },
  disabled: {
    label: 'Disabled',
    className: 'bg-stone-800 text-stone-400 border-stone-700',
  },
  revoked: {
    label: 'Revoked',
    className: 'bg-stone-800 text-stone-500 border-stone-700',
  },
}

const onlineDot: Record<string, string> = {
  online: 'bg-green-400',
  stale: 'bg-yellow-400',
  offline: 'bg-red-400',
}

export function DeviceStatusBadge({ status, onlineStatus }: DeviceStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {status === 'active' && onlineStatus && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${onlineDot[onlineStatus] || onlineDot.offline}`}
        />
      )}
      {config.label}
      {status === 'active' && onlineStatus && (
        <span className="text-xxs opacity-75">({onlineStatus})</span>
      )}
    </span>
  )
}
