// Partners Loading Skeleton — partner cards with stats
import { ContextLoader } from '@/components/ui/context-loader'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function PartnersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ContextLoader contextId="nav-network" size="sm" className="py-0 items-start" />
        <Bone className="h-9 w-32" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4 space-y-1">
              <Bone className="h-7 w-16" />
              <Bone className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Partner cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <Bone className="h-12 w-12 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Bone className="h-4 w-44" />
                      <Bone className="h-5 w-16 rounded-full" />
                    </div>
                    <Bone className="h-3 w-32" />
                    <Bone className="h-3 w-56" />
                  </div>
                </div>
                <div className="text-right space-y-1 shrink-0">
                  <Bone className="h-4 w-24" />
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
