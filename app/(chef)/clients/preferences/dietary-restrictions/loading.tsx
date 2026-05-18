import { Card } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function DietaryRestrictionsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-4 w-32" />
        <div className="flex items-center gap-3 mt-1">
          <ContextLoader contextId="nav-clients-preferences-dietary" size="sm" />
          <Bone className="h-5 w-20 rounded-full" />
        </div>
        <Bone className="h-4 w-80 mt-1" />
      </div>
      <Card className="p-4">
        <Bone className="h-4 w-36 mb-3" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Bone key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </Card>
      <Card>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-stone-800 last:border-0"
            >
              <div className="space-y-1">
                <Bone className="h-4 w-28" />
                <Bone className="h-3 w-36" />
              </div>
              <div className="flex gap-1.5">
                <Bone className="h-5 w-16 rounded-full" />
                <Bone className="h-5 w-16 rounded-full" />
              </div>
              <Bone className="h-3 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
