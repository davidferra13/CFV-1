import { Badge } from '@/components/ui/badge'
import type { PlatformStatusChip as PlatformStatusChipType } from './context-panel-types'

export function PlatformStatusChip({ label, tone = 'default' }: PlatformStatusChipType) {
  return (
    <Badge variant={tone} className="px-2 py-0.5 text-xxs">
      {label}
    </Badge>
  )
}
