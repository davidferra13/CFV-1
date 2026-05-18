import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function TableServiceLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-commerce-table-service" size="sm" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Bone className="h-5 w-16" />
                <Bone className="h-5 w-16 rounded-full" />
              </div>
              <Bone className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
