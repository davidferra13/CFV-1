import { ContextLoader } from '@/components/ui/context-loader'

export default function StaffTrustDelegationLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-3">
        <ContextLoader contextId="nav-staff-trust" size="sm" className="items-start py-0" />
        <div className="h-4 w-full max-w-xl rounded bg-stone-800" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-24 rounded-xl border border-stone-800 bg-stone-900" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-900 p-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 rounded-lg bg-stone-800" />
          ))}
        </div>
        <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-900 p-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 rounded-lg bg-stone-800" />
          ))}
        </div>
      </div>
    </div>
  )
}
