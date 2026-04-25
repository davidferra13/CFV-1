import type { DinnerCircleLayoutZone, DinnerCircleTimelineItem } from '@/lib/dinner-circles/types'

type CircleEventPlanLayout = {
  name: string
  zones: DinnerCircleLayoutZone[]
  timeline: DinnerCircleTimelineItem[]
  chefNotes: string
}

type CircleEventPlanProps = {
  layout: CircleEventPlanLayout | undefined
}

const KIND_LABELS: Record<DinnerCircleLayoutZone['kind'], string> = {
  kitchen: 'Kitchen',
  prep: 'Prep Area',
  service: 'Service Station',
  guest: 'Guest Area',
  storage: 'Storage',
  path: 'Flow Path',
}

const KIND_CLASSES: Record<DinnerCircleLayoutZone['kind'], string> = {
  kitchen: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  prep: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  service: 'border-green-500/30 bg-green-500/10 text-green-200',
  guest: 'border-purple-500/30 bg-purple-500/10 text-purple-200',
  storage: 'border-stone-500/30 bg-stone-500/10 text-stone-200',
  path: 'border-teal-500/30 bg-teal-500/10 text-teal-200',
}

function KindBadge({ kind, label }: { kind: DinnerCircleLayoutZone['kind']; label?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${KIND_CLASSES[kind]}`}
    >
      {label ?? KIND_LABELS[kind]}
    </span>
  )
}

export function CircleEventPlan({ layout }: CircleEventPlanProps) {
  const zones = layout?.zones ?? []
  const timeline = layout?.timeline ?? []

  if (!layout || (zones.length === 0 && timeline.length === 0)) {
    return null
  }

  const zonesById = new Map(zones.map((zone) => [zone.id, zone]))

  return (
    <div className="space-y-6 p-4">
      {timeline.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-stone-200">The Flow</h3>
          <div className="space-y-3">
            {timeline.map((item, index) => {
              const zone = item.zoneId ? zonesById.get(item.zoneId) : undefined

              return (
                <div
                  key={`${item.time}-${item.title}-${index}`}
                  className="grid grid-cols-[4.5rem_1fr] gap-3 rounded-xl border border-stone-800 bg-stone-900/50 p-3"
                >
                  <div className="text-sm font-bold text-stone-100">{item.time}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-stone-200">{item.title}</p>
                      {zone && <KindBadge kind={zone.kind} label={zone.label} />}
                    </div>
                    {item.notes && <p className="mt-1 text-xs text-stone-500">{item.notes}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {zones.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-stone-200">The Space</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {zones.map((zone) => (
              <div key={zone.id} className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-medium text-stone-200">{zone.label}</p>
                  <KindBadge kind={zone.kind} />
                </div>
                {zone.notes && (
                  <p className="mt-2 text-xs leading-5 text-stone-500">{zone.notes}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
