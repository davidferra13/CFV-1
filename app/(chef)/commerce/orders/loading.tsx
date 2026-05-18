import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function OrdersLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <ContextLoader contextId="nav-commerce-orders" size="sm" />
        <Bone className="h-4 w-56 mt-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-stone-800 p-4 space-y-3">
            <Bone className="h-5 w-24" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="rounded-lg border border-stone-800 p-3 space-y-2">
                <Bone className="h-4 w-28" />
                <Bone className="h-3 w-20" />
                <Bone className="h-3 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
