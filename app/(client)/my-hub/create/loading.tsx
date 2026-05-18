// Loading skeleton for client portal route
import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-64" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-4 w-28" />
              <Bone className="h-10 w-full rounded-md" />
            </div>
          ))}
          <Bone className="h-10 w-36 rounded-md mt-4" />
        </CardContent>
      </Card>
    </div>
  )
}
