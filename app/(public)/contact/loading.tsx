import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ContactLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 space-y-8">
      <div className="text-center space-y-4">
        <Bone className="h-10 w-64 mx-auto" />
        <Bone className="h-5 w-80 mx-auto max-w-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Bone className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Bone className="h-4 w-20" />
                  <Bone className="h-10 w-full rounded-lg" />
                </div>
              ))}
              <Bone className="h-10 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <Bone className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Bone className="h-10 w-10 rounded-lg shrink-0" />
                <div className="space-y-2 flex-1">
                  <Bone className="h-4 w-20" />
                  <Bone className="h-3 w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
