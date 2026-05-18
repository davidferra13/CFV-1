import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ShiftReportsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <ContextLoader contextId="nav-commerce-reports-shifts" size="sm" />
        <Bone className="h-9 w-24 rounded-lg" />
      </div>
      <Bone className="h-4 w-72" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-stone-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Bone className="h-5 w-40" />
              <Bone className="h-5 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
