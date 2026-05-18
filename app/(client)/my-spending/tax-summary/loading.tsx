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
          <Bone className="h-5 w-36" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Bone className="h-4 w-1/2" />
              <Bone className="h-4 w-20" />
            </div>
          ))}
          <div className="border-t pt-3 flex items-center justify-between">
            <Bone className="h-5 w-28" />
            <Bone className="h-5 w-24" />
          </div>
        </CardContent>
      </Card>
      <Bone className="h-10 w-44 rounded-md" />
    </div>
  )
}
