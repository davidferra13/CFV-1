import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function PrepSheetLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-prep-sheet" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-32" />
        <Bone className="h-7 w-56 mt-1" />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Bone className="h-5 w-32" />
            <Bone className="h-8 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex gap-4 border-b border-stone-700 pb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Bone key={i} className="h-6 w-24" />
              ))}
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex gap-4 py-2">
                <Bone className="h-5 w-36" />
                <Bone className="h-5 w-16" />
                <Bone className="h-5 w-16" />
                <Bone className="h-5 w-24" />
                <Bone className="h-5 w-6 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
