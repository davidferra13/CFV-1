import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function SegmentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <ContextLoader contextId="nav-clients-segments" size="sm" />
          <Bone className="h-4 w-56 mt-1" />
        </div>
      </div>
      <Bone className="h-40 w-full rounded-lg" />
      <div className="space-y-3">
        <Bone className="h-5 w-32" />
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Bone className="w-3 h-3 rounded-full" />
                <div className="space-y-1">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-3 w-48" />
                </div>
              </div>
              <div className="flex gap-2">
                <Bone className="h-5 w-16 rounded-full" />
                <Bone className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
