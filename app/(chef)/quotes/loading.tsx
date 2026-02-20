// Quotes Loading Skeleton — status tabs + quote cards
import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function QuotesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-28" />
        <Bone className="h-9 w-32" />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Bone key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Quote cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <Bone className="h-4 w-52" />
                    <Bone className="h-6 w-16 rounded-full" />
                  </div>
                  <Bone className="h-3 w-36" />
                  <Bone className="h-3 w-48" />
                </div>
                <div className="text-right space-y-2 shrink-0">
                  <Bone className="h-5 w-24" />
                  <Bone className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
