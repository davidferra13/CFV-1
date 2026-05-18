// Loading skeleton for client portal route
import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bone className="h-7 w-44" />
        <Bone className="h-4 w-64" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Bone className="h-14 w-14 rounded-full shrink-0" />
            <div className="space-y-2">
              <Bone className="h-5 w-36" />
              <Bone className="h-3 w-24" />
            </div>
          </div>
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-3/4" />
          <Bone className="h-10 w-full rounded-md" />
        </CardContent>
      </Card>
    </div>
  )
}
