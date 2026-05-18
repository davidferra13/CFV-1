import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function StationDetailLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-station-detail" size="sm" className="py-0 items-start" />
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bone className="h-4 w-16" />
            <Bone className="h-4 w-4" />
          </div>
          <Bone className="h-7 w-40 mt-1" />
          <Bone className="h-4 w-56 mt-1" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-8 w-28" />
          <Bone className="h-8 w-24" />
          <Bone className="h-8 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Bone className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Bone className="h-4 w-36" />
                <Bone className="h-4 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Bone className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-3/4" />
            <Bone className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
