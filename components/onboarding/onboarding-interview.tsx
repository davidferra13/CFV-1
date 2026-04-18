'use client'

import { useState, useTransition } from 'react'
import { ARCHETYPES } from '@/lib/archetypes/presets'
import type { ArchetypeId } from '@/lib/archetypes/presets'
import {
  SCALE_OPTIONS,
  MATURITY_OPTIONS,
  ACQUISITION_OPTIONS,
  INTEGRATION_OPTIONS,
  INTERVIEW_SCREENS,
  type ConfigurationInputs,
  type ScaleId,
  type MaturityId,
  type AcquisitionId,
  type IntegrationId,
} from '@/lib/onboarding/configuration-inputs'
import { configureWorkspace } from '@/lib/onboarding/apply-configuration'

type InterviewProps = {
  onComplete: (
    inputs: ConfigurationInputs,
    hints: ConfigurationInputs extends never ? never : Record<string, boolean>
  ) => void
}

type PartialInputs = Partial<ConfigurationInputs>

export function OnboardingInterview({ onComplete }: InterviewProps) {
  const [screenIndex, setScreenIndex] = useState(0)
  const [inputs, setInputs] = useState<PartialInputs>({})
  const [isPending, startTransition] = useTransition()
  const [applyError, setApplyError] = useState<string | null>(null)

  const screen = INTERVIEW_SCREENS[screenIndex]
  const isLastScreen = screenIndex === INTERVIEW_SCREENS.length - 1
  const canGoBack = screenIndex > 0

  function select(key: string, value: string) {
    const updated = { ...inputs, [key]: value }
    setInputs(updated)

    if (isLastScreen) {
      // All 5 answers collected, apply configuration
      applyAndFinish(updated as ConfigurationInputs)
    } else {
      // Auto-advance to next screen
      setScreenIndex((i) => i + 1)
    }
  }

  function applyAndFinish(finalInputs: ConfigurationInputs) {
    setApplyError(null)
    startTransition(async () => {
      try {
        const result = await configureWorkspace(finalInputs)
        onComplete(finalInputs, result.hints as any)
      } catch (err) {
        console.error('[interview] Failed to configure workspace:', err)
        setApplyError('Something went wrong setting up your workspace. Please try again.')
      }
    })
  }

  function goBack() {
    if (canGoBack) setScreenIndex((i) => i - 1)
  }

  // Render options for current screen
  function renderOptions() {
    const key = screen.key

    if (key === 'archetype') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ARCHETYPES.map((a) => (
            <OptionCard
              key={a.id}
              emoji={a.emoji}
              label={a.label}
              description={a.description}
              selected={inputs.archetype === a.id}
              disabled={isPending}
              onClick={() => select('archetype', a.id)}
            />
          ))}
        </div>
      )
    }

    if (key === 'scale') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SCALE_OPTIONS.map((o) => (
            <OptionCard
              key={o.id}
              emoji={o.emoji}
              label={o.label}
              description={o.description}
              selected={inputs.scale === o.id}
              disabled={isPending}
              onClick={() => select('scale', o.id)}
            />
          ))}
        </div>
      )
    }

    if (key === 'maturity') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MATURITY_OPTIONS.map((o) => (
            <OptionCard
              key={o.id}
              emoji={o.emoji}
              label={o.label}
              description={o.description}
              selected={inputs.maturity === o.id}
              disabled={isPending}
              onClick={() => select('maturity', o.id)}
            />
          ))}
        </div>
      )
    }

    if (key === 'acquisition') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ACQUISITION_OPTIONS.map((o) => (
            <OptionCard
              key={o.id}
              emoji={o.emoji}
              label={o.label}
              description={o.description}
              selected={inputs.acquisition === o.id}
              disabled={isPending}
              onClick={() => select('acquisition', o.id)}
            />
          ))}
        </div>
      )
    }

    if (key === 'integrations') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {INTEGRATION_OPTIONS.map((o) => (
            <OptionCard
              key={o.id}
              emoji={o.emoji}
              label={o.label}
              description={o.description}
              selected={inputs.integrations === o.id}
              disabled={isPending}
              onClick={() => select('integrations', o.id)}
            />
          ))}
        </div>
      )
    }

    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 p-4">
      <div className="w-full max-w-3xl">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {INTERVIEW_SCREENS.map((s, i) => (
            <div
              key={s.key}
              className={`h-2 rounded-full transition-all duration-300 ${
                i < screenIndex
                  ? 'w-8 bg-amber-500'
                  : i === screenIndex
                    ? 'w-8 bg-amber-400'
                    : 'w-2 bg-stone-700'
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          {screenIndex === 0 && (
            <h2 className="text-amber-400 text-sm font-medium tracking-wider uppercase mb-3">
              Welcome to ChefFlow
            </h2>
          )}
          <h1 className="text-3xl font-bold text-white font-display mb-3">{screen.title}</h1>
          <p className="text-stone-400 text-lg max-w-xl mx-auto">{screen.subtitle}</p>
          {screenIndex === 0 && (
            <p className="text-stone-500 text-sm mt-2">
              Nothing is locked out. You can change everything in Settings.
            </p>
          )}
        </div>

        {/* Options */}
        <div className="mb-8">{renderOptions()}</div>

        {/* Error state */}
        {applyError && <p className="text-red-400 text-sm text-center mb-4">{applyError}</p>}

        {/* Applying state */}
        {isPending && (
          <p className="text-stone-400 text-sm text-center animate-pulse">
            Setting up your workspace...
          </p>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-4">
          {canGoBack ? (
            <button
              type="button"
              onClick={goBack}
              disabled={isPending}
              className="text-sm text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Option Card ──────────────────────────────────────────────────────────────

function OptionCard({
  emoji,
  label,
  description,
  selected,
  disabled,
  onClick,
}: {
  emoji: string
  label: string
  description: string
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative p-5 rounded-xl border-2 text-left transition-all duration-200
        ${
          selected
            ? 'border-amber-500 bg-amber-950/30'
            : 'border-stone-700 bg-stone-900 hover:border-stone-500 hover:bg-stone-800'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="text-white font-semibold text-lg mb-1">{label}</h3>
      <p className="text-stone-400 text-sm leading-relaxed">{description}</p>
    </button>
  )
}
