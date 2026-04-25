import { createServerClient } from '@/lib/db/server'
import type { RemyContext } from '@/lib/ai/remy-types'
import {
  advanceRemyTour,
  buildDynamicPersonalityBlock,
  getCuratedGreeting,
  getOnboardingStage,
  incrementMessageCount,
  maybeGetOnboardingCloser,
  trackFirstInteraction,
  type CuratedGreeting,
  type OnboardingRow,
} from '@/lib/ai/remy-personality-engine'
import { encodeSSE } from './route-runtime-utils'

export type RemyStreamCuratedMessage = Pick<CuratedGreeting, 'text' | 'quickReplies'>

async function getChefDisplayName(chefId: string): Promise<string> {
  try {
    const db: any = createServerClient()
    const row = await db
      .from('chefs')
      .select('business_name, display_name')
      .eq('id', chefId)
      .limit(1)
    const chef = row.data?.[0] as { business_name?: string | null; display_name?: string | null }
    const raw = chef?.display_name ?? chef?.business_name ?? 'Chef'
    return raw.split(' ')[0] || 'Chef'
  } catch {
    return 'Chef'
  }
}

export function encodeCuratedStreamMessage(message: RemyStreamCuratedMessage): string {
  return (
    encodeSSE({ type: 'intent', data: 'question' }) +
    encodeSSE({ type: 'token', data: message.text }) +
    (message.quickReplies.length > 0
      ? encodeSSE({ type: 'quick_replies', data: message.quickReplies })
      : '') +
    encodeSSE({ type: 'done', data: null })
  )
}

export async function getCuratedStreamGreeting(
  chefId: string
): Promise<RemyStreamCuratedMessage | null> {
  const chefName = await getChefDisplayName(chefId)
  const greeting = await getCuratedGreeting(chefId, chefName, { includeSeasonal: false })
  if (!greeting) return null
  return { text: greeting.text, quickReplies: greeting.quickReplies }
}

export async function getCuratedStreamReplyForMessage(
  chefId: string,
  message: string
): Promise<RemyStreamCuratedMessage | null> {
  const onboarding = await getOnboardingStage(chefId)
  if (!onboarding || onboarding.stage !== 'greeted' || onboarding.skipped) return null

  const normalized = message.trim().toLowerCase()
  const action =
    normalized === 'give me the tour'
      ? 'start'
      : normalized === 'next'
        ? 'next'
        : normalized === "i'll figure it out" || normalized === 'skip the rest'
          ? 'skip'
          : null

  if (!action) return null

  const beat = await advanceRemyTour(action)
  if (beat) {
    return { text: beat.text, quickReplies: beat.quickReplies }
  }

  if (action === 'skip') {
    return {
      text: "All good, chef. I'll stay out of the way. Ask me anything when you're ready.",
      quickReplies: [],
    }
  }

  return null
}

export async function getStreamOnboardingStage(chefId: string): Promise<OnboardingRow | null> {
  return getOnboardingStage(chefId)
}

export async function buildStreamDynamicPersonalityBlock(
  chefId: string,
  context: RemyContext
): Promise<string> {
  return buildDynamicPersonalityBlock({
    chefId,
    clientCount: context.clientCount,
    eventCount: context.upcomingEventCount,
    recipeCount: context.recipeStats?.totalRecipes ?? 0,
    revenueCents: context.monthRevenueCents ?? context.yearlyStats?.yearRevenueCents ?? 0,
    staleInquiryCount: context.staleInquiries?.length ?? 0,
  })
}

export async function completeStreamOnboardingTurn(
  chefId: string,
  onboarding: OnboardingRow | null
): Promise<string> {
  if (!onboarding || onboarding.skipped) return ''
  if (onboarding.stage !== 'toured' && onboarding.stage !== 'first_interaction') return ''

  await trackFirstInteraction(chefId, onboarding.stage)
  await incrementMessageCount(chefId)
  return maybeGetOnboardingCloser(chefId)
}
