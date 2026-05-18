import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function VipClientsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-4 w-20" />
        <div className="flex items-center gap-3 mt-1">
          <ContextLoader contextId="nav-clients-vip" size="sm" />
          <Bone className="h-5 w-10 rounded-full" />
        </div>
        <Bone className="h-4 w-64 mt-1" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center space-x-4">
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
