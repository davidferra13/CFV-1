import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function MyProfileLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <ContextLoader contextId="nav-settings-my-profile" size="sm" />
        <Bone className="h-4 w-72 mt-2" />
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-4 w-32" />
              <Bone className="h-10 w-full" />
            </div>
          ))}
          <Bone className="h-10 w-40 mt-2" />
        </CardContent>
      </Card>
    </div>
  )
}
