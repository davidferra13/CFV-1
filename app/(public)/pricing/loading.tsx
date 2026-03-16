import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function PricingLoading() {
  return (
    <div className="space-y-12 py-16">
      <div className="container mx-auto px-4 text-center space-y-4">
        <Bone className="h-5 w-64 mx-auto" />
        <Bone className="h-10 w-96 mx-auto max-w-full" />
        <Bone className="h-5 w-80 mx-auto max-w-full" />
      </div>
      <div className="container mx-auto px-4">
        <div className="grid gap-5 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-3">
                <Bone className="h-4 w-20" />
                <Bone className="h-8 w-32" />
                <Bone className="h-10 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <Bone key={j} className="h-4 w-full" />
                ))}
                <Bone className="h-10 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
