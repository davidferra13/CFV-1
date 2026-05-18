import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ProductsLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <ContextLoader contextId="nav-commerce-products" size="sm" />
          <Bone className="h-5 w-10 rounded-full" />
        </div>
        <Bone className="h-10 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-stone-800 p-4 space-y-3">
            <Bone className="h-32 w-full rounded-lg" />
            <Bone className="h-5 w-32" />
            <Bone className="h-4 w-20" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
