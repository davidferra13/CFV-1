import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function MyKitchenLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-culinary-my-kitchen" size="sm" />
      <div>
        <Bone className="h-4 w-20" />
        <Bone className="h-8 w-48 mt-1" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Bone className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-3/4" />
            <Bone className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
