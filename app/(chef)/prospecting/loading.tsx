import { ContextLoader } from '@/components/ui/context-loader'
import { SkeletonTable } from '@/components/ui/skeleton'

export default function ProspectingLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-leads" size="sm" className="py-0 items-start" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-stone-800 rounded-lg animate-pulse" />
        ))}
      </div>
      <SkeletonTable rows={8} />
    </div>
  )
}
