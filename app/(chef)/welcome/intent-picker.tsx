'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { ClipboardList, Rocket, Smartphone } from 'lucide-react'
import { setWorkspaceDensity } from '@/lib/chef/preferences-actions'

type WorkspaceDensity = 'minimal' | 'standard' | 'power'

const OPTIONS = [
  {
    density: 'minimal' as const,
    title: 'Keep it simple',
    description: 'Phone, notes, calculator. I just need the basics.',
    Icon: Smartphone,
  },
  {
    density: 'standard' as const,
    title: 'Getting organized',
    description: 'Some spreadsheets, some apps. Ready to level up.',
    Icon: ClipboardList,
  },
  {
    density: 'power' as const,
    title: 'Give me everything',
    description: 'I already use business software. Show me all the tools.',
    Icon: Rocket,
  },
]

export function IntentPicker() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handlePick(density: WorkspaceDensity) {
    startTransition(async () => {
      try {
        const result = await setWorkspaceDensity(density)
        if (result.success) {
          router.push('/dashboard')
          return
        }
      } catch {
        // Non-blocking setup question. Let the chef proceed if saving fails.
      }

      router.push('/dashboard')
    })
  }

  return (
    <div className="grid gap-4">
      {OPTIONS.map((option) => {
        const Icon = option.Icon

        return (
          <button
            key={option.density}
            type="button"
            onClick={() => handlePick(option.density)}
            disabled={isPending}
            className="group w-full rounded-lg border border-stone-700 bg-stone-900/60 px-6 py-5 text-left transition-all hover:border-stone-500 hover:bg-stone-800/80 disabled:opacity-50"
          >
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-stone-800 text-stone-200 group-hover:text-white">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-lg font-medium text-stone-100 group-hover:text-white">
                  {option.title}
                </span>
                <span className="mt-1 block text-sm text-stone-400">{option.description}</span>
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
