import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function PrintOrderSheetLoading() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <ContextLoader contextId="nav-orders-print" size="sm" className="py-0 items-start" />
      <div className="text-center space-y-2">
        <Bone className="h-8 w-48 mx-auto" />
        <Bone className="h-4 w-32 mx-auto" />
      </div>
      <div className="space-y-1">
        <div className="flex gap-2 border-b border-stone-700 pb-2">
          {[1, 2, 3, 4].map((i) => (
            <Bone key={i} className="h-6 w-32" />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex gap-2 py-1">
            <Bone className="h-6 w-40" />
            <Bone className="h-6 w-20" />
            <Bone className="h-6 w-16" />
            <Bone className="h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
