'use client'

// Admin Feature Flag Toggle Panel — interactive toggle controls per chef
// Server action (toggleChefFlag) is called on each click.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { toggleChefFlag } from '@/lib/admin/flag-actions'

type KnownFlag = {
  key: string
  label: string
  description: string
}

type Chef = {
  id: string
  business_name: string | null
}

type Props = {
  chefs: Chef[]
  flagsByChef: Record<string, Record<string, boolean>>
  knownFlags: readonly KnownFlag[]
}

export function FlagTogglePanel({ chefs, flagsByChef, knownFlags }: Props) {
  // Local optimistic state: { chefId: { flagName: boolean } }
  const [localFlags, setLocalFlags] = useState<Record<string, Record<string, boolean>>>(() =>
    JSON.parse(JSON.stringify(flagsByChef))
  )
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  function handleToggle(chefId: string, flagName: string) {
    const current = localFlags[chefId]?.[flagName] ?? false
    const next = !current

    // Optimistic update
    setLocalFlags((prev) => ({
      ...prev,
      [chefId]: { ...(prev[chefId] ?? {}), [flagName]: next },
    }))
    setFeedback(null)

    startTransition(async () => {
      try {
        const result = await toggleChefFlag(chefId, flagName, next)
        if (!result.success) {
          // Revert on failure
          setLocalFlags((prev) => ({
            ...prev,
            [chefId]: { ...(prev[chefId] ?? {}), [flagName]: current },
          }))
          setFeedback(`Failed to toggle ${flagName}: ${result.error}`)
        } else {
          setFeedback(`Updated ${flagName} for chef.`)
          setTimeout(() => setFeedback(null), 2000)
        }
      } catch (err) {
        setLocalFlags((prev) => ({
          ...prev,
          [chefId]: { ...(prev[chefId] ?? {}), [flagName]: current },
        }))
        toast.error(`Failed to toggle ${flagName}`)
      }
    })
  }

  if (chefs.length === 0) {
    return (
      <div className="bg-stone-900 rounded-xl border border-slate-200 py-12 text-center text-sm text-slate-400">
        No chefs found.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {feedback && (
        <div className="text-xs text-stone-400 bg-stone-800 px-3 py-2 rounded-lg">{feedback}</div>
      )}

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-300">Per-Chef Flag Controls</h2>
          {pending && <span className="text-xs text-slate-400">Saving…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">Chef</th>
                {knownFlags.map((flag) => (
                  <th
                    key={flag.key}
                    className="text-center px-3 py-2.5 text-xs font-medium text-stone-500 max-w-[90px]"
                    title={flag.description}
                  >
                    <span className="font-mono">{flag.key.replace(/_/g, '_\u200B')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chefs.map((chef) => {
                const flags = localFlags[chef.id] ?? {}
                return (
                  <tr key={chef.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {chef.business_name ?? 'Unnamed'}
                    </td>
                    {knownFlags.map((flag) => {
                      const isOn = flags[flag.key] ?? false
                      return (
                        <td key={flag.key} className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => handleToggle(chef.id, flag.key)}
                            disabled={pending}
                            title={isOn ? `Disable ${flag.label}` : `Enable ${flag.label}`}
                            className={`w-9 h-5 rounded-full relative inline-flex items-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-400 disabled:opacity-60 ${
                              isOn ? 'bg-green-500' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`inline-block w-3.5 h-3.5 rounded-full bg-stone-900 shadow-sm transform transition-transform duration-200 ${
                                isOn ? 'translate-x-[18px]' : 'translate-x-[3px]'
                              }`}
                            />
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
