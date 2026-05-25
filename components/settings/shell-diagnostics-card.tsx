'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePalette } from '@/components/ui/color-palette-provider'
import { useSidebar } from '@/components/navigation/chef-nav'
import {
  CHEF_SHELL_LOCAL_STORAGE_KEYS,
  CHEF_SHELL_RESET_EVENT,
  resetChefShellLocalState,
} from '@/lib/chef/shell-state'

type ShellDiagnosticsCardProps = {
  focusMode: boolean
  privilegedBypassEnabled: boolean
  enabledModuleCount: number
  savedMobileTabHrefs: string[]
}

export function ShellDiagnosticsCard({
  focusMode,
  privilegedBypassEnabled,
  enabledModuleCount,
  savedMobileTabHrefs,
}: ShellDiagnosticsCardProps) {
  const { collapsed } = useSidebar()
  const { palette } = usePalette()
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  const diagnostics = [
    {
      label: 'Desktop sidebar',
      value: collapsed ? 'Collapsed' : 'Expanded',
    },
    {
      label: 'Palette',
      value: palette.id,
      monospace: true,
    },
    {
      label: 'Focus Mode',
      value: focusMode ? 'Enabled' : 'Off',
    },
    {
      label: 'Privileged bypass',
      value: privilegedBypassEnabled ? 'Enabled' : 'Off',
    },
    {
      label: 'Enabled modules',
      value: String(enabledModuleCount),
    },
    {
      label: 'Saved mobile tabs',
      value:
        savedMobileTabHrefs.length > 0
          ? savedMobileTabHrefs.join(', ')
          : 'Using default mobile tabs',
      monospace: savedMobileTabHrefs.length > 0,
    },
  ]

  function handleReset() {
    resetChefShellLocalState(window.localStorage)
    window.dispatchEvent(new CustomEvent(CHEF_SHELL_RESET_EVENT))
    setResetMessage('Shell-only local presentation state cleared.')
  }

  return (
    <Card className="border-stone-700 bg-stone-900/50">
      <CardHeader>
        <CardTitle>Display Settings</CardTitle>
        <p className="text-sm text-stone-400">
          View and reset your display preferences without affecting your account, billing, or
          feature settings.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {diagnostics.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-stone-800 bg-stone-950/40 px-4 py-3"
            >
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {item.label}
              </dt>
              <dd
                className={`mt-2 text-sm text-stone-100 ${item.monospace ? 'font-mono text-xs break-all' : ''}`}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="rounded-lg border border-stone-800 bg-stone-950/40 px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-stone-100">Reset Display</h3>
              <p className="text-sm text-stone-400">
                Resets your layout and display to the default look. Mobile tab preferences, Focus
                Mode, permissions, and route access stay unchanged.
              </p>
              <p className="text-xs text-stone-500">
                This resets your sidebar, theme, and layout preferences.
              </p>
            </div>

            <Button type="button" variant="secondary" onClick={handleReset}>
              Reset Display
            </Button>
          </div>

          {resetMessage ? <p className="mt-3 text-sm text-green-400">{resetMessage}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
