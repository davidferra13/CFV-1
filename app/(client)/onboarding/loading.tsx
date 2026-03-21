// Onboarding Loading Skeleton
// Shown immediately while the server fetches onboarding state.

import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-light ${className}`} />
}

export default function OnboardingLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      {/* Progress bar */}
      <div className="space-y-2">
        <Bone className="h-4 w-32" />
        <Bone className="h-2 w-full rounded-full" />
      </div>

      {/* Step card */}
      <Card>
        <CardContent className="p-8 space-y-6">
          <Bone className="h-7 w-56" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-3/4" />

          {/* Form fields */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Bone className="h-4 w-24" />
                <Bone className="h-10 w-full rounded" />
              </div>
            ))}
          </div>

          {/* Action button */}
          <Bone className="h-10 w-32 rounded" />
        </CardContent>
      </Card>
    </div>
  )
}
