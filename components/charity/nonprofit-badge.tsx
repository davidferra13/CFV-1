import { Badge } from '@/components/ui/badge'
import { ShieldCheck } from '@/components/ui/icons'

export function NonprofitBadge({ verified }: { verified: boolean }) {
  if (!verified) return null
  return (
    <Badge variant="success" className="gap-1 text-xs">
      <ShieldCheck className="w-3 h-3" />
      501(c)
    </Badge>
  )
}
