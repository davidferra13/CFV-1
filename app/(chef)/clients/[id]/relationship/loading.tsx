import { Card } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function RelationshipLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Bone className="h-4 w-24" />
          <ContextLoader contextId="nav-client-relationship" size="sm" className="mt-2" />
          <Bone className="h-4 w-28 mt-1" />
          <Bone className="h-4 w-80 mt-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Bone className="h-9 w-32 rounded-lg" />
          <Bone className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <Card className="p-6 space-y-3">
        <Bone className="h-6 w-64" />
        <Bone className="h-4 w-full" />
        <Bone className="h-3 w-56" />
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5 space-y-2">
            <Bone className="h-3 w-32" />
            <Bone className="h-7 w-16" />
            <Bone className="h-3 w-48" />
          </Card>
        ))}
      </div>
      <Card className="p-6 space-y-3">
        <Bone className="h-6 w-52" />
        <Bone className="h-4 w-80" />
      </Card>
      <Card className="p-6 space-y-3">
        <Bone className="h-6 w-48" />
        <Bone className="h-4 w-72" />
      </Card>
    </div>
  )
}
