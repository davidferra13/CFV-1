import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function MyServicesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <ContextLoader contextId="nav-settings-my-services" size="sm" />
        <Bone className="h-4 w-72 mt-2" />
      </div>

      {[1, 2].map((section) => (
        <Card key={section}>
          <CardHeader>
            <Bone className="h-5 w-40" />
            <Bone className="h-3 w-64 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center justify-between py-1">
                <div className="space-y-1">
                  <Bone className="h-4 w-36" />
                  <Bone className="h-3 w-52" />
                </div>
                <Bone className="h-8 w-24 shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
