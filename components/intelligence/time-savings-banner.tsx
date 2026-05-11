'use client'

interface Props {
  totalSavedMinutes: number
  eventsCovered: number
  totalPrepMinutes: number
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function TimeSavingsBanner({ totalSavedMinutes, eventsCovered, totalPrepMinutes }: Props) {
  if (totalSavedMinutes <= 0) return null

  return (
    <div className="rounded-lg border border-emerald-800/50 bg-gradient-to-r from-emerald-950/40 to-emerald-900/20 px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-emerald-300">
            Save {formatMinutes(totalSavedMinutes)} this week
          </p>
          <p className="text-sm text-emerald-400/70 mt-0.5">
            By consolidating prep across {eventsCovered} events
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-300">{eventsCovered}</p>
            <p className="text-xs text-emerald-500">events</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-stone-100">{formatMinutes(totalPrepMinutes)}</p>
            <p className="text-xs text-stone-400">batch prep</p>
          </div>
        </div>
      </div>
    </div>
  )
}
