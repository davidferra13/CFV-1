import { Card } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function CharityHoursLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Bone className="h-4 w-24 mb-3" />
        <Bone className="h-8 w-44" />
        <Bone className="h-4 w-64 mt-2" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 text-center space-y-2">
            <Bone className="h-8 w-10 mx-auto" />
            <Bone className="h-3 w-16 mx-auto" />
          </Card>
        ))}
      </div>

      {/* Form skeleton */}
      <Card className="p-5 space-y-3">
        <Bone className="h-5 w-32" />
        <Bone className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Bone className="h-10 w-full" />
          <Bone className="h-10 w-full" />
        </div>
        <Bone className="h-16 w-full" />
        <Bone className="h-10 w-24" />
      </Card>

      {/* Search skeleton */}
      <Card className="p-5 space-y-3">
        <Bone className="h-5 w-48" />
        <Bone className="h-10 w-full" />
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <Bone key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </Card>

      {/* List skeleton */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-800">
          <Bone className="h-4 w-40" />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-3 border-b border-stone-800 last:border-0"
          >
            <div className="space-y-1.5">
              <Bone className="h-4 w-48" />
              <Bone className="h-3 w-32" />
            </div>
            <Bone className="h-4 w-12" />
          </div>
        ))}
      </Card>
    </div>
  )
}
