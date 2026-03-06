'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface CircleRebookButtonProps {
  groupId: string
  groupName: string
}

/**
 * "Book another dinner with this crew" button.
 * Shown on event summary page after a completed event that's linked to a circle.
 * Links to the booking form with the circle pre-selected.
 */
export function CircleRebookButton({ groupId, groupName }: CircleRebookButtonProps) {
  const router = useRouter()

  return (
    <Button
      variant="primary"
      onClick={() => router.push(`/book-now?circleId=${groupId}`)}
      className="w-full sm:w-auto"
    >
      Book another dinner with {groupName}
    </Button>
  )
}
