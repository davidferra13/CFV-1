import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function IntelligenceLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-intelligence" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-7 w-40" />
        <Bone className="h-4 w-80 mt-1" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 rounded-lg loading-bone loading-bone-dark" />
        ))}
      </div>
    </div>
  )
}
