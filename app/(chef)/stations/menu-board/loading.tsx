import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function MenuBoardLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-menu-board" size="sm" className="py-0 items-start" />
      <div className="text-center space-y-2">
        <Bone className="h-10 w-64 mx-auto" />
        <Bone className="h-5 w-48 mx-auto" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Bone className="h-6 w-32" />
              <div className="space-y-2">
                <Bone className="h-5 w-48" />
                <Bone className="h-4 w-full" />
              </div>
              <div className="space-y-2">
                <Bone className="h-5 w-44" />
                <Bone className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
