import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ClipboardLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-clipboard" size="sm" className="py-0 items-start" />
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bone className="h-4 w-16" />
            <Bone className="h-4 w-4" />
            <Bone className="h-4 w-24" />
          </div>
          <Bone className="h-8 w-52 mt-1" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-28" />
          <Bone className="h-9 w-24" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Bone key={i} className="h-8 w-24" />
              ))}
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex gap-2">
                <Bone className="h-10 w-40" />
                {[1, 2, 3, 4, 5].map((j) => (
                  <Bone key={j} className="h-10 w-24" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
