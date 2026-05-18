import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function CancelledLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-4 w-20" />
        <div className="flex items-center gap-3 mt-1">
          <Bone className="h-8 w-52" />
          <Bone className="h-5 w-8 rounded-full" />
        </div>
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <ContextLoader contextId="nav-events-cancelled" size="sm" />
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-4 px-6 py-3 border-b border-stone-800">
            <Bone className="h-3 w-24" />
            <Bone className="h-3 w-16" />
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-16" />
            <Bone className="h-3 w-24" />
            <Bone className="h-3 w-16" />
          </div>
          <div className="divide-y divide-stone-800">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-48" />
                </div>
                <Bone className="h-4 w-24" />
                <Bone className="h-4 w-28" />
                <Bone className="h-6 w-20 rounded-full" />
                <Bone className="h-4 w-20" />
                <Bone className="h-8 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
