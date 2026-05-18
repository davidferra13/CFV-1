// Loading skeleton for client portal route
import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bone className="h-7 w-52" />
        <Bone className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <Bone className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-2/3" />
                <Bone className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
