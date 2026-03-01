import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function MyEventDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bone className="h-8 w-56" />
        <Bone className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Bone className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-3/4" />
            <Bone className="h-4 w-1/2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Bone className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
