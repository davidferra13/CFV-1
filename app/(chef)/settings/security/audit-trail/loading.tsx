import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function AuditTrailLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <ContextLoader contextId="nav-settings-security-audit-trail" size="sm" />
        <Bone className="h-4 w-72 mt-2" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-stone-800">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div className="space-y-1">
                  <Bone className="h-4 w-44" />
                  <Bone className="h-3 w-32" />
                </div>
                <Bone className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
