import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function ChefsLoading() {
  return (
    <div className="space-y-8 py-16">
      <div className="container mx-auto px-4 text-center space-y-4">
        <Bone className="h-10 w-72 mx-auto" />
        <Bone className="h-5 w-96 mx-auto max-w-full" />
      </div>
      <div className="container mx-auto px-4">
        <div className="flex gap-3 mb-6">
          {[1, 2, 3].map((i) => (
            <Bone key={i} className="h-9 w-28 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Bone className="h-48 w-full rounded-t-xl" />
                <div className="p-4 space-y-3">
                  <Bone className="h-5 w-40" />
                  <Bone className="h-4 w-full" />
                  <Bone className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
