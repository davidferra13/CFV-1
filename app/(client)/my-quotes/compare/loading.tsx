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
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Bone className="h-4 w-20" />
            <Bone className="h-4 w-24" />
            <Bone className="h-4 w-24" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid grid-cols-3 gap-4">
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-full" />
            </div>
          ))}
          <div className="border-t pt-3 grid grid-cols-3 gap-4">
            <Bone className="h-5 w-16" />
            <Bone className="h-5 w-20" />
            <Bone className="h-5 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
