import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <Bone className="h-8 w-48" />
        <Bone className="h-4 w-72" />
      </div>
      <div className="flex gap-1 rounded-lg bg-stone-800/50 p-1">
        <Bone className="h-9 flex-1 rounded-md" />
        <Bone className="h-9 flex-1 rounded-md" />
        <Bone className="h-9 flex-1 rounded-md" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bone className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Bone className="h-4 w-28" />
                  <Bone className="h-3 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
