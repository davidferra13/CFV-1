// Timeline View Component — displays a day-of event timeline
// Server component — no client-side state needed.

import type { EventTimeline } from '@/lib/scheduling/types'

const TYPE_COLORS: Record<string, string> = {
  wake: 'bg-purple-100 text-purple-800 border-purple-200',
  prep: 'bg-brand-100 text-brand-800 border-brand-200',
  shopping: 'bg-green-100 text-green-800 border-green-200',
  packing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  departure: 'bg-orange-100 text-orange-800 border-orange-200',
  arrival: 'bg-red-100 text-red-800 border-red-200',
  service: 'bg-red-100 text-red-800 border-red-200',
  milestone: 'bg-stone-100 text-stone-800 border-stone-200',
}

function getCurrentTimePosition(timeline: EventTimeline['timeline']): string | null {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const currentMinutes = h * 60 + m
  const currentTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

  // Check if current time falls within the timeline window
  if (timeline.length < 2) return null

  const firstTime = parseTimeToMinutes(timeline[0].time)
  const lastTime = parseTimeToMinutes(timeline[timeline.length - 1].time)

  if (currentMinutes >= firstTime && currentMinutes <= lastTime) {
    return currentTime
  }
  return null
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function TimelineView({ timeline }: { timeline: EventTimeline }) {
  const currentTime = getCurrentTimePosition(timeline.timeline)

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {timeline.warnings.length > 0 && (
        <div className="space-y-2">
          {timeline.warnings.map((warning, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-stone-200" />

        <div className="space-y-0">
          {timeline.timeline.map((item, index) => {
            const colorClass = TYPE_COLORS[item.type] || TYPE_COLORS.milestone
            const isCurrentOrNext = currentTime !== null &&
              index > 0 &&
              parseTimeToMinutes(timeline.timeline[index - 1].time) <= parseTimeToMinutes(currentTime) &&
              parseTimeToMinutes(item.time) > parseTimeToMinutes(currentTime)

            return (
              <div key={item.id} className="relative">
                {/* Current time indicator */}
                {isCurrentOrNext && (
                  <div className="relative flex items-center py-1 pl-2">
                    <div className="w-3 h-3 rounded-full bg-brand-600 ring-2 ring-brand-200 z-10" />
                    <div className="ml-4 text-xs font-medium text-brand-600">NOW ({currentTime})</div>
                    <div className="flex-1 ml-2 h-px bg-brand-300" />
                  </div>
                )}

                <div className={`flex items-start gap-4 py-3 px-2 rounded-lg ${item.isDeadline ? 'bg-stone-50' : ''}`}>
                  {/* Time dot */}
                  <div className={`flex-shrink-0 w-3 h-3 mt-1.5 rounded-full ${item.isDeadline ? 'bg-red-500' : 'bg-stone-400'} z-10`} />

                  {/* Time */}
                  <div className="w-14 flex-shrink-0">
                    <span className={`text-sm font-mono ${item.isDeadline ? 'font-bold text-stone-900' : 'text-stone-600'}`}>
                      {item.time}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${item.isDeadline ? 'text-stone-900' : 'text-stone-700'}`}>
                        {item.label}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                        {item.type}
                      </span>
                      {item.isFlexible && (
                        <span className="text-xs text-stone-400">flexible</span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500 mt-0.5">{item.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Route */}
      {timeline.route.stops.length > 0 && (
        <div className="border-t border-stone-200 pt-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Route Plan</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <span className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium">H</span>
              <span>Home</span>
            </div>
            {timeline.route.stops.map((stop, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-medium text-stone-900">{stop.name}</div>
                  {stop.address && (
                    <div className="text-xs text-stone-500">{stop.address}</div>
                  )}
                  <div className="text-xs text-stone-400">
                    {stop.purpose} {stop.estimatedMinutes > 0 && `- ~${stop.estimatedMinutes} min`}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-stone-500 mt-4">
            Total estimated drive time: {timeline.route.totalDriveMinutes} min
          </p>
        </div>
      )}
    </div>
  )
}
