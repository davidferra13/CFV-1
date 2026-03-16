// Charity Hub Loading Skeleton - header + stat cards + 4 collapsible sections
import { ContextLoader } from '@/components/ui/context-loader'
import { Card } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function CharityLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <ContextLoader contextId="nav-dashboard" size="sm" className="py-0 items-start" />
        <Bone className="h-4 w-80 mt-2" />
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 text-center space-y-2">
            <Bone className="h-8 w-10 mx-auto" />
            <Bone className="h-3 w-16 mx-auto" />
          </Card>
        ))}
      </div>

      {/* Section skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Bone className="h-5 w-48" />
              <Bone className="h-5 w-8 rounded-full" />
            </div>
            <Bone className="h-4 w-4" />
          </div>
          <div className="px-5 pb-4 border-t border-stone-800 space-y-3 pt-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center justify-between py-2">
                <div className="space-y-1.5">
                  <Bone className="h-4 w-52" />
                  <Bone className="h-3 w-32" />
                </div>
                <Bone className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
