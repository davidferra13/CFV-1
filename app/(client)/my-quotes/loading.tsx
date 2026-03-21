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
      <Card>
        <CardContent className="p-6 space-y-4">
          <Bone className="h-5 w-48" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-3/4" />
          <Bone className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  )
}
