import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function MyEventsLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <Bone className="h-5 w-48" />
              <Bone className="h-4 w-32" />
              <Bone className="h-3 w-24" />
              <div className="flex gap-2 pt-2">
                <Bone className="h-6 w-16 rounded-full" />
                <Bone className="h-6 w-20 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
