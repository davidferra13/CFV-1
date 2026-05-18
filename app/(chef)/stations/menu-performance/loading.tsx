import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function MenuPerformanceLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-menu-performance" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-52 mt-1" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-5 space-y-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 space-y-1">
                <Bone className="h-4 w-40" />
              </div>
              <Bone className="h-4 w-16" />
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
