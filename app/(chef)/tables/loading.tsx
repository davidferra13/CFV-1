export default function TablesLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div
        className="border-b border-stone-800 p-6 pb-0"
        style={{
          background: 'linear-gradient(180deg, rgba(237,168,107,0.08) 0%, transparent 100%)',
        }}
      >
        <div className="h-8 w-32 bg-stone-800 rounded mb-2" />
        <div className="h-4 w-64 bg-stone-800/60 rounded mb-5" />
        <div className="flex gap-3 pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-[52px] h-[52px] rounded-full bg-stone-800" />
              <div className="w-12 h-3 bg-stone-800/60 rounded" />
            </div>
          ))}
        </div>
        <div className="flex gap-4 pb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-stone-800/40 rounded" />
          ))}
        </div>
      </div>
      <div className="p-6 max-w-[1200px]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-stone-800/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-stone-800/50" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-stone-800/50" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
