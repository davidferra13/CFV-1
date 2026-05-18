import { Card } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function LoyaltyLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-4 w-16" />
        <ContextLoader contextId="nav-clients-loyalty" size="sm" className="mt-1" />
        <Bone className="h-4 w-64 mt-1" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 space-y-1">
            <Bone className="h-7 w-16" />
            <Bone className="h-3 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="p-5">
            <Bone className="h-8 w-8 mb-2" />
            <Bone className="h-5 w-20" />
            <Bone className="h-3 w-full mt-1" />
          </Card>
        ))}
      </div>
    </div>
  )
}
