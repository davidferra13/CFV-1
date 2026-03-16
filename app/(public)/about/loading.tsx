function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function AboutLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 space-y-8">
      <div className="text-center space-y-4">
        <Bone className="h-10 w-64 mx-auto" />
        <Bone className="h-5 w-96 mx-auto max-w-full" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Bone key={i} className="h-4 w-full" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )
}
