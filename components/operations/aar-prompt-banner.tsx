import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { AARStatus } from '@/lib/operations/aar-auto-trigger'

export function AARPromptBanner({ status }: { status: AARStatus }) {
  if (!status.shouldPrompt) return null

  return (
    <Card className="border-emerald-500/30 bg-emerald-950/20">
      <CardContent className="py-3 px-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-400">
            Service complete: {status.eventName ?? 'Event'}
          </p>
          <p className="text-xs text-stone-400">
            File your after-action review while details are fresh.
          </p>
        </div>
        <Link href={`/events/${status.eventId}/aar`}>
          <Button size="sm">Start AAR</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
