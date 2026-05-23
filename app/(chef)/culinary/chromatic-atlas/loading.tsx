export default function ChromaticAtlasLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-stone-800 bg-stone-950 p-5">
        <div className="h-5 w-52 rounded bg-stone-800" />
        <div className="mt-3 h-9 w-full max-w-2xl rounded bg-stone-800" />
        <div className="mt-3 h-4 w-full max-w-3xl rounded bg-stone-900" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="h-28 rounded-lg border border-stone-800 bg-stone-950 p-4">
            <div className="h-8 w-8 rounded-full bg-stone-800" />
            <div className="mt-4 h-4 w-24 rounded bg-stone-800" />
            <div className="mt-2 h-3 w-full rounded bg-stone-900" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-stone-800 bg-stone-950 p-5">
        <div className="h-5 w-44 rounded bg-stone-800" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="h-72 rounded bg-stone-900" />
          <div className="h-72 rounded bg-stone-900" />
        </div>
      </div>
    </div>
  )
}
