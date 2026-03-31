'use client'

import { useState, useTransition } from 'react'
import { updateCheckpoint, skipCheckpoint, getMissingInfoDraftEmail } from '@/lib/lifecycle/actions'

interface ProgressCheckpoint {
  checkpointKey: string
  checkpointLabel: string
  stageNumber: number
  status: string
  isRequired: boolean
  clientVisible: boolean
  clientLabel: string | null
  detectedAt: string | null
  confirmedAt: string | null
  confirmedBy: string | null
  evidenceType: string | null
  evidenceExcerpt: string | null
  extractedData: any
  notes: string | null
}

interface StageProgress {
  stageNumber: number
  stageName: string
  total: number
  completed: number
  checkpoints: ProgressCheckpoint[]
}

interface LifecycleProgressPanelProps {
  inquiryId?: string
  eventId?: string
  stages: StageProgress[]
  overallPercent: number
  currentStage: number
  nextActions: string[]
}

const STAGE_LABELS: Record<string, string> = {
  inquiry_received: 'Inquiry',
  discovery: 'Discovery',
  quote: 'Quote',
  agreement: 'Agreement',
  menu_planning: 'Menu',
  pre_service: 'Pre-Service',
  payment: 'Payment',
  service_day: 'Service Day',
  post_service: 'Post-Service',
  client_lifecycle: 'Retention',
}

const STAGE_COLORS: Record<number, string> = {
  1: 'bg-blue-500',
  2: 'bg-amber-500',
  3: 'bg-orange-500',
  4: 'bg-rose-500',
  5: 'bg-purple-500',
  6: 'bg-indigo-500',
  7: 'bg-emerald-500',
  8: 'bg-teal-500',
  9: 'bg-cyan-500',
  10: 'bg-stone-500',
}

function CheckpointStatusIcon({ status }: { status: string }) {
  if (status === 'confirmed') {
    return (
      <svg className="h-4 w-4 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  if (status === 'auto_detected') {
    return (
      <svg className="h-4 w-4 text-amber-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  if (status === 'skipped' || status === 'not_applicable') {
    return (
      <svg className="h-4 w-4 text-stone-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  // not_started
  return <div className="h-4 w-4 rounded-full border-2 border-stone-600 shrink-0" />
}

function CheckpointRow({
  checkpoint,
  inquiryId,
  eventId,
  onUpdate,
}: {
  checkpoint: ProgressCheckpoint
  inquiryId?: string
  eventId?: string
  onUpdate: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [showActions, setShowActions] = useState(false)

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await updateCheckpoint(
          inquiryId || null,
          eventId || null,
          checkpoint.checkpointKey,
          'confirmed'
        )
        onUpdate()
      } catch (err) {
        console.error('Failed to confirm checkpoint:', err)
      }
    })
  }

  const handleSkip = () => {
    startTransition(async () => {
      try {
        await skipCheckpoint(
          inquiryId || null,
          eventId || null,
          checkpoint.checkpointKey,
          'Skipped by chef'
        )
        onUpdate()
      } catch (err) {
        console.error('Failed to skip checkpoint:', err)
      }
    })
  }

  const handleReset = () => {
    startTransition(async () => {
      try {
        await updateCheckpoint(
          inquiryId || null,
          eventId || null,
          checkpoint.checkpointKey,
          'not_started'
        )
        onUpdate()
      } catch (err) {
        console.error('Failed to reset checkpoint:', err)
      }
    })
  }

  const isClickable = checkpoint.status === 'not_started' || checkpoint.status === 'auto_detected'
  const isSkipped = checkpoint.status === 'skipped' || checkpoint.status === 'not_applicable'

  return (
    <div
      className={`group flex items-start gap-2 py-1.5 px-2 rounded-md transition-colors ${
        isPending ? 'opacity-50' : ''
      } ${isClickable ? 'hover:bg-stone-800/50 cursor-pointer' : ''}`}
      onClick={isClickable ? handleConfirm : undefined}
      onContextMenu={(e) => {
        e.preventDefault()
        setShowActions(!showActions)
      }}
    >
      <CheckpointStatusIcon status={checkpoint.status} />

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isSkipped ? 'text-stone-600 line-through' : 'text-stone-300'}`}>
          {checkpoint.checkpointLabel}
          {checkpoint.isRequired && checkpoint.status === 'not_started' && (
            <span className="text-red-400 ml-1 text-xs">required</span>
          )}
          {checkpoint.status === 'auto_detected' && (
            <span className="text-amber-400 ml-1 text-xs">(auto-detected, click to confirm)</span>
          )}
        </p>

        {checkpoint.evidenceExcerpt && (
          <p className="text-xs text-stone-500 mt-0.5 truncate">{checkpoint.evidenceExcerpt}</p>
        )}

        {showActions && (
          <div className="flex gap-2 mt-1">
            {checkpoint.status !== 'confirmed' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleConfirm()
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Confirm
              </button>
            )}
            {checkpoint.status !== 'skipped' && checkpoint.status !== 'not_applicable' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSkip()
                }}
                className="text-xs text-stone-500 hover:text-stone-400"
              >
                Skip
              </button>
            )}
            {checkpoint.status !== 'not_started' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleReset()
                }}
                className="text-xs text-stone-500 hover:text-stone-400"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function LifecycleProgressPanel({
  inquiryId,
  eventId,
  stages,
  overallPercent,
  currentStage,
  nextActions,
}: LifecycleProgressPanelProps) {
  const [expandedStages, setExpandedStages] = useState<Set<number>>(() => {
    const initial = new Set<number>()
    initial.add(currentStage)
    if (currentStage < 10) initial.add(currentStage + 1)
    return initial
  })
  const [emailDraft, setEmailDraft] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [, setRefreshKey] = useState(0)

  const toggleStage = (stageNum: number) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stageNum)) {
        next.delete(stageNum)
      } else {
        next.add(stageNum)
      }
      return next
    })
  }

  const handleDraftEmail = async () => {
    if (!inquiryId) return
    setEmailLoading(true)
    try {
      const result = await getMissingInfoDraftEmail(inquiryId)
      setEmailDraft(result.draft)
    } catch (err) {
      console.error('Failed to draft email:', err)
    } finally {
      setEmailLoading(false)
    }
  }

  const handleUpdate = () => {
    setRefreshKey((k) => k + 1)
  }

  if (stages.length === 0) {
    return null
  }

  // Count missing required items across stages 1-3
  const missingRequired = stages
    .filter((s) => s.stageNumber <= 3)
    .flatMap((s) => s.checkpoints)
    .filter((cp) => cp.isRequired && cp.status === 'not_started')

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-stone-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-stone-200">Service Lifecycle</h3>
          <span className="text-sm text-stone-400">{overallPercent}% complete</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-stone-800 rounded-full overflow-hidden flex">
          {stages.map((stage) => {
            const stagePercent =
              stage.total > 0
                ? (stage.completed / stages.reduce((s, st) => s + st.total, 0)) * 100
                : 0
            if (stagePercent === 0) return null
            return (
              <div
                key={stage.stageNumber}
                className={`${STAGE_COLORS[stage.stageNumber] || 'bg-stone-600'} transition-all`}
                style={{ width: `${stagePercent}%` }}
              />
            )
          })}
        </div>

        {/* Stage pills */}
        <div className="flex flex-wrap gap-1 mt-3">
          {stages.map((stage) => {
            const isActive = stage.stageNumber === currentStage
            const percent = stage.total > 0 ? Math.round((stage.completed / stage.total) * 100) : 0
            return (
              <button
                key={stage.stageNumber}
                onClick={() => toggleStage(stage.stageNumber)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  isActive
                    ? 'bg-stone-700 text-stone-200 ring-1 ring-stone-600'
                    : percent === 100
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-stone-800 text-stone-500 hover:text-stone-400'
                }`}
              >
                {STAGE_LABELS[stage.stageName] || `Stage ${stage.stageNumber}`}
                {percent > 0 && percent < 100 && (
                  <span className="ml-1 text-stone-600">{percent}%</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Expanded stages */}
      <div className="divide-y divide-stone-800/50">
        {stages.map((stage) => {
          if (!expandedStages.has(stage.stageNumber)) return null

          return (
            <div key={stage.stageNumber} className="p-3">
              <button
                onClick={() => toggleStage(stage.stageNumber)}
                className="w-full flex items-center justify-between mb-2"
              >
                <span className="text-xs font-medium text-stone-400">
                  Stage {stage.stageNumber}: {STAGE_LABELS[stage.stageName] || stage.stageName}
                  <span className="text-stone-600 ml-2">
                    {stage.completed}/{stage.total}
                  </span>
                </span>
                <svg className="h-4 w-4 text-stone-600" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <div className="space-y-0.5">
                {stage.checkpoints.map((cp) => (
                  <CheckpointRow
                    key={cp.checkpointKey}
                    checkpoint={cp}
                    inquiryId={inquiryId}
                    eventId={eventId}
                    onUpdate={handleUpdate}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Missing info + draft email */}
      {missingRequired.length > 0 && inquiryId && (
        <div className="p-4 border-t border-stone-800">
          <div className="mb-2">
            <span className="text-xs font-medium text-stone-400">Missing (blocks next stage)</span>
          </div>
          <ul className="space-y-1 mb-3">
            {missingRequired.slice(0, 5).map((cp) => (
              <li
                key={cp.checkpointKey}
                className="text-xs text-red-400/80 flex items-center gap-1"
              >
                <span className="text-red-500">*</span> {cp.checkpointLabel}
              </li>
            ))}
            {missingRequired.length > 5 && (
              <li className="text-xs text-stone-600">+{missingRequired.length - 5} more</li>
            )}
          </ul>

          <button
            onClick={handleDraftEmail}
            disabled={emailLoading}
            className="w-full text-xs py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors disabled:opacity-50"
          >
            {emailLoading ? 'Drafting...' : 'Draft Email for Missing Info'}
          </button>

          {emailDraft && (
            <div className="mt-3 p-3 bg-stone-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-stone-400">Email Draft</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(emailDraft)
                  }}
                  className="text-xs text-stone-500 hover:text-stone-400"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-stone-300 whitespace-pre-wrap">{emailDraft}</p>
            </div>
          )}
        </div>
      )}

      {/* Next actions */}
      {nextActions.length > 0 && missingRequired.length === 0 && (
        <div className="p-4 border-t border-stone-800">
          <span className="text-xs font-medium text-stone-400 block mb-2">Next Actions</span>
          <ul className="space-y-1">
            {nextActions.map((action, i) => (
              <li key={i} className="text-xs text-stone-300">
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
