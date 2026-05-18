import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function WasteLogLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-waste" size="sm" className="py-0 items-start" />
      <Bone className="h-4 w-32" />
      <div className="flex items-start justify-between">
        <div>
          <Bone className="h-7 w-32" />
          <Bone className="h-4 w-72 mt-1" />
        </div>
        <Bone className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-28" />
        </CardHeader>
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3">
              <Bone className="h-6 w-16 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Bone className="h-4 w-32" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
