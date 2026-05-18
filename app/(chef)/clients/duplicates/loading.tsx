import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function DuplicatesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <ContextLoader contextId="nav-clients-duplicates" size="sm" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-8">
                  <div className="space-y-1">
                    <Bone className="h-4 w-32" />
                    <Bone className="h-3 w-40" />
                  </div>
                  <Bone className="h-6 w-4 self-center" />
                  <div className="space-y-1">
                    <Bone className="h-4 w-32" />
                    <Bone className="h-3 w-40" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Bone className="h-5 w-36 rounded-full" />
                  <div className="flex gap-2">
                    <Bone className="h-8 w-24" />
                    <Bone className="h-8 w-24" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
