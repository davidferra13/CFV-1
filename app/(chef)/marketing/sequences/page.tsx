// Automated Sequences Page
// Chef creates trigger-based email sequences that fire automatically.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listSequences } from '@/lib/marketing/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SequenceBuilderClient } from './sequence-builder-client'
import { SequenceToggleButton } from './sequence-toggle-button'

export const metadata: Metadata = { title: 'Sequences — ChefFlow' }

const TRIGGER_LABELS: Record<string, string> = {
  birthday:   'Birthday',
  dormant_90: 'Re-engagement (90-day dormant)',
  post_event: 'Post-event follow-up',
  seasonal:   'Seasonal',
}

const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  birthday:   'Fires N days before a client\'s birthday milestone.',
  dormant_90: 'Fires when a client crosses 90 days without an event.',
  post_event: 'Fires N days after an event completes.',
  seasonal:   'Fires on a recurring calendar schedule.',
}

export default async function SequencesPage() {
  await requireChef()
  const sequences = await listSequences()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/marketing" className="text-sm text-stone-500 hover:text-stone-700 mb-2 inline-block">
            ← Marketing
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">Automated Sequences</h1>
          <p className="mt-1 text-sm text-stone-500">
            Set-and-forget emails that fire automatically based on triggers.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600 space-y-1">
        <p className="font-medium text-stone-900">How sequences work</p>
        <p>Each sequence has a trigger (birthday, dormant client, post-event) and one or more email steps. When a client matches the trigger, they&apos;re automatically enrolled and the steps fire in order. Clients who unsubscribe are skipped.</p>
      </div>

      {/* Existing sequences */}
      {sequences.length > 0 && (
        <div className="space-y-3">
          {sequences.map((seq: any) => {
            const steps = seq.sequence_steps ?? []
            const enrollmentCount = seq.sequence_enrollments?.[0]?.count ?? 0
            return (
              <Card key={seq.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-stone-900">{seq.name}</span>
                        <Badge variant={seq.is_active ? 'success' : 'default'}>
                          {seq.is_active ? 'Active' : 'Paused'}
                        </Badge>
                        <Badge variant="default">{TRIGGER_LABELS[seq.trigger_type] ?? seq.trigger_type}</Badge>
                      </div>
                      <p className="text-xs text-stone-500">{TRIGGER_DESCRIPTIONS[seq.trigger_type]}</p>
                      <div className="flex gap-3 text-xs text-stone-400">
                        <span>{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
                        {enrollmentCount > 0 && (
                          <span>{enrollmentCount} client{enrollmentCount !== 1 ? 's' : ''} enrolled</span>
                        )}
                      </div>
                      {/* Step summary */}
                      {steps.length > 0 && (
                        <div className="space-y-0.5 mt-2">
                          {steps
                            .sort((a: any, b: any) => a.step_number - b.step_number)
                            .map((s: any) => (
                              <div key={s.id} className="text-xs text-stone-500 flex gap-2">
                                <span className="text-stone-300">Step {s.step_number}</span>
                                <span>Day +{s.delay_days}:</span>
                                <span className="font-medium text-stone-700 truncate max-w-xs">{s.subject}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <SequenceToggleButton
                      sequenceId={seq.id}
                      isActive={seq.is_active}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {sequences.length === 0 && (
        <p className="text-sm text-stone-500">No sequences yet. Create your first below.</p>
      )}

      {/* Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Sequence</CardTitle>
        </CardHeader>
        <CardContent>
          <SequenceBuilderClient />
        </CardContent>
      </Card>
    </div>
  )
}
