import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function PackMobileLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <ContextLoader contextId="nav-event-pack-mobile" size="sm" />
      <Bone className="h-7 w-40" />
      <Bone className="h-4 w-56" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-stone-800">
            <Bone className="h-5 w-5 rounded" />
            <Bone className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}
