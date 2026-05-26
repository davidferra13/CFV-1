const LAYER_META: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-500/60' },
  tactical: { label: 'Tactical', color: 'text-amber-500/60' },
  safety: { label: 'Safety Net', color: 'text-emerald-500/60' },
  strategic: { label: 'Strategic', color: 'text-blue-500/60' },
  intelligence: { label: 'Intelligence', color: 'text-violet-500/60' },
  activity: { label: 'Activity', color: 'text-stone-500/60' },
  utility: { label: 'Utility', color: 'text-stone-600/60' },
}

export function LayerDivider({ layer }: { layer: string }) {
  const meta = LAYER_META[layer]
  if (!meta) return null

  return (
    <div className="flex items-center gap-3 pt-4 pb-1">
      <div className="h-px flex-1 bg-stone-800/50" />
      <span className={`text-[10px] font-medium uppercase tracking-widest ${meta.color}`}>
        {meta.label}
      </span>
      <div className="h-px flex-1 bg-stone-800/50" />
    </div>
  )
}
