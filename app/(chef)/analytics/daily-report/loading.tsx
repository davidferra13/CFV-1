import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function DailyReportLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <ContextLoader contextId="nav-daily-report" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-7 w-40" />
        <Bone className="h-4 w-56 mt-1" />
      </div>
      <div className="flex gap-2">
        <Bone className="h-8 w-28" />
        <Bone className="h-8 w-32" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-3">
            <Bone className="h-5 w-36" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
