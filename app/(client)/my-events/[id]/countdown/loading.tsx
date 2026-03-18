function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function CountdownLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-40" />
      <div className="flex justify-center gap-6 py-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center space-y-2">
            <Bone className="h-16 w-16 mx-auto rounded-xl" />
            <Bone className="h-3 w-12 mx-auto" />
          </div>
        ))}
      </div>
      <Bone className="h-4 w-2/3 mx-auto" />
    </div>
  )
}
