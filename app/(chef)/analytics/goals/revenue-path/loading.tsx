import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function RevenuePathLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <ContextLoader contextId="nav-revenue-path" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-28 mb-4" />
        <Bone className="h-8 w-48" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <Bone className="h-6 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-3 w-20" />
              <Bone className="h-8 w-24" />
            </div>
          ))}
        </div>
        <Bone className="h-64 w-full" />
      </div>
    </div>
  )
}
