'use client'

type PrepDay = {
  label: string
  itemCount: number
  totalMinutes: number
  isPast: boolean
  isToday: boolean
}

type Props = {
  eventDate: string
  serveTime?: string | null
  status: string
  completionScore: number
  prepDays?: PrepDay[]
  groceryDeadline?: string | null
  untimedCount?: number
}

/** Placeholder: ops pulse card for event detail */
export function OpsPulseCard(_props: Props) {
  return null
}
