import { Card } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ReferralsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-4 w-16" />
        <div className="flex items-center gap-3 mt-1">
          <ContextLoader contextId="nav-clients-loyalty-referrals" size="sm" />
          <Bone className="h-5 w-28 rounded-full" />
        </div>
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 text-center space-y-1">
            <Bone className="h-7 w-12 mx-auto" />
            <Bone className="h-3 w-28 mx-auto" />
            <Bone className="h-3 w-36 mx-auto" />
          </Card>
        ))}
      </div>
      <div>
        <Bone className="h-4 w-36 mb-3" />
        <Card className="p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Bone className="h-5 w-40 rounded-full" />
                <Bone className="h-3 w-10" />
                <Bone className="h-4 w-20" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
