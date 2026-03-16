// Loyalty Loading Skeleton - tier stat cards + rewards catalog
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function LoyaltyLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ContextLoader contextId="nav-loyalty" size="sm" className="py-0 items-start" />
        <Bone className="h-9 w-28" />
      </div>

      {/* Tier stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4 space-y-2">
              <Bone className="h-3 w-20" />
              <Bone className="h-8 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rewards catalog */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Bone className="h-5 w-36" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-stone-800 rounded-lg p-4 space-y-2">
                  <Bone className="h-4 w-40" />
                  <Bone className="h-3 w-full" />
                  <Bone className="h-3 w-3/4" />
                  <Bone className="h-6 w-20 rounded-full mt-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: approaching milestones + pending */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Bone className="h-5 w-44" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-2 w-full" />
                  <Bone className="h-3 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
