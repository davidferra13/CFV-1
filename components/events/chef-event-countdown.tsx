'use client'

type Props = {
  eventDate: string
  serveTime?: string | null
  status: string
}

/** Placeholder: countdown timer for event detail page */
export function ChefEventCountdown({ eventDate, serveTime, status }: Props) {
  if (status === 'completed' || status === 'cancelled') return null
  return null
}
