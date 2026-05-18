import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function DataQualityLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <ContextLoader contextId="nav-settings-data-quality" size="sm" />
        <Bone className="h-4 w-72 mt-2" />
      </div>

      {[1, 2, 3].map((section) => (
        <Card key={section}>
          <CardHeader>
            <Bone className="h-5 w-44" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((row) => (
              <div key={row} className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <Bone className="h-4 w-40" />
                  <Bone className="h-3 w-56" />
                </div>
                <Bone className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
