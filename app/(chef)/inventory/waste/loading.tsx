import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function WasteLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-inventory-waste" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-20" />
        <Bone className="h-8 w-44 mt-1" />
        <Bone className="h-4 w-64 mt-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Bone className="h-3 w-20" />
              <Bone className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Bone className="h-48 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 space-y-4">
          <Bone className="h-5 w-28" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-3 w-20" />
              <Bone className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
