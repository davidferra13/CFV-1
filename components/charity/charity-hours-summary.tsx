import { Card } from '@/components/ui/card'
import type { CharityHoursSummary } from '@/lib/charity/hours-types'
import { ExternalLink } from '@/components/ui/icons'

export function CharityHoursSummaryCards({ summary }: { summary: CharityHoursSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-[repeat(4,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.5fr)]">
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-stone-100">{summary.totalHours}</p>
        <p className="mt-1 text-xs text-stone-500">Volunteer hours</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-stone-100">{summary.totalEntries}</p>
        <p className="mt-1 text-xs text-stone-500">Entries logged</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-stone-100">{summary.uniqueOrgs}</p>
        <p className="mt-1 text-xs text-stone-500">Organizations tracked</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-stone-100">{summary.verified501cOrgs}</p>
        <p className="mt-1 text-xs text-stone-500">Verified nonprofits</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
          Top organizations
        </p>
        {summary.hoursByOrg.length > 0 ? (
          <div className="mt-3 space-y-2">
            {summary.hoursByOrg.slice(0, 3).map((organization) => (
              <div
                key={`${organization.id ?? organization.name}-summary`}
                className="flex items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-stone-200">{organization.name}</p>
                  <p className="text-[11px] text-stone-500">
                    {organization.hours}h{organization.isVerified ? ' • verified' : ''}
                  </p>
                </div>
                {(organization.links.websiteUrl ||
                  organization.links.mapsUrl ||
                  organization.links.verificationUrl) && (
                  <a
                    href={
                      organization.links.websiteUrl ||
                      organization.links.mapsUrl ||
                      organization.links.verificationUrl ||
                      '#'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-stone-500 transition-colors hover:text-stone-200"
                    aria-label={`Open ${organization.name}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-500">
            Linked organizations will show up here as you log work.
          </p>
        )}
      </Card>
    </div>
  )
}
