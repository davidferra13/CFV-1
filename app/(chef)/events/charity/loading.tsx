import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function CharityLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-events-charity" size="sm" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-36 rounded-lg" />
          <Bone className="h-9 w-44 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center space-y-2">
              <Bone className="h-7 w-12 mx-auto" />
              <Bone className="h-3 w-20 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Bone className="h-5 w-40" />
              <Bone className="h-5 w-8 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
