'use client'

// Module toggle grid — lets chefs choose which feature areas appear in their sidebar.
// Each module card shows name, description, tier badge, and a toggle switch.
// Focus Mode toggle at top — when ON, only core modules shown. Admin sees status registry.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Crown, Lock, Focus, Eye, EyeOff } from '@/components/ui/icons'
import { MODULES } from '@/lib/billing/modules'
import type { Tier } from '@/lib/billing/tier'
import { updateEnabledModules, enableAllModules } from '@/lib/billing/module-actions'
import { CORE_MODULES, EXTENDED_MODULES } from '@/lib/billing/focus-mode'
import { toggleFocusMode } from '@/lib/billing/focus-mode-actions'

type Props = {
  enabledModules: string[]
  tier: Tier
  isGrandfathered: boolean
  focusMode: boolean
  isAdmin: boolean
}

export function ModulesClient({
  enabledModules: initial,
  tier,
  isGrandfathered,
  focusMode: initialFocusMode,
  isAdmin,
}: Props) {
  const router = useRouter()
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initial))
  const [focusMode, setFocusMode] = useState(initialFocusMode)
  const [isPending, startTransition] = useTransition()

  function handleToggleFocusMode() {
    const previous = focusMode
    const next = !focusMode
    setFocusMode(next)
    startTransition(async () => {
      try {
        await toggleFocusMode(next)
        // Update local enabled set to match
        if (next) {
          setEnabled(new Set(CORE_MODULES))
        } else {
          setEnabled(new Set([...CORE_MODULES, ...EXTENDED_MODULES]))
        }
        toast.success(next ? 'Focus Mode enabled' : 'Focus Mode disabled')
        router.refresh()
      } catch (err) {
        setFocusMode(previous)
        toast.error('Failed to toggle Focus Mode')
      }
    })
  }

  function toggle(slug: string) {
    const previous = new Set(enabled)
    const next = new Set(enabled)
    if (next.has(slug)) {
      next.delete(slug)
    } else {
      next.add(slug)
    }
    setEnabled(next)
    startTransition(async () => {
      try {
        await updateEnabledModules(Array.from(next))
        toast.success(next.has(slug) ? 'Module enabled' : 'Module hidden')
      } catch (err) {
        setEnabled(previous)
        toast.error('Failed to update module')
      }
    })
  }

  function selectAll() {
    const previous = new Set(enabled)
    const all = new Set(MODULES.map((m) => m.slug))
    setEnabled(all)
    startTransition(async () => {
      try {
        await enableAllModules()
        toast.success('All modules enabled')
      } catch (err) {
        setEnabled(previous)
        toast.error('Failed to enable all modules')
      }
    })
  }

  function selectDefaults() {
    const previous = new Set(enabled)
    const defaults = new Set(MODULES.filter((m) => m.defaultEnabled).map((m) => m.slug))
    setEnabled(defaults)
    startTransition(async () => {
      try {
        await updateEnabledModules(Array.from(defaults))
        toast.success('Modules reset to defaults')
      } catch (err) {
        setEnabled(previous)
        toast.error('Failed to reset modules')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Focus Mode toggle */}
      <div
        className={`rounded-xl border-2 p-5 transition-colors ${
          focusMode ? 'border-brand-500 bg-brand-950/20' : 'border-stone-700 bg-stone-900'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Focus size={20} className="text-brand-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-stone-100">Focus Mode</h3>
              <p className="text-sm text-stone-400 mt-0.5">
                {focusMode
                  ? 'Strict Focus Mode is active: only Remy, Sales, Events, and Clients groups are shown (plus Admin when available), with fixed shortcuts.'
                  : 'All modules visible. Turn on Focus Mode to enforce a strict simplified sidebar.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleFocusMode}
            disabled={isPending}
            className={`relative shrink-0 h-11 w-14 rounded-full transition-colors disabled:opacity-50 ${
              focusMode ? 'bg-brand-500' : 'bg-stone-600'
            }`}
            aria-label="Toggle Focus Mode"
          >
            <span
              className={`absolute left-1 top-1 h-9 w-9 rounded-full bg-stone-900 shadow transition-transform ${
                focusMode ? 'translate-x-3' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Focus Mode ON: show what's active */}
        {focusMode && (
          <div className="mt-4 pt-4 border-t border-stone-700/50">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">
              Active in Focus Mode
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {[
                { label: 'Dashboard', desc: 'Primary shortcut' },
                { label: 'Inbox', desc: 'Primary shortcut' },
                { label: 'Inquiries', desc: 'Primary shortcut' },
                { label: 'Events', desc: 'Primary shortcut' },
                { label: 'Clients', desc: 'Primary shortcut' },
                { label: 'Remy group', desc: 'Visible in strict Focus Mode' },
                { label: 'Sales group', desc: 'Visible in strict Focus Mode' },
                { label: 'Events group', desc: 'Visible in strict Focus Mode' },
                { label: 'Clients group', desc: 'Visible in strict Focus Mode' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-stone-300">
                  <Eye size={12} className="text-brand-400 shrink-0" />
                  <span>{item.label}</span>
                  <span className="text-stone-500">- {item.desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-500 mt-3">
              Other areas stay available by direct URL, but are hidden from the sidebar until Focus
              Mode is turned off.
            </p>
          </div>
        )}

        {/* Admin: show visibility registry */}
        {isAdmin && focusMode && (
          <div className="mt-3 pt-3 border-t border-stone-700/50">
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">
              Hidden in Focus Mode (admin view)
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {MODULES.filter((m) => !CORE_MODULES.includes(m.slug as any)).map((mod) => (
                <div key={mod.slug} className="flex items-center gap-2 text-sm text-stone-500">
                  <EyeOff size={12} className="shrink-0" />
                  <span>{mod.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Module grid — shown when Focus Mode is OFF */}
      {!focusMode && (
        <>
          {/* Quick actions */}
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              disabled={isPending}
              className="min-h-[44px] rounded-lg border border-stone-700 px-3 py-2 text-sm transition-colors hover:bg-stone-800 disabled:opacity-50 dark:border-stone-700 dark:hover:bg-stone-800"
            >
              Select All
            </button>
            <button
              onClick={selectDefaults}
              disabled={isPending}
              className="min-h-[44px] rounded-lg border border-stone-700 px-3 py-2 text-sm transition-colors hover:bg-stone-800 disabled:opacity-50 dark:border-stone-700 dark:hover:bg-stone-800"
            >
              Reset to Defaults
            </button>
          </div>

          {/* Module grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {MODULES.map((mod) => {
              const isOn = enabled.has(mod.slug)
              const isProModule = mod.tier === 'pro'
              const isLocked = isProModule && tier === 'free'

              return (
                <div
                  key={mod.slug}
                  className={`relative rounded-xl border p-4 transition-colors ${
                    isOn
                      ? 'border-brand-600 bg-brand-950/30 dark:border-brand-700 dark:bg-brand-900/20'
                      : 'border-stone-700 bg-stone-900 dark:border-stone-700 dark:bg-stone-800'
                  } ${mod.alwaysVisible ? 'opacity-75' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-stone-100 dark:text-stone-100">
                          {mod.label}
                        </h3>
                        {isProModule && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-brand-900 text-brand-400 dark:bg-brand-900 dark:text-brand-300">
                            <Crown size={10} />
                            Pro
                          </span>
                        )}
                        {isLocked && <Lock size={12} className="text-stone-400" />}
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {mod.description}
                      </p>
                      {isLocked && (
                        <Link
                          href="/settings/billing"
                          className="text-xs text-brand-600 hover:text-brand-400 dark:text-brand-400 mt-1 inline-block"
                        >
                          Upgrade to unlock
                        </Link>
                      )}
                    </div>
                    {!mod.alwaysVisible && (
                      <button
                        onClick={() => toggle(mod.slug)}
                        disabled={isPending}
                        className={`relative shrink-0 h-11 w-14 rounded-full transition-colors disabled:opacity-50 ${
                          isOn ? 'bg-brand-500' : 'bg-stone-300 dark:bg-stone-600'
                        }`}
                        aria-label={`Toggle ${mod.label}`}
                      >
                        <span
                          className={`absolute left-1 top-1 h-9 w-9 rounded-full bg-stone-900 shadow transition-transform ${
                            isOn ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    )}
                    {mod.alwaysVisible && (
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                        Always on
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {isPending && <p className="text-xs text-stone-400 animate-pulse">Saving...</p>}
    </div>
  )
}
