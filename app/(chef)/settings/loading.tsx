// Settings Loading Skeleton — sectioned form layout
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Bone className="h-8 w-28" />
        <Bone className="h-4 w-64 mt-2" />
      </div>

      {/* Settings sections */}
      {[1, 2, 3].map((section) => (
        <Card key={section}>
          <CardHeader>
            <Bone className="h-5 w-44" />
            <Bone className="h-3 w-72 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center justify-between py-1">
                <div className="space-y-1">
                  <Bone className="h-4 w-40" />
                  <Bone className="h-3 w-56" />
                </div>
                <Bone className="h-8 w-24 shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Quick links grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4 space-y-1">
              <Bone className="h-4 w-28" />
              <Bone className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
