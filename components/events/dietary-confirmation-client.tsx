import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'

type DietaryConfirmationClientProps = {
  confirmation: {
    confirmed_at: string
    dietary_snapshot: {
      allergies: string[]
      dietary_restrictions: string[]
      dietary_protocols?: string[]
    }
    client_message: string | null
  } | null
  eventDate: string
}

function summarizeSnapshot(snapshot: {
  allergies: string[]
  dietary_restrictions: string[]
  dietary_protocols?: string[]
}) {
  return [...(snapshot.allergies ?? []), ...(snapshot.dietary_restrictions ?? []), ...(snapshot.dietary_protocols ?? [])].filter(Boolean)
}

export function DietaryConfirmationClient({
  confirmation,
  eventDate,
}: DietaryConfirmationClientProps) {
  if (confirmation) {
    const confirmedItems = summarizeSnapshot(confirmation.dietary_snapshot)

    return (
      <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">Dietary Needs Confirmed</Badge>
          <span className="text-xs text-stone-400">
            {new Date(confirmation.confirmed_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
        {confirmation.client_message && <p className="text-sm text-stone-200">{confirmation.client_message}</p>}
        {confirmedItems.length > 0 && (
          <p className="text-sm text-stone-400">Confirmed: {confirmedItems.join(', ')}</p>
        )}
      </div>
    )
  }

  const isUpcoming = new Date(eventDate).getTime() >= new Date(new Date().toDateString()).getTime()
  if (!isUpcoming) {
    return null
  }

  return (
    <Alert variant="warning">
      <div className="space-y-1">
        <p className="font-medium">Your chef is reviewing your dietary requirements</p>
        <p className="text-sm text-stone-400">
          Once they confirm your accommodations, you will see that acknowledgment here.
        </p>
      </div>
    </Alert>
  )
}
