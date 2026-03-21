'use client'

import { getAppEnvironment } from '@/lib/environment/runtime'
import { useIsDemoMode } from '@/lib/demo-mode'

const ENV_LABEL: Record<string, string> = {
  production: 'PRODUCTION',
  staging: 'STAGING',
  development: 'DEVELOPMENT',
}

const ENV_CLASS: Record<string, string> = {
  production: 'bg-red-950 text-red-200 border-red-700',
  staging: 'bg-amber-950 text-amber-200 border-amber-700',
  development: 'bg-brand-950 text-brand-200 border-brand-700',
}

export function EnvironmentBadge() {
  const isDemo = useIsDemoMode()
  if (isDemo) return null
  const environment = getAppEnvironment()
  return (
    <div className="fixed right-3 top-3 z-[100] pointer-events-none" aria-live="polite">
      <span
        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs-tight font-semibold tracking-wide ${ENV_CLASS[environment]}`}
      >
        {ENV_LABEL[environment]}
      </span>
    </div>
  )
}
