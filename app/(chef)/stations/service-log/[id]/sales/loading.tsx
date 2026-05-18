import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function SalesEntryLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-sales-entry" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-32" />
        <Bone className="h-7 w-56 mt-2" />
        <Bone className="h-4 w-32 mt-1" />
      </div>
      <Card>
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 space-y-1">
                <Bone className="h-4 w-36" />
              </div>
              <Bone className="h-8 w-20" />
              <Bone className="h-8 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Bone className="h-10 w-32" />
    </div>
  )
}
