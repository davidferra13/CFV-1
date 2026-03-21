// Network Loading Skeleton - multi-section social hub
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function NetworkLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ContextLoader contextId="nav-network" size="sm" className="py-0 items-start" />
        <Bone className="h-9 w-44" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main feed */}
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-3">
                  <Bone className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Bone className="h-4 w-28" />
                      <Bone className="h-3 w-16" />
                    </div>
                    <Bone className="h-3 w-full" />
                    <Bone className="h-3 w-4/5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sidebar: discover + pending */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Bone className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Bone className="h-3 w-32" />
                    <Bone className="h-3 w-24" />
                  </div>
                  <Bone className="h-7 w-16 shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Bone className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-9 w-9 rounded-full shrink-0" />
                  <Bone className="flex-1 h-3" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
