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
  completionScore: number | null
  prepDays?: PrepDay[]
  groceryDeadline?: string | null
  untimedCount?: number
}

export function OpsPulseCard(_props: Props) {
  return null
}
