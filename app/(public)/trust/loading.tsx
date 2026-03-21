import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function TrustLoading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16 space-y-8">
      <div className="text-center space-y-4">
        <Bone className="h-10 w-56 mx-auto" />
        <Bone className="h-5 w-96 mx-auto max-w-full" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <Bone className="h-8 w-8 rounded" />
              <Bone className="h-5 w-32" />
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
