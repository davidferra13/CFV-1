import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function KnowledgeLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-knowledge" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-64 mt-1" />
      </div>
      <div className="flex gap-2">
        <Bone className="h-10 w-full max-w-md" />
        <Bone className="h-10 w-24" />
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 p-3 rounded-lg border border-stone-800">
              <div className="flex items-center gap-2">
                <Bone className="h-5 w-16 rounded-full" />
                <Bone className="h-4 w-32" />
              </div>
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
