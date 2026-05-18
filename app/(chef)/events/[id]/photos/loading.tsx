import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function PhotosLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <ContextLoader contextId="nav-event-photos" size="sm" />
      <div className="mb-6">
        <Bone className="h-4 w-28" />
      </div>
      <div className="mb-8">
        <Bone className="h-8 w-56" />
        <Bone className="h-4 w-80 mt-2" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Bone key={i} className="aspect-square w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
