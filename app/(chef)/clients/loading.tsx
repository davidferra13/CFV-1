// Clients Loading Skeleton
// Shown immediately while the server fetches the client list.

import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <ContextLoader contextId="nav-clients" size="sm" className="py-0 items-start" />
        <div className="flex gap-2">
          <Bone className="h-9 w-48" />
          <Bone className="h-9 w-28" />
        </div>
      </div>

      {/* Client list */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-stone-800">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div key={i} className="flex items-center space-x-4 px-6 py-4">
                <Bone className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-44" />
                  <Bone className="h-3 w-32" />
                </div>
                <Bone className="h-4 w-20" />
                <Bone className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
