import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function RaffleDetailLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-loyalty-raffle-detail" size="sm" />
      <Bone className="h-4 w-32" />
      <div className="flex items-center gap-3">
        <Bone className="h-8 w-48" />
        <Bone className="h-6 w-20 rounded-full" />
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-3/4" />
          <Bone className="h-4 w-1/2" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
