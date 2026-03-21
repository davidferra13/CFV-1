import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function SignUpLoading() {
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <Bone className="h-8 w-32 mx-auto" />
          <Bone className="h-4 w-56 mx-auto" />
        </div>
        <Card>
          <CardHeader>
            <Bone className="h-6 w-36" />
          </CardHeader>
          <CardContent className="space-y-4">
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
    </div>
  )
}
