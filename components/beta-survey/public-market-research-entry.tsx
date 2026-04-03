import Link from 'next/link'
import { cookies } from 'next/headers'
import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList } from '@/components/ui/icons'
import { getCachedActiveSurvey } from '@/lib/beta-survey/survey-cache'
import { getBetaSurveyCompletionKey } from '@/lib/beta-survey/survey-presence'
import { getDefaultRespondentRoleForSurveyType } from '@/lib/beta-survey/survey-utils'

type SurveyEntry = {
  slug: string
  ctaLabel: string
  detail: string
  href: string
}

function buildTrackedHref(surveySlug: string, params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value)
    }
  }

  const query = searchParams.toString()
  return query ? `/beta-survey/public/${surveySlug}?${query}` : `/beta-survey/public/${surveySlug}`
}

export async function PublicMarketResearchEntry() {
  try {
    const [operatorSurvey, clientSurvey] = await Promise.all([
      getCachedActiveSurvey('market_research_operator'),
      getCachedActiveSurvey('market_research_client'),
    ])

    const cookieStore = cookies()
    const entries: SurveyEntry[] = []

    if (operatorSurvey && !cookieStore.get(getBetaSurveyCompletionKey(operatorSurvey.slug))) {
      entries.push({
        slug: operatorSurvey.slug,
        ctaLabel: 'I run a food business',
        detail: 'Share how you manage leads, bookings, ops, and follow-through today.',
        href: buildTrackedHref(operatorSurvey.slug, {
          source: 'owned_surface',
          channel: 'public_site',
          launch: 'public_discover_card',
          respondent_role: getDefaultRespondentRoleForSurveyType(operatorSurvey.survey_type),
        }),
      })
    }

    if (clientSurvey && !cookieStore.get(getBetaSurveyCompletionKey(clientSurvey.slug))) {
      entries.push({
        slug: clientSurvey.slug,
        ctaLabel: 'I may hire a chef or caterer',
        detail: 'Tell us how you search, compare, and decide when booking a chef-led experience.',
        href: buildTrackedHref(clientSurvey.slug, {
          source: 'owned_surface',
          channel: 'public_site',
          launch: 'public_discover_card',
          respondent_role: getDefaultRespondentRoleForSurveyType(clientSurvey.survey_type),
        }),
      })
    }

    if (entries.length === 0) {
      return null
    }

    return (
      <section aria-label="Optional research surveys" className="px-4 pb-8 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-6xl border-brand-500/20 bg-stone-950/70">
          <CardContent className="flex flex-col gap-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-brand-300">
                <ClipboardList size={16} className="shrink-0" />
                Optional research
              </div>
              <h2 className="text-lg font-semibold text-stone-100">
                Help shape how ChefFlow works for both operators and customers.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                These short surveys are voluntary. Choose the one that fits you best and tell us
                what would make the experience genuinely useful.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[22rem]">
              {entries.map((entry) => (
                <Link
                  key={entry.slug}
                  href={entry.href}
                  className="rounded-xl border border-stone-700 bg-stone-900/90 px-4 py-3 text-left transition-colors hover:border-brand-500/40 hover:bg-stone-900"
                >
                  <div className="text-sm font-semibold text-stone-100">{entry.ctaLabel}</div>
                  <div className="mt-1 text-xs leading-relaxed text-stone-400">{entry.detail}</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    )
  } catch {
    return null
  }
}
