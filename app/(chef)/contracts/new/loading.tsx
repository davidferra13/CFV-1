import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ContextLoader contextId="nav-contracts-new" size="sm" />
      <Bone className="h-4 w-28" />
      <Bone className="h-8 w-56" />
      <Bone className="h-4 w-72" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-4 w-24" />
            <Bone className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Bone className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  )
}
