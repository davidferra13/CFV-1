import { Card } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function NotesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-4 w-28" />
        <div className="flex items-center gap-3 mt-1">
          <ContextLoader contextId="nav-clients-communication-notes" size="sm" />
          <Bone className="h-5 w-16 rounded-full" />
        </div>
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 space-y-1">
          <Bone className="h-7 w-10" />
          <Bone className="h-3 w-32" />
        </Card>
        <Card className="p-4 space-y-1">
          <Bone className="h-7 w-10" />
          <Bone className="h-3 w-28" />
        </Card>
      </div>
      <div className="space-y-3">
        <Bone className="h-4 w-36" />
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-32" />
                <Bone className="h-3 w-40" />
                <Bone className="h-4 w-full" />
              </div>
              <Bone className="h-3 w-8" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
