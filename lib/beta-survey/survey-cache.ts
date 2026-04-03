import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/db/admin'
import type { BetaSurveyDefinition, SurveyQuestion, SurveyType } from './survey-utils'

export const BETA_SURVEY_CACHE_TAG = 'beta-survey'

function mapSurveyDefinition(
  data: Record<string, unknown> | null | undefined
): BetaSurveyDefinition | null {
  if (!data) {
    return null
  }

  return {
    ...(data as BetaSurveyDefinition),
    questions: ((data as { questions?: SurveyQuestion[] }).questions || []) as SurveyQuestion[],
  }
}

export function getCachedActiveSurvey(type: SurveyType): Promise<BetaSurveyDefinition | null> {
  return unstable_cache(
    async (): Promise<BetaSurveyDefinition | null> => {
      const db: any = createAdminClient()
      const { data, error } = await db
        .from('beta_survey_definitions')
        .select('*')
        .eq('survey_type', type)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('[getCachedActiveSurvey]', error)
        return null
      }

      return mapSurveyDefinition(data)
    },
    [`beta-survey-active-${type}`],
    {
      revalidate: 60,
      tags: [
        BETA_SURVEY_CACHE_TAG,
        `${BETA_SURVEY_CACHE_TAG}-active`,
        `${BETA_SURVEY_CACHE_TAG}-active-${type}`,
      ],
    }
  )()
}

export function getCachedPublicSurveyBySlug(slug: string): Promise<BetaSurveyDefinition | null> {
  return unstable_cache(
    async (): Promise<BetaSurveyDefinition | null> => {
      const db: any = createAdminClient()
      const { data, error } = await db
        .from('beta_survey_definitions')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('[getCachedPublicSurveyBySlug]', error)
        return null
      }

      return mapSurveyDefinition(data)
    },
    [`beta-survey-public-${slug}`],
    {
      revalidate: 60,
      tags: [
        BETA_SURVEY_CACHE_TAG,
        `${BETA_SURVEY_CACHE_TAG}-public`,
        `${BETA_SURVEY_CACHE_TAG}-public-${slug}`,
      ],
    }
  )()
}
