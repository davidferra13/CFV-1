// Prospecting Hub - AI Scrub Page
// Admin-only. Free-form query to generate prospect dossiers.

import type { Metadata } from 'next'
import Link from 'next/link'
import { isAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { getScrubSessions } from '@/lib/prospecting/actions'
import { ScrubForm } from '@/components/prospecting/scrub-form'
import { DeleteScrubSessionButton } from '@/components/prospecting/delete-scrub-session-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'AI Scrub - Prospecting' }

export default async function ScrubPage() {
  await requireChef()
  const admin = await isAdmin()

  if (!admin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-stone-100">AI Lead Scrub</h1>
            <p className="text-stone-400 mt-1">
              AI prospect scrubbing is restricted to platform admins.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const sessions = await getScrubSessions()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/prospecting">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-stone-100">AI Lead Scrub</h1>
          <p className="text-stone-400 mt-1">
            Type any query - AI will research and generate detailed prospect dossiers with real
            contact info
          </p>
        </div>
      </div>

      <ScrubForm />

      {/* Session History */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scrub History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-stone-800 hover:bg-stone-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-100 truncate">
                      &ldquo;{session.query}&rdquo;
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {new Date(session.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-sm text-stone-400">
                      {session.prospect_count} prospects
                      {session.enriched_count > 0 && `, ${session.enriched_count} enriched`}
                    </span>
                    <Badge
                      variant={
                        session.status === 'completed'
                          ? 'success'
                          : session.status === 'failed'
                            ? 'error'
                            : 'warning'
                      }
                    >
                      {session.status}
                    </Badge>
                    <DeleteScrubSessionButton
                      sessionId={session.id}
                      prospectCount={session.prospect_count ?? 0}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
