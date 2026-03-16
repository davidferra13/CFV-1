// Queue Empty - "All caught up" celebration state
// Server component.

import { Card } from '@/components/ui/card'
import { AllCaughtUpIllustration } from '@/components/ui/branded-illustrations'

export function QueueEmpty() {
  return (
    <Card className="p-12 text-center border-emerald-200 bg-emerald-950/30">
      <div className="flex justify-center mb-4">
        <AllCaughtUpIllustration className="h-24 w-24" />
      </div>
      <h3 className="text-lg font-semibold text-stone-100">All caught up</h3>
      <p className="text-stone-500 mt-2 max-w-md mx-auto">
        Nothing needs your attention right now. Enjoy the calm or get ahead on optional prep work.
      </p>
    </Card>
  )
}
