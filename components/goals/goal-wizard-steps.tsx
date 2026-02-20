'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign, TrendingUp, Calendar, ChefHat,
  Users, BookOpen, Percent, PieChart, Check, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { GoalType, NudgeLevel, CreateGoalInput } from '@/lib/goals/types'
import { GOAL_TYPE_META } from '@/lib/goals/types'
import { createGoal } from '@/lib/goals/actions'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign, TrendingUp, Calendar, ChefHat, Users, BookOpen, Percent, PieChart,
}

// ── Step 1: Goal type selection ───────────────────────────────────────────────

function StepGoalType({
  selected,
  onSelect,
}: {
  selected: GoalType | null
  onSelect: (t: GoalType) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">What do you want to track?</h2>
        <p className="text-sm text-stone-500 mt-1">Choose a goal type to get started.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOAL_TYPE_META.map((meta) => {
          const Icon = ICON_MAP[meta.icon] ?? DollarSign
          const isSelected = selected === meta.type
          return (
            <button
              key={meta.type}
              onClick={() => onSelect(meta.type)}
              className={`text-left rounded-lg border-2 p-4 transition-all hover:border-brand-400 ${
                isSelected
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-stone-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${isSelected ? 'bg-brand-100' : 'bg-stone-100'}`}>
                  <Icon className={`h-5 w-5 ${isSelected ? 'text-brand-600' : 'text-stone-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 text-sm">{meta.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{meta.description}</p>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 2: Target and period ─────────────────────────────────────────────────

type PeriodPreset = 'this_month' | 'this_year' | 'custom'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function thisMonthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function thisMonthEnd() {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return last.toISOString().slice(0, 10)
}

function thisYearStart() {
  return `${new Date().getFullYear()}-01-01`
}

function thisYearEnd() {
  return `${new Date().getFullYear()}-12-31`
}

function defaultLabel(goalType: GoalType): string {
  const d = new Date()
  const month = d.toLocaleString('en-US', { month: 'long' })
  const year = d.getFullYear()
  const labels: Record<GoalType, string> = {
    revenue_monthly:  `${month} Revenue Goal`,
    revenue_annual:   `${year} Revenue Goal`,
    revenue_custom:   'Custom Revenue Goal',
    booking_count:    `${month} Booking Goal`,
    new_clients:      `${month} New Clients`,
    recipe_library:   'Recipe Library Goal',
    profit_margin:    'Profit Margin Target',
    expense_ratio:    'Expense Ratio Target',
  }
  return labels[goalType] ?? 'My Goal'
}

function StepTarget({
  goalType,
  label, onLabelChange,
  targetRaw, onTargetChange,
  periodPreset, onPeriodPresetChange,
  periodStart, onPeriodStartChange,
  periodEnd, onPeriodEndChange,
}: {
  goalType: GoalType
  label: string; onLabelChange: (v: string) => void
  targetRaw: string; onTargetChange: (v: string) => void
  periodPreset: PeriodPreset; onPeriodPresetChange: (v: PeriodPreset) => void
  periodStart: string; onPeriodStartChange: (v: string) => void
  periodEnd: string; onPeriodEndChange: (v: string) => void
}) {
  const isRevenue = goalType === 'revenue_monthly' || goalType === 'revenue_annual' || goalType === 'revenue_custom'
  const isPercent = goalType === 'profit_margin' || goalType === 'expense_ratio'
  const inputPlaceholder = isRevenue ? '10000' : isPercent ? '65' : '10'
  const inputLabel = isRevenue ? 'Target ($)' : isPercent ? 'Target (%)' : 'Target count'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Set your target</h2>
        <p className="text-sm text-stone-500 mt-1">Give the goal a name and define what you want to hit.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Goal name</label>
          <input
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            maxLength={100}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{inputLabel}</label>
          <div className="relative">
            {isRevenue && (
              <span className="absolute inset-y-0 left-3 flex items-center text-stone-400 text-sm">$</span>
            )}
            {isPercent && (
              <span className="absolute inset-y-0 right-3 flex items-center text-stone-400 text-sm">%</span>
            )}
            <input
              type="number"
              value={targetRaw}
              onChange={(e) => onTargetChange(e.target.value)}
              min={0}
              step={isRevenue ? 100 : isPercent ? 1 : 1}
              placeholder={inputPlaceholder}
              className={`w-full rounded-md border border-stone-300 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${isRevenue ? 'pl-7 pr-3' : isPercent ? 'pl-3 pr-7' : 'px-3'}`}
            />
          </div>
          {isRevenue && <p className="text-xs text-stone-400 mt-1">Enter the dollar amount (e.g. 10000 for $10,000)</p>}
          {isPercent && <p className="text-xs text-stone-400 mt-1">Enter a percentage (e.g. 65 for 65%)</p>}
        </div>

        {/* Period */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Period</label>
          <div className="flex gap-2">
            {(['this_month', 'this_year', 'custom'] as PeriodPreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => onPeriodPresetChange(preset)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  periodPreset === preset
                    ? 'bg-brand-600 text-white'
                    : 'border border-stone-300 text-stone-600 hover:border-brand-400'
                }`}
              >
                {preset === 'this_month' ? 'This month' : preset === 'this_year' ? 'This year' : 'Custom range'}
              </button>
            ))}
          </div>
          {periodPreset === 'custom' && (
            <div className="mt-2 flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-stone-500 mb-1">Start</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => onPeriodStartChange(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-stone-500 mb-1">End</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => onPeriodEndChange(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Reminders ─────────────────────────────────────────────────────────

function StepReminders({
  nudgeEnabled, onNudgeEnabledChange,
  nudgeLevel, onNudgeLevelChange,
}: {
  nudgeEnabled: boolean; onNudgeEnabledChange: (v: boolean) => void
  nudgeLevel: NudgeLevel; onNudgeLevelChange: (v: NudgeLevel) => void
}) {
  const levels: { value: NudgeLevel; label: string; description: string }[] = [
    { value: 'gentle', label: 'Gentle', description: 'Only notify if you are significantly behind.' },
    { value: 'standard', label: 'Standard', description: 'Notify when behind and suggest next steps.' },
    { value: 'aggressive', label: 'Aggressive', description: 'Daily nudges and client outreach suggestions every run.' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">How should we push you?</h2>
        <p className="text-sm text-stone-500 mt-1">ChefFlow can send you regular reminders and recommendations to help you stay on track.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          role="switch"
          aria-checked={nudgeEnabled}
          onClick={() => onNudgeEnabledChange(!nudgeEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${nudgeEnabled ? 'bg-brand-600' : 'bg-stone-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${nudgeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm text-stone-700">Enable notifications for this goal</span>
      </div>

      {nudgeEnabled && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Notification intensity</p>
          {levels.map((l) => (
            <button
              key={l.value}
              onClick={() => onNudgeLevelChange(l.value)}
              className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-all ${
                nudgeLevel === l.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <p className="text-sm font-medium text-stone-900">{l.label}</p>
              <p className="text-xs text-stone-500 mt-0.5">{l.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step 4: Review ────────────────────────────────────────────────────────────

function StepReview({
  goalType,
  label,
  targetRaw,
  periodStart,
  periodEnd,
  nudgeEnabled,
  nudgeLevel,
}: {
  goalType: GoalType
  label: string
  targetRaw: string
  periodStart: string
  periodEnd: string
  nudgeEnabled: boolean
  nudgeLevel: NudgeLevel
}) {
  const meta = GOAL_TYPE_META.find((m) => m.type === goalType)
  const isRevenue = goalType === 'revenue_monthly' || goalType === 'revenue_annual' || goalType === 'revenue_custom'
  const isPercent = goalType === 'profit_margin' || goalType === 'expense_ratio'
  const targetDisplay = isRevenue
    ? `$${Number(targetRaw || 0).toLocaleString('en-US')}`
    : isPercent
    ? `${targetRaw || 0}%`
    : `${targetRaw || 0}`

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Review and save</h2>
        <p className="text-sm text-stone-500 mt-1">Confirm your goal before saving.</p>
      </div>
      <Card>
        <CardContent className="pt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">Type</span>
            <span className="font-medium text-stone-900">{meta?.label ?? goalType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Name</span>
            <span className="font-medium text-stone-900 text-right max-w-[60%] truncate">{label || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Target</span>
            <span className="font-medium text-stone-900">{targetDisplay}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Period</span>
            <span className="font-medium text-stone-900">{periodStart} – {periodEnd}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Notifications</span>
            <span className="font-medium text-stone-900">
              {nudgeEnabled ? `${nudgeLevel.charAt(0).toUpperCase() + nudgeLevel.slice(1)}` : 'Off'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export function GoalWizardSteps() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [goalType, setGoalType] = useState<GoalType | null>(null)
  const [label, setLabel] = useState('')
  const [targetRaw, setTargetRaw] = useState('')
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month')
  const [periodStart, setPeriodStart] = useState(thisMonthStart())
  const [periodEnd, setPeriodEnd] = useState(thisMonthEnd())
  const [nudgeEnabled, setNudgeEnabled] = useState(true)
  const [nudgeLevel, setNudgeLevel] = useState<NudgeLevel>('standard')

  function handleGoalTypeSelect(t: GoalType) {
    setGoalType(t)
    setLabel(defaultLabel(t))
    // Adjust period preset defaults
    if (t === 'revenue_annual') {
      setPeriodPreset('this_year')
      setPeriodStart(thisYearStart())
      setPeriodEnd(thisYearEnd())
    } else {
      setPeriodPreset('this_month')
      setPeriodStart(thisMonthStart())
      setPeriodEnd(thisMonthEnd())
    }
  }

  function handlePeriodPresetChange(preset: PeriodPreset) {
    setPeriodPreset(preset)
    if (preset === 'this_month') {
      setPeriodStart(thisMonthStart())
      setPeriodEnd(thisMonthEnd())
    } else if (preset === 'this_year') {
      setPeriodStart(thisYearStart())
      setPeriodEnd(thisYearEnd())
    }
  }

  function buildTargetValue(): number {
    const raw = parseFloat(targetRaw || '0')
    if (!goalType) return 0
    const isRevenue = goalType === 'revenue_monthly' || goalType === 'revenue_annual' || goalType === 'revenue_custom'
    const isPercent = goalType === 'profit_margin' || goalType === 'expense_ratio'
    if (isRevenue) return Math.round(raw * 100)     // dollars → cents
    if (isPercent) return Math.round(raw * 100)      // percent → basis points
    return Math.round(raw)                           // count
  }

  function canAdvance(): boolean {
    if (step === 1) return goalType !== null
    if (step === 2) {
      const tv = buildTargetValue()
      return label.trim().length > 0 && tv > 0 && periodStart <= periodEnd
    }
    return true
  }

  function handleNext() {
    if (step < 4) setStep((s) => s + 1)
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1)
    setError(null)
  }

  function handleSave() {
    if (!goalType) return
    setError(null)
    const input: CreateGoalInput = {
      goalType,
      label: label.trim(),
      targetValue: buildTargetValue(),
      periodStart,
      periodEnd,
      nudgeEnabled,
      nudgeLevel,
    }
    startTransition(async () => {
      try {
        await createGoal(input)
        router.push('/goals')
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  const STEPS = ['Goal type', 'Target', 'Reminders', 'Review']

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const num = i + 1
          const done = step > num
          const active = step === num
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${done ? 'bg-brand-600 text-white' : active ? 'bg-brand-600 text-white' : 'bg-stone-200 text-stone-500'}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : num}
              </div>
              <span className={`text-xs hidden sm:inline ${active ? 'font-medium text-stone-900' : 'text-stone-400'}`}>{label}</span>
              {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-stone-300 hidden sm:block" />}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      {step === 1 && (
        <StepGoalType selected={goalType} onSelect={handleGoalTypeSelect} />
      )}
      {step === 2 && goalType && (
        <StepTarget
          goalType={goalType}
          label={label}
          onLabelChange={setLabel}
          targetRaw={targetRaw}
          onTargetChange={setTargetRaw}
          periodPreset={periodPreset}
          onPeriodPresetChange={handlePeriodPresetChange}
          periodStart={periodStart}
          onPeriodStartChange={setPeriodStart}
          periodEnd={periodEnd}
          onPeriodEndChange={setPeriodEnd}
        />
      )}
      {step === 3 && (
        <StepReminders
          nudgeEnabled={nudgeEnabled}
          onNudgeEnabledChange={setNudgeEnabled}
          nudgeLevel={nudgeLevel}
          onNudgeLevelChange={setNudgeLevel}
        />
      )}
      {step === 4 && goalType && (
        <StepReview
          goalType={goalType}
          label={label}
          targetRaw={targetRaw}
          periodStart={periodStart}
          periodEnd={periodEnd}
          nudgeEnabled={nudgeEnabled}
          nudgeLevel={nudgeLevel}
        />
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 rounded-md bg-red-50 border border-red-200 px-3 py-2">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {step < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={isPending || !canAdvance()}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Saving…' : 'Save Goal'}
            {!isPending && <Check className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  )
}
