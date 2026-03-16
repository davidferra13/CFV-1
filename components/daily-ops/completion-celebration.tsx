// CompletionCelebration - Shown when all daily plan items are completed or dismissed.
// The chef's reward: "Go cook. You've earned it."

export function CompletionCelebration() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4" role="img" aria-label="Chef">
        <span className="inline-block animate-bounce">&#x1F468;&#x200D;&#x1F373;</span>
      </div>
      <h2 className="text-xl font-display text-stone-100 mb-2">All clear. Go cook.</h2>
      <p className="text-sm text-stone-500 max-w-sm">
        Everything is handled. Your admin is done, your prep is organized, and your clients are
        taken care of. Time for the creative stuff.
      </p>
    </div>
  )
}
