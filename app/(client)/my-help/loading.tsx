// Loading skeleton for client portal route
import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bone className="h-7 w-32" />
        <Bone className="h-4 w-64" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Bone className="h-5 w-2/3" />
              <Bone className="h-5 w-5 rounded shrink-0" />
            </div>
            {i <= 2 && (
              <div className="space-y-2 pt-2">
                <Bone className="h-3 w-full" />
                <Bone className="h-3 w-5/6" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
