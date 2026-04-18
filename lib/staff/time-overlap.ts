/**
 * Check if two events on the same day have overlapping time windows.
 * Events without serve_time are treated as all-day (always conflict).
 * Default duration is 3 hours if no departure_time.
 */
export function eventsOverlapInTime(
  existingEvent: { serve_time?: string | null; departure_time?: string | null },
  newServeTime?: string | null,
  newDepartureTime?: string | null
): boolean {
  // If either event has no serve_time, assume all-day (conflict)
  if (!existingEvent.serve_time || !newServeTime) return true

  const toMinutes = (t: string): number => {
    const [h, m] = t.slice(0, 5).split(':').map(Number)
    return h * 60 + m
  }

  const existStart = toMinutes(existingEvent.serve_time)
  const existEnd = existingEvent.departure_time
    ? toMinutes(existingEvent.departure_time)
    : existStart + 180 // default 3h

  const newStart = toMinutes(newServeTime)
  const newEnd = newDepartureTime ? toMinutes(newDepartureTime) : newStart + 180

  // Two ranges overlap if one starts before the other ends
  return existStart < newEnd && newStart < existEnd
}
