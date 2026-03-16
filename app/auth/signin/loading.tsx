import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function SignInLoading() {
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <Bone className="h-8 w-32 mx-auto" />
          <Bone className="h-4 w-48 mx-auto" />
        </div>
        <Card>
          <CardHeader>
            <Bone className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Bone className="h-4 w-12" />
              <Bone className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Bone className="h-4 w-16" />
              <Bone className="h-10 w-full rounded-lg" />
            </div>
            <Bone className="h-10 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
