// Financials Loading Skeleton — stat cards + ledger panels
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function FinancialsLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-40" />

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4 space-y-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-8 w-28" />
              <Bone className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Bone className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center justify-between">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-4 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full-width ledger */}
      <Card>
        <CardHeader>
          <Bone className="h-5 w-44" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-stone-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div className="space-y-1 flex-1">
                  <Bone className="h-4 w-48" />
                  <Bone className="h-3 w-32" />
                </div>
                <Bone className="h-4 w-20 ml-4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
