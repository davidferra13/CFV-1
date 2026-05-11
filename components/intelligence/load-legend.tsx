// Color legend for operational load levels

const LEVELS = [
  { label: 'Empty', color: 'bg-stone-800', textColor: 'text-stone-500' },
  { label: 'Light', color: 'bg-emerald-600', textColor: 'text-emerald-400' },
  { label: 'Moderate', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  { label: 'Heavy', color: 'bg-orange-500', textColor: 'text-orange-400' },
  { label: 'Overloaded', color: 'bg-red-500', textColor: 'text-red-400' },
] as const

export function LoadLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex ${compact ? 'gap-2' : 'gap-3'} flex-wrap`}>
      {LEVELS.map((level) => (
        <div key={level.label} className="flex items-center gap-1.5">
          <div className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-sm ${level.color}`} />
          <span className={`${compact ? 'text-[10px]' : 'text-xs'} ${level.textColor}`}>
            {level.label}
          </span>
        </div>
      ))}
    </div>
  )
}
