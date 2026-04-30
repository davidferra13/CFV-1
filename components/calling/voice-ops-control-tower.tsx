import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Mic,
  PhoneCall,
  ShieldAlert,
  Users,
  XCircle,
} from '@/components/ui/icons'
import { VoicePostCallActionRow } from '@/components/calling/voice-post-call-action-row'
import type { VoiceOpsReport } from '@/lib/calling/voice-ops-types'

export function VoiceOpsControlTower({ report }: { report: VoiceOpsReport }) {
  const stats = [
    {
      label: 'Active',
      value: report.activeCalls,
      icon: Activity,
      tone: 'text-sky-300',
    },
    {
      label: 'Done',
      value: report.completedCalls,
      icon: CheckCircle,
      tone: 'text-emerald-300',
    },
    {
      label: 'Failed',
      value: report.failedCalls,
      icon: XCircle,
      tone: 'text-rose-300',
    },
    {
      label: 'Answer rate',
      value: `${report.answerRate}%`,
      icon: PhoneCall,
      tone: 'text-amber-300',
    },
    {
      label: 'Recordings',
      value: report.recordingCount,
      icon: Mic,
      tone: 'text-violet-300',
    },
    {
      label: 'Reviews',
      value: report.unresolvedDecisionCount,
      icon: ClipboardList,
      tone: 'text-orange-300',
    },
  ]

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-semibold text-stone-100">Voice Ops Control Tower</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Live proof for call status, recordings, follow-up work, opt-outs, and professionalism
            risk.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Users className="h-3.5 w-3.5" />
          {report.totalCalls} session{report.totalCalls === 1 ? '' : 's'} watched
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-stone-800 bg-stone-900 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-stone-500">{label}</span>
              <Icon className={`h-3.5 w-3.5 ${tone}`} />
            </div>
            <div className="mt-1 text-lg font-semibold text-stone-100">{value}</div>
          </div>
        ))}
      </div>

      {(report.missingRecordingCount > 0 ||
        report.optOutCount > 0 ||
        report.urgentReviewCount > 0 ||
        report.snoozedActions.length > 0 ||
        report.professionalRisks.length > 0) && (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <SignalRow
            label="Recording gaps"
            value={report.missingRecordingCount}
            detail="Finished sessions without a recording URL."
          />
          <SignalRow
            label="Opt-outs"
            value={report.optOutCount}
            detail="Numbers that should not receive AI assistant calls."
          />
          <SignalRow
            label="Urgent reviews"
            value={report.urgentReviewCount}
            detail="Dietary, safety, or high-risk follow-up."
          />
          <SignalRow
            label="Snoozed"
            value={report.snoozedActions.length}
            detail="Follow-up hidden until its next review window."
          />
          <SignalRow
            label="Professional risk"
            value={report.professionalRisks.length}
            detail="Calls with trust, disclosure, or hang-up risk."
          />
        </div>
      )}

      {report.failedRecoveryActions.length > 0 && (
        <ActionSection
          title="Failed-call recovery"
          detail="Unresolved busy, failed, no-answer, voicemail, or missing-recording items."
          actions={report.failedRecoveryActions}
        />
      )}

      {report.topNextActions.length > 0 && (
        <ActionSection
          title="Next actions"
          detail="Open follow-up work with source and compliance evidence."
          actions={report.topNextActions}
        />
      )}

      {report.snoozedActions.length > 0 && (
        <ActionSection
          title="Snoozed"
          detail="Hidden follow-up with an explicit return window."
          actions={report.snoozedActions}
        />
      )}
    </section>
  )
}

function ActionSection({
  title,
  detail,
  actions,
}: {
  title: string
  detail: string
  actions: VoiceOpsReport['topNextActions']
}) {
  return (
    <div className="mt-4 border-t border-stone-800 pt-3">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          <ClipboardList className="h-3.5 w-3.5" />
          {title}
        </div>
        <p className="text-xs text-stone-600">{detail}</p>
      </div>
      <div className="space-y-2">
        {actions.map((action, index) => (
          <VoicePostCallActionRow key={`${action.type}-${action.id ?? index}`} action={action} />
        ))}
      </div>
    </div>
  )
}

function SignalRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  if (value === 0) return null
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-900/60 bg-amber-950/20 px-3 py-2">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
      <div>
        <p className="text-xs font-medium text-amber-200">
          {value} {label}
        </p>
        <p className="mt-0.5 text-xs text-stone-500">{detail}</p>
      </div>
    </div>
  )
}
