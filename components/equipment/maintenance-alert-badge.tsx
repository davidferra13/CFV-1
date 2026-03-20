// Maintenance Alert Badge - Shows count of overdue maintenance items
// Can be placed next to the Equipment nav item or on the dashboard.
'use client'

import { Badge } from '@/components/ui/badge'

interface MaintenanceAlertBadgeProps {
  overdueCount: number
}

export function MaintenanceAlertBadge({ overdueCount }: MaintenanceAlertBadgeProps) {
  if (overdueCount <= 0) return null

  return (
    <Badge variant="error" className="ml-1.5 text-[10px] px-1.5 py-0">
      {overdueCount}
    </Badge>
  )
}
