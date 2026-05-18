import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function StorefrontLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Bone className="h-3 w-24" />
          <ContextLoader contextId="nav-commerce-storefront" size="sm" className="mt-2" />
          <Bone className="h-4 w-96 mt-2" />
        </div>
        <Bone className="h-12 w-40 rounded-xl" />
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[1.6rem] border border-stone-800 bg-stone-950/70 p-5 space-y-2"
          >
            <Bone className="h-3 w-28" />
            <Bone className="h-8 w-16" />
          </div>
        ))}
      </div>
      <Bone className="h-64 w-full rounded-lg" />
    </div>
  )
}
