import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function RepertoireDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Bone className="h-3 w-16 mb-2" />
        <ContextLoader contextId="nav-settings-repertoire-detail" size="sm" />
        <Bone className="h-4 w-72 mt-2" />
      </div>

      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Bone className="h-5 w-40" />
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
