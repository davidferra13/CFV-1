import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <Bone className="h-8 w-32" />
        <Bone className="h-4 w-64" />
      </div>
      <div className="flex justify-end">
        <Bone className="h-9 w-28 rounded-md" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Bone className="h-5 w-40" />
              <Bone className="h-4 w-56" />
            </CardHeader>
            <CardContent className="flex gap-4">
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
