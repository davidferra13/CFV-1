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
        <Bone className="h-4 w-72" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-4 w-32" />
              <Bone className="h-10 w-full rounded-md" />
            </div>
          ))}
          <div className="space-y-3 pt-2">
            <Bone className="h-4 w-40" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((j) => (
                <Bone key={j} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          </div>
          <Bone className="h-10 w-32 rounded-md mt-4" />
        </CardContent>
      </Card>
    </div>
  )
}
