import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-loyalty-learn" size="sm" />
      <Bone className="h-4 w-32" />
      <Bone className="h-8 w-64" />
      <Bone className="h-4 w-96" />
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-5 w-48" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  )
}
