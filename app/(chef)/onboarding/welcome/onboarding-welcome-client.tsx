'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  ChefHat,
  TrendingUp,
  Building2,
  CalendarDays,
  BookOpen,
  DollarSign,
  Users,
  Calendar,
} from '@/components/ui/icons'
import { setWorkspaceDensity } from '@/lib/chef/preferences-actions'

type WorkspaceDensity = 'minimal' | 'standard' | 'power'

const ARCHETYPES = [
  {
    density: 'minimal' as const,
    title: 'Solo Chef',
    description: 'Just me, my knives, and my clients',
    Icon: ChefHat,
  },
  {
    density: 'standard' as const,
    title: 'Growing Business',
    description: 'Building a team, scaling operations',
    Icon: TrendingUp,
  },
  {
    density: 'power' as const,
    title: 'Full Operation',
    description: 'Multiple staff, complex events, full pipeline',
    Icon: Building2,
  },
]

const PREVIEW_FEATURES = [
  { label: 'Events', Icon: CalendarDays },
  { label: 'Recipes', Icon: BookOpen },
  { label: 'Finance', Icon: DollarSign },
  { label: 'Clients', Icon: Users },
  { label: 'Calendar', Icon: Calendar },
]

interface Props {
  alreadyChosen: boolean
}

export function OnboardingWelcomeClient({ alreadyChosen }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<WorkspaceDensity | null>(null)

  function handleStart() {
    if (!selected) return
    startTransition(async () => {
      try {
        await setWorkspaceDensity(selected)
      } catch {
        // Non-blocking setup. Let the chef proceed even if saving fails.
      }
      router.push('/dashboard')
    })
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-10">
        {/* Greeting */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-display text-stone-100 tracking-tight">
            Welcome to ChefFlow
          </h1>
          <p className="text-stone-400 text-lg">
            Let&apos;s set up your workspace in under a minute
          </p>
        </div>

        {/* Archetype Selection */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide text-center">
            How do you run your business?
          </h2>
          <div className="grid gap-4">
            {ARCHETYPES.map((arch) => {
              const Icon = arch.Icon
              const isSelected = selected === arch.density
              return (
                <button
                  key={arch.density}
                  type="button"
                  onClick={() => setSelected(arch.density)}
                  disabled={isPending}
                  className={`group w-full rounded-xl border px-6 py-5 text-left transition-all disabled:opacity-50 ${
                    isSelected
                      ? 'border-stone-400 bg-stone-800/80 ring-1 ring-stone-400'
                      : 'border-stone-700 bg-stone-900/60 hover:border-stone-500 hover:bg-stone-800/80'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-stone-700 text-white'
                          : 'bg-stone-800 text-stone-400 group-hover:text-stone-200'
                      }`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span
                        className={`block text-lg font-medium ${
                          isSelected ? 'text-white' : 'text-stone-100 group-hover:text-white'
                        }`}
                      >
                        {arch.title}
                      </span>
                      <span className="mt-1 block text-sm text-stone-400">{arch.description}</span>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Quick Tour Preview + Start Button */}
        {selected && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide text-center">
                What you get
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {PREVIEW_FEATURES.map((feat) => {
                  const Icon = feat.Icon
                  return (
                    <Card key={feat.label} className="text-center">
                      <CardContent className="flex flex-col items-center gap-2 py-4 px-3">
                        <Icon className="size-6 text-stone-400" aria-hidden="true" />
                        <span className="text-xs text-stone-400 font-medium">{feat.label}</span>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleStart}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-lg bg-stone-100 px-8 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-white disabled:opacity-50"
              >
                {isPending ? 'Setting up...' : 'Start Using ChefFlow'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
