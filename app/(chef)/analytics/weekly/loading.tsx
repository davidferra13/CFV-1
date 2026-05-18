import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function WeeklyLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-weekly" size="sm" className="py-0 items-start" />
      <div className="print:hidden">
        <Bone className="h-8 w-56" />
        <Bone className="h-4 w-64 mt-1" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-stone-700 bg-stone-900 p-4 space-y-2">
            <Bone className="h-3 w-16" />
            <Bone className="h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border border-stone-700 bg-stone-900 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Bone className="h-5 w-40" />
              <Bone className="h-5 w-20" />
            </div>
            <Bone className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
