function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function CompareLoading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16 space-y-8">
      <div className="text-center space-y-4">
        <Bone className="h-10 w-72 mx-auto" />
        <Bone className="h-5 w-96 mx-auto max-w-full" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-stone-700 bg-stone-900/70 p-6">
        <div className="space-y-4">
          <div className="flex gap-4">
            <Bone className="h-6 w-40" />
            <Bone className="h-6 w-24" />
            <Bone className="h-6 w-24" />
            <Bone className="h-6 w-24" />
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex gap-4">
              <Bone className="h-5 w-40" />
              <Bone className="h-5 w-24" />
              <Bone className="h-5 w-24" />
              <Bone className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
