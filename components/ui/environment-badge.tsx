'use client'

import { getAppEnvironment } from '@/lib/environment/runtime'
import { useIsDemoMode } from '@/lib/demo-mode'

const ENV_LABEL: Record<string, string> = {
  production: 'Prod',
  staging: 'Staging',
  development: 'Dev',
}

const ENV_CLASS: Record<string, string> = {
  production: 'bg-red-950/80 text-red-300/80 border-red-800/50',
  staging: 'bg-amber-950/80 text-amber-300/80 border-amber-800/50',
  development: 'bg-brand-950/60 text-brand-300/70 border-brand-800/40',
}

export function EnvironmentBadge() {
  const isDemo = useIsDemoMode()
  if (isDemo) return null
  const environment = getAppEnvironment()
  return (
    <div className="fixed right-3 top-2 z-command pointer-events-none" aria-live="polite">
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-medium tracking-wider uppercase ${ENV_CLASS[environment]}`}
      >
        {ENV_LABEL[environment]}
      </span>
    </div>
  )
}
