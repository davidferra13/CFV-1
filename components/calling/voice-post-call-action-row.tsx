'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  completeVoicePostCallAction,
  markVoicePostCallActionNeedsReview,
  skipVoicePostCallAction,
  snoozeVoicePostCallAction,
  unsnoozeVoicePostCallAction,
} from '@/lib/calling/voice-ops-actions'
import type { VoicePostCallAction } from '@/lib/calling/voice-ops-types'

export function VoicePostCallActionRow({ action }: { action: VoicePostCallAction }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)
  const tone =
    action.urgency === 'urgent'
      ? 'border-rose-800 bg-rose-950/20 text-rose-200'
      : action.urgency === 'review'
        ? 'border-amber-800 bg-amber-950/20 text-amber-200'
        : 'border-stone-800 bg-stone-900 text-stone-200'

  const canClose = !!action.id && action.status !== 'completed' && action.status !== 'skipped'
  const isSnoozed = action.evidence?.closeoutIntent === 'snoozed' || !!action.evidence?.snoozedUntil
  const evidence = action.evidence

  function runAction(
    label: string,
    actionFn: (actionId: string, note?: string) => Promise<{ success: boolean; error?: string }>,
    options: { promptForNote?: boolean } = {}
  ) {
    if (!action.id) return
    startTransition(async () => {
      const note = options.promptForNote ? window.prompt('Optional closeout note')?.trim() : undefined
      const result = await actionFn(action.id!, note)
      if (!result.success) {
        const message = result.error ?? `Failed to ${label.toLowerCase()} action.`
        setFeedback(message)
        toast.error(message)
        return
      }
      const message = `Action ${label.toLowerCase()}.`
      setFeedback(message)
      toast.success(message)
      router.refresh()
    })
  }

  return (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-semibold">{action.label}</p>
            {evidence && <ProvenanceBadge source={evidence.source} />}
            {isSnoozed && <StatusBadge label="Snoozed" />}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">{action.detail}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded border border-current px-2 py-1 text-[10px] uppercase tracking-wide opacity-70">
            {action.urgency}
          </span>
          {canClose && (
            <>
              <ActionButton
                label="Done"
                disabled={isPending}
                onClick={() =>
                  runAction('completed', completeVoicePostCallAction, { promptForNote: true })
                }
              />
              {action.status !== 'needs_review' && (
                <ActionButton
                  label="Review"
                  disabled={isPending}
                  onClick={() =>
                    runAction('marked for review', markVoicePostCallActionNeedsReview, {
                      promptForNote: true,
                    })
                  }
                />
              )}
              <ActionButton
                label="Snooze"
                disabled={isPending}
                onClick={() =>
                  runAction('snoozed', snoozeVoicePostCallAction, { promptForNote: true })
                }
              />
              <ActionButton
                label="Skip"
                disabled={isPending}
                onClick={() => runAction('skipped', skipVoicePostCallAction, { promptForNote: true })}
              />
            </>
          )}
          {action.id && isSnoozed && (
            <ActionButton
              label="Unsnooze"
              disabled={isPending}
              onClick={() => runAction('unsnoozed', unsnoozeVoicePostCallAction)}
            />
          )}
        </div>
      </div>

      {feedback && <p className="mt-2 text-[11px] text-stone-300">{feedback}</p>}

      {evidence && (
        <details className="mt-3 rounded border border-stone-800 bg-stone-950/50 px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Why this exists
          </summary>
          <dl className="mt-3 grid gap-2 text-xs text-stone-400 md:grid-cols-2">
            <EvidenceItem label="Source" value={labelize(evidence.source)} />
            <EvidenceItem label="Reason" value={evidence.reason} />
            <EvidenceItem label="Haptic" value={evidence.hapticReason} />
            <EvidenceItem label="Duplicate guard" value={evidence.duplicatePolicy} />
            <EvidenceItem label="AI call" value={evidence.aiCallId ?? 'Not linked'} />
            <EvidenceItem label="Supplier call" value={evidence.supplierCallId ?? 'Not linked'} />
            <EvidenceItem label="Target" value={evidence.target ?? 'No target record'} />
            <EvidenceItem label="Created" value={formatDate(evidence.createdAt)} />
            {evidence.completedAt && (
              <EvidenceItem label="Closed" value={formatDate(evidence.completedAt)} />
            )}
            {evidence.snoozedUntil && (
              <EvidenceItem label="Snoozed until" value={formatDate(evidence.snoozedUntil)} />
            )}
            {evidence.closeoutNote && <EvidenceItem label="Closeout note" value={evidence.closeoutNote} />}
          </dl>
          {evidence.trustChecklist.length > 0 && (
            <TrustChecklist items={evidence.trustChecklist} />
          )}
          {evidence.complianceSignals.length > 0 && (
            <EvidenceList title="Compliance ledger" items={evidence.complianceSignals} />
          )}
          {evidence.eventTypes.length > 0 && (
            <EvidenceList title="Session events" items={evidence.eventTypes.map(labelize)} />
          )}
          {evidence.scriptQuality && (
            <EvidenceList
              title="Script quality"
              items={[
                `Launch gate: ${evidence.scriptQuality.allowedToLaunch ? 'allowed' : 'blocked'}`,
                `Risk: ${evidence.scriptQuality.level ?? 'unknown'}`,
                `Score: ${evidence.scriptQuality.score ?? 'unknown'}`,
                ...evidence.scriptQuality.requiredFixes,
              ]}
            />
          )}
        </details>
      )}
    </div>
  )
}

function ProvenanceBadge({ source }: { source: string }) {
  return <StatusBadge label={labelize(source)} />
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded border border-stone-700 bg-stone-950 px-2 py-0.5 text-[10px] uppercase tracking-wide text-stone-400">
      {label}
    </span>
  )
}

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-stone-700 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-stone-300 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  )
}

function EvidenceItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-stone-600">{label}</dt>
      <dd className="mt-0.5 break-words text-stone-300">{value}</dd>
    </div>
  )
}

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <p className="text-[10px] uppercase tracking-wide text-stone-600">{title}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item}
            className="rounded border border-stone-800 bg-stone-900 px-2 py-1 text-[11px] text-stone-300"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function TrustChecklist({
  items,
}: {
  items: NonNullable<VoicePostCallAction['evidence']>['trustChecklist']
}) {
  return (
    <div className="mt-3">
      <p className="text-[10px] uppercase tracking-wide text-stone-600">Trust checklist</p>
      <div className="mt-1 grid gap-1 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded border border-stone-800 bg-stone-900 px-2 py-1 text-[11px] text-stone-300"
          >
            <span
              className={
                item.status === 'passed'
                  ? 'text-emerald-300'
                  : item.status === 'missing'
                    ? 'text-rose-300'
                    : 'text-stone-500'
              }
            >
              {item.status}
            </span>{' '}
            {item.label}
            <p className="mt-0.5 text-stone-500">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function labelize(value: string): string {
  return value.replace(/_/g, ' ')
}

function formatDate(value: string | undefined): string {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
