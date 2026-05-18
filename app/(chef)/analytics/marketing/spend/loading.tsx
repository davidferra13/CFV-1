import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function MarketingSpendLoading() {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <ContextLoader contextId="nav-marketing-spend" size="sm" className="py-0 items-start" />
      <div className="flex items-center justify-between">
        <div>
          <Bone className="h-4 w-20" />
          <Bone className="h-7 w-48 mt-1" />
          <Bone className="h-4 w-72 mt-1" />
        </div>
        <div className="text-right space-y-1">
          <Bone className="h-3 w-20 ml-auto" />
          <Bone className="h-8 w-24 ml-auto" />
        </div>
      </div>
      <div className="flex gap-2">
        <Bone className="h-8 w-36" />
        <Bone className="h-8 w-28" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Bone className="h-4 w-32" />
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-24" />
              <Bone className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
