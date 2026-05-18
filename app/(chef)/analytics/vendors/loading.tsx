import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function VendorComparisonLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-vendors" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-28" />
        <div className="flex items-center justify-between mt-1">
          <div>
            <Bone className="h-8 w-56" />
            <Bone className="h-4 w-64 mt-1" />
          </div>
          <Bone className="h-9 w-36" />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="p-4 space-y-3">
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Bone key={i} className="h-8 w-28" />
                ))}
              </div>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex gap-4">
                  <Bone className="h-6 w-40" />
                  <Bone className="h-6 w-20" />
                  <Bone className="h-6 w-20" />
                  <Bone className="h-6 w-20" />
                  <Bone className="h-6 w-20" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
