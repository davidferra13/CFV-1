import Link from 'next/link'
import { Button } from '@/components/ui/button'

type ServiceSimulationReturnBannerProps = {
  returnTo: string | null
  label?: string
}

export function ServiceSimulationReturnBanner({
  returnTo,
  label = 'Back to service simulation',
}: ServiceSimulationReturnBannerProps) {
  if (!returnTo) return null

  return (
    <div
      className="rounded-lg border border-brand-700/60 bg-brand-950/40 px-4 py-3"
      data-testid="service-simulation-return-banner"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-200">Fix this item, then jump back.</p>
          <p className="mt-1 text-sm text-brand-300">
            Your return path back to the event rehearsal is preserved.
          </p>
        </div>
        <Link href={returnTo}>
          <Button variant="secondary" size="sm">
            {label}
          </Button>
        </Link>
      </div>
    </div>
  )
}
