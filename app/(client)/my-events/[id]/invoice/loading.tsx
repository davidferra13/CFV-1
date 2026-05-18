function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function InvoiceLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-36" />
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <div className="flex justify-between">
          <Bone className="h-5 w-32" />
          <Bone className="h-5 w-24" />
        </div>
        <div className="space-y-2 border-t border-stone-700 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Bone className="h-4 w-1/2" />
              <Bone className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-stone-700 pt-4">
          <Bone className="h-5 w-16" />
          <Bone className="h-5 w-24" />
        </div>
      </div>
      <Bone className="h-10 w-full rounded-lg" />
    </div>
  )
}
