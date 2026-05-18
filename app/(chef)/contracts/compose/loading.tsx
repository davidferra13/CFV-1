import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ContractsComposeLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <ContextLoader contextId="nav-contracts-compose" size="sm" />
          <Bone className="mt-2 h-4 w-80 max-w-full" />
        </div>
        <Bone className="h-5 w-28" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <Bone className="h-5 w-44" />
            <Bone className="h-3 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((clause) => (
              <div
                key={clause}
                className="flex items-start gap-3 rounded-md border border-stone-800 p-4"
              >
                <Bone className="h-4 w-4 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-48" />
                  <Bone className="h-3 w-full" />
                  <Bone className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Bone className="h-5 w-32" />
            <Bone className="h-3 w-44" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Bone className="h-24 w-full" />
            <Bone className="h-10 w-full" />
            <Bone className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
