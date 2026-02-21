// Off-hours notification suppression
// Pure function — no 'use server', no DB access

export const BYPASS_ACTIONS = [
  'payment_overdue',
  'event_reminder_1d',
  'insurance_expiring_7d',
  'cert_expiring_7d',
] as const

export function isOffHours(
  settings: {
    off_hours_start: string | null // TIME like "22:00"
    off_hours_end: string | null // TIME like "08:00"
    off_days: string[] | null // ['saturday', 'sunday']
  },
  now: Date
): boolean {
  if (
    !settings.off_hours_start &&
    !settings.off_hours_end &&
    (!settings.off_days || settings.off_days.length === 0)
  ) {
    return false
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const currentDay = dayNames[now.getDay()]

  if (settings.off_days?.includes(currentDay)) return true

  if (settings.off_hours_start && settings.off_hours_end) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const [startH, startM] = settings.off_hours_start.split(':').map(Number)
    const [endH, endM] = settings.off_hours_end.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (startMinutes <= endMinutes) {
      // Same-day range (e.g., 12:00 to 14:00)
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return true
    } else {
      // Overnight range (e.g., 22:00 to 08:00)
      if (currentMinutes >= startMinutes || currentMinutes < endMinutes) return true
    }
  }

  return false
}
