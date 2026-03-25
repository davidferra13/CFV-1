// Guided Pricing Setup - walks chefs through their rates with industry benchmarks.
// Reads the chef's archetype to show relevant suggestions.
// Writes directly to chef_pricing_config (DB) on completion.
'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  getBenchmarksForArchetype,
  benchmarkCentsToDisplay,
  type BenchmarkField,
  type BenchmarkSection,
  type BenchmarkSet,
} from '@/lib/pricing/benchmarks'
import type { ArchetypeId } from '@/lib/archetypes/presets'
import { ChevronDown, ChevronRight, Check } from '@/components/ui/icons'

// ─── Types ──────────────────────────────────────────────────────────────────

type PricingStepProps = {
  onComplete: (data: Record<string, unknown>) => void
  onSkip: () => void
  /** Chef's archetype, if already selected. Drives which benchmarks to show. */
  archetype?: ArchetypeId | null
  /** Existing pricing config from DB, if any (so we don't overwrite configured values). */
  existingConfig?: Record<string, unknown> | null
}

// ─── Dollar/Cents conversion ────────────────────────────────────────────────

function centsToDollars(cents: number): string {
  if (cents === 0) return ''
  if (cents < 100) return (cents / 100).toFixed(2)
  return String(Math.round(cents / 100))
}

function dollarsToCents(dollars: string): number {
  const n = parseFloat(dollars)
  if (isNaN(n) || n < 0) return 0
  return Math.round(n * 100)
}

// ─── Benchmark Indicator ────────────────────────────────────────────────────

function BenchmarkBar({ field, currentCents }: { field: BenchmarkField; currentCents: number }) {
  const { benchmark } = field
  const isPercentage =
    field.unit === 'percentage' || field.unit === 'hours' || field.unit === 'number'

  const low = benchmark.low
  const high = benchmark.high
  const mid = benchmark.mid
  const range = high - low || 1

  // Position of current value on the bar (0-100%)
  const position = Math.min(100, Math.max(0, ((currentCents - low) / range) * 100))

  const formatVal = (v: number) => {
    if (isPercentage)
      return `${v}${field.unit === 'percentage' ? '%' : field.unit === 'hours' ? 'h' : ''}`
    return benchmarkCentsToDisplay(v)
  }

  return (
    <div className="mt-1.5">
      {/* Bar */}
      <div className="relative h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
        {/* Mid marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-zinc-400 dark:bg-zinc-500"
          style={{ left: `${((mid - low) / range) * 100}%` }}
        />
        {/* Current position */}
        {currentCents > 0 && (
          <div
            className="absolute top-0 bottom-0 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-zinc-900"
            style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
          />
        )}
      </div>
      {/* Labels */}
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-zinc-400">{formatVal(low)}</span>
        <span className="text-[10px] text-zinc-400 font-medium">typical: {formatVal(mid)}</span>
        <span className="text-[10px] text-zinc-400">{formatVal(high)}</span>
      </div>
    </div>
  )
}

// ─── Field Input ────────────────────────────────────────────────────────────

function PricingFieldInput({
  field,
  value,
  onChange,
}: {
  field: BenchmarkField
  value: string
  onChange: (val: string) => void
}) {
  const isPercentage = field.unit === 'percentage'
  const isHours = field.unit === 'hours'
  const isNumber = field.unit === 'number'
  const isCents = !isPercentage && !isHours && !isNumber

  const currentCents = isCents ? dollarsToCents(value) : parseFloat(value) || 0

  const prefix = isCents ? '$' : ''
  const suffix = isPercentage ? '%' : isHours ? ' hours' : ''

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm text-zinc-700 dark:text-zinc-300">{field.label}</label>
        <button
          type="button"
          onClick={() => {
            const suggested = field.benchmark.mid
            if (isCents) {
              onChange(centsToDollars(suggested))
            } else {
              onChange(String(suggested))
            }
          }}
          className="text-[11px] text-brand-500 hover:text-brand-600 font-medium"
        >
          Use suggested
        </button>
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min="0"
          step={isCents ? '5' : '1'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isCents ? centsToDollars(field.benchmark.mid) : String(field.benchmark.mid)}
          className={`w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${prefix ? 'pl-7' : 'pl-3'} pr-3`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
            {suffix}
          </span>
        )}
      </div>
      <BenchmarkBar field={field} currentCents={currentCents} />
      {field.tip && <p className="text-[11px] text-zinc-400 leading-tight">{field.tip}</p>}
    </div>
  )
}

// ─── Section (collapsible) ──────────────────────────────────────────────────

function SetupSection({
  section,
  values,
  onChange,
  defaultOpen,
}: {
  section: BenchmarkSection
  values: Record<string, string>
  onChange: (key: string, val: string) => void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  // Count how many fields have values
  const filledCount = section.fields.filter((f) => {
    const v = values[f.configKey]
    return v && parseFloat(v) > 0
  }).length

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          )}
          <div className="text-left">
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              {section.title}
            </span>
            <span className="text-xs text-zinc-500 ml-2">{section.subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {filledCount === section.fields.length && filledCount > 0 ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <Check className="h-3.5 w-3.5" /> Done
            </span>
          ) : (
            <span className="text-xs text-zinc-400">
              {filledCount}/{section.fields.length}
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 py-4 space-y-5">
          {section.stat && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 px-3 py-2">
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                {section.stat}
              </p>
            </div>
          )}
          {section.fields.map((field) => (
            <PricingFieldInput
              key={field.configKey}
              field={field}
              value={values[field.configKey] || ''}
              onChange={(val) => onChange(field.configKey, val)}
            />
          ))}
          {/* "Use all suggested" shortcut */}
          <button
            type="button"
            onClick={() => {
              for (const field of section.fields) {
                const isCents =
                  field.unit !== 'percentage' && field.unit !== 'hours' && field.unit !== 'number'
                const suggested = field.benchmark.mid
                onChange(field.configKey, isCents ? centsToDollars(suggested) : String(suggested))
              }
            }}
            className="w-full text-center py-2 text-xs font-medium text-brand-500 hover:text-brand-600 border border-dashed border-brand-300 dark:border-brand-700 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
          >
            Apply all suggested values for this section
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PricingStep({ onComplete, onSkip, archetype, existingConfig }: PricingStepProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const benchmarks: BenchmarkSet = getBenchmarksForArchetype(archetype ?? null)

  // Initialize from existing config if provided
  useEffect(() => {
    if (!existingConfig) return
    const initial: Record<string, string> = {}
    for (const section of benchmarks.sections) {
      for (const field of section.fields) {
        const existing = existingConfig[field.configKey]
        if (typeof existing === 'number' && existing > 0) {
          const isCents =
            field.unit !== 'percentage' && field.unit !== 'hours' && field.unit !== 'number'
          initial[field.configKey] = isCents ? centsToDollars(existing) : String(existing)
        }
      }
    }
    if (Object.keys(initial).length > 0) {
      setValues(initial)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Convert form values to chef_pricing_config format
    const configUpdate: Record<string, unknown> = {}

    for (const section of benchmarks.sections) {
      for (const field of section.fields) {
        const raw = values[field.configKey]
        if (!raw || raw === '') continue

        const isCents =
          field.unit !== 'percentage' && field.unit !== 'hours' && field.unit !== 'number'
        if (isCents) {
          configUpdate[field.configKey] = dollarsToCents(raw)
        } else {
          configUpdate[field.configKey] = Math.round(parseFloat(raw) || 0)
        }
      }
    }

    startTransition(async () => {
      // Pass the structured config data to onComplete
      // The parent (onboarding wizard) persists this to chef_pricing_config
      onComplete({ pricingConfig: configUpdate })
    })
  }

  function handleApplyAllSuggested() {
    const suggested: Record<string, string> = {}
    for (const section of benchmarks.sections) {
      for (const field of section.fields) {
        const isCents =
          field.unit !== 'percentage' && field.unit !== 'hours' && field.unit !== 'number'
        suggested[field.configKey] = isCents
          ? centsToDollars(field.benchmark.mid)
          : String(field.benchmark.mid)
      }
    }
    setValues(suggested)
  }

  // Count total filled vs total fields
  const totalFields = benchmarks.sections.reduce((sum, s) => sum + s.fields.length, 0)
  const filledFields = benchmarks.sections.reduce(
    (sum, s) =>
      sum +
      s.fields.filter((f) => values[f.configKey] && parseFloat(values[f.configKey]) > 0).length,
    0
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Set your pricing</h2>
        <p className="mt-1 text-sm text-zinc-500">
          We'll guide you through each pricing area with industry benchmarks for{' '}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{benchmarks.label}</span>{' '}
          businesses. You can adjust everything anytime in Settings.
        </p>
      </div>

      {/* Industry context */}
      <div className="rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-800/30 border border-zinc-200 dark:border-zinc-700 p-4">
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {benchmarks.description}
        </p>
        <button
          type="button"
          onClick={handleApplyAllSuggested}
          className="mt-3 text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Start with all suggested values and customize from there
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${totalFields > 0 ? (filledFields / totalFields) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500 tabular-nums">
          {filledFields}/{totalFields}
        </span>
      </div>

      {/* Sections */}
      {benchmarks.sections.map((section, i) => (
        <SetupSection
          key={section.key}
          section={section}
          values={values}
          onChange={handleChange}
          defaultOpen={i === 0}
        />
      ))}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2"
        >
          I'll set up pricing later
        </button>
        <button
          type="submit"
          disabled={isPending || filledFields === 0}
          className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending
            ? 'Saving...'
            : filledFields === 0
              ? 'Enter at least one rate'
              : 'Save & Continue'}
        </button>
      </div>
    </form>
  )
}
