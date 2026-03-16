// Survey Loading Skeleton
// Shown immediately while the server fetches survey data.

import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function SurveyLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      {/* Progress indicator */}
      <div className="space-y-2">
        <Bone className="h-4 w-28" />
        <Bone className="h-2 w-full rounded-full" />
      </div>

      {/* Question card */}
      <Card>
        <CardContent className="p-8 space-y-6">
          <Bone className="h-7 w-64" />
          <Bone className="h-4 w-full" />

          {/* Answer options */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 border border-stone-100 rounded-lg">
                <Bone className="h-5 w-5 rounded-full shrink-0" />
                <Bone className="h-4 w-48" />
              </div>
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4">
            <Bone className="h-10 w-24 rounded" />
            <Bone className="h-10 w-24 rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
