interface GoalProgressBarProps {
  progressPercent: number
  className?: string
}

export function GoalProgressBar({ progressPercent, className = '' }: GoalProgressBarProps) {
  const capped = Math.min(100, Math.max(0, progressPercent))
  const isOnTrack = progressPercent >= 100

  return (
    <div className={`w-full bg-stone-700 rounded-full h-2 ${className}`}>
      <div
        className={`h-2 rounded-full transition-all duration-500 ${isOnTrack ? 'bg-green-500' : 'bg-brand-500'}`}
        style={{ width: `${capped}%` }}
      />
    </div>
  )
}
