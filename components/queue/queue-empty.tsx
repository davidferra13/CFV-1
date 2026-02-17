// Queue Empty — "All caught up" celebration state
// Server component.

import { Card } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

export function QueueEmpty() {
  return (
    <Card className="p-12 text-center border-emerald-200 bg-emerald-50/30">
      <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
      <h3 className="text-lg font-semibold text-stone-900 mt-4">
        All caught up
      </h3>
      <p className="text-stone-500 mt-2 max-w-md mx-auto">
        Nothing needs your attention right now. Enjoy the calm
        or get ahead on optional prep work.
      </p>
    </Card>
  )
}
