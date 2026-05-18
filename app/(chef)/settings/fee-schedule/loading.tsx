import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function SettingsFeeScheduleLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Bone className="h-5 w-28" />
        <div className="mt-2">
          <ContextLoader contextId="nav-settings-fee-schedule" size="sm" />
        </div>
        <Bone className="mt-2 h-4 w-full max-w-2xl" />
        <Bone className="mt-2 h-4 w-4/5" />
      </div>

      <Card>
        <CardHeader>
          <Bone className="h-5 w-40" />
          <Bone className="h-3 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((tier) => (
            <div
              key={tier}
              className="grid gap-3 rounded-md border border-stone-800 p-4 sm:grid-cols-3"
            >
              <div className="space-y-2">
                <Bone className="h-3 w-20" />
                <Bone className="h-9 w-full" />
              </div>
              <div className="space-y-2">
                <Bone className="h-3 w-20" />
                <Bone className="h-9 w-full" />
              </div>
              <div className="space-y-2">
                <Bone className="h-3 w-16" />
                <Bone className="h-9 w-full" />
              </div>
            </div>
          ))}
          <Bone className="h-10 w-36" />
        </CardContent>
      </Card>
    </div>
  )
}
