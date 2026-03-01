import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function QueueLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-48" />
      <Bone className="h-10 w-full rounded-lg" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <Bone className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2" />
              </div>
              <Bone className="h-6 w-16 rounded-full shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
