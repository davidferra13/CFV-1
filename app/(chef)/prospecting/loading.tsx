import { SkeletonTable } from '@/components/ui/skeleton'

export default function ProspectingLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-stone-200 rounded animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-stone-100 rounded-lg animate-pulse" />
        ))}
      </div>
      <SkeletonTable rows={8} />
    </div>
  )
}
