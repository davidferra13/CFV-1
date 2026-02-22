// Prospecting Hub — AI Scrub Page
// Admin-only. Free-form query to generate prospect dossiers.

import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { getScrubSessions } from '@/lib/prospecting/actions'
import { ScrubForm } from '@/components/prospecting/scrub-form'
import { DeleteScrubSessionButton } from '@/components/prospecting/delete-scrub-session-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'AI Scrub - Prospecting - ChefFlow' }

export default async function ScrubPage() {
  await requireAdmin()
  await requireChef()

  const sessions = await getScrubSessions()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button href="/prospecting" variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-stone-900">AI Lead Scrub</h1>
          <p className="text-stone-600 mt-1">
            Type any query — AI will research and generate detailed prospect dossiers with real
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
                  className="flex items-center justify-between p-3 rounded-lg border border-stone-100 hover:bg-stone-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">
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
                    <span className="text-sm text-stone-600">
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
