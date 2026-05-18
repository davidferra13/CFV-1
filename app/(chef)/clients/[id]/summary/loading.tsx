import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ClientSummaryLoading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Bone className="h-4 w-28" />
          <ContextLoader contextId="nav-client-summary" size="sm" className="mt-1" />
          <Bone className="h-4 w-56 mt-1" />
        </div>
        <Bone className="h-9 w-20 rounded-lg" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Bone className="h-16 w-16 rounded-full shrink-0" />
            <div className="space-y-2">
              <Bone className="h-6 w-48" />
              <Bone className="h-4 w-36" />
              <Bone className="h-4 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-stone-800 last:border-0"
            >
              <div className="space-y-1">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-5/6" />
          <Bone className="h-4 w-4/5" />
        </CardContent>
      </Card>
    </div>
  )
}
