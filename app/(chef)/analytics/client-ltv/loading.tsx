import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ClientLTVLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-client-ltv" size="sm" className="py-0 items-start" />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Bone className="h-4 w-20" />
          <Bone className="h-8 w-40 mt-1" />
          <Bone className="h-4 w-72 mt-1" />
        </div>
        <Bone className="h-9 w-32" />
      </div>
      <div className="flex gap-2">
        <Bone className="h-8 w-28" />
        <Bone className="h-8 w-36" />
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <Bone className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Bone className="h-4 w-6" />
              <div className="flex-1 space-y-1">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-5 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
