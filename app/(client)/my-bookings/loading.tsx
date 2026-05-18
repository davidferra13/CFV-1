// Loading skeleton for client portal route
import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bone className="h-7 w-40" />
        <Bone className="h-4 w-56" />
      </div>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center gap-4">
            <Bone className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-3/4" />
              <Bone className="h-3 w-1/2" />
            </div>
            <Bone className="h-6 w-16 rounded-full shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
