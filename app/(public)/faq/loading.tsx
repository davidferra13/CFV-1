function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function FAQLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 space-y-8">
      <div className="text-center space-y-4">
        <Bone className="h-10 w-64 mx-auto" />
        <Bone className="h-5 w-96 mx-auto max-w-full" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="rounded-xl border border-stone-700 bg-stone-900/70 p-4">
            <Bone className="h-5 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
