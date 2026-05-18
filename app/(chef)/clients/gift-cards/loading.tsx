import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function GiftCardsLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <ContextLoader contextId="nav-clients-gift-cards" size="sm" />
          <Bone className="h-4 w-72 mt-1" />
        </div>
        <Bone className="h-10 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-5 space-y-2">
              <Bone className="h-7 w-16" />
              <Bone className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b border-stone-800 last:border-0"
              >
                <div className="space-y-1">
                  <Bone className="h-4 w-24" />
                  <Bone className="h-3 w-16" />
                </div>
                <Bone className="h-4 w-20" />
                <Bone className="h-4 w-16" />
                <Bone className="h-5 w-14 rounded-full" />
                <Bone className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
