import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function MenuDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <ContextLoader contextId="nav-culinary-menu-detail" size="sm" />
      <div className="flex items-center justify-between mb-4">
        <Bone className="h-8 w-24 rounded-lg" />
        <div className="flex items-center gap-2">
          <Bone className="h-8 w-24 rounded-lg" />
          <Bone className="h-8 w-28 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-4">
          <Bone className="h-48 w-full rounded-xl" />
          <Card>
            <CardContent className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-4 w-4 rounded" />
                  <Bone className="h-4 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Bone className="h-4 w-40" />
                  <Bone className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="hidden lg:block w-72 flex-shrink-0 space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Bone className="h-4 w-24" />
                <Bone className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
