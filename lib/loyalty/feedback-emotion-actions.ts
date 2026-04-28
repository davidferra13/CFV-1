'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { LoyaltyFeedbackEmotionItem } from './feedback-emotion-types'

function coerceText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function coerceRating(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function eventLabel(event: any): string | null {
  if (!event) return null
  const parts = [coerceText(event.occasion), coerceText(event.event_date)]
  return parts.filter(Boolean).join(' - ') || null
}

export async function getLoyaltyFeedbackEmotionItems(): Promise<LoyaltyFeedbackEmotionItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [clientReviewsResult, guestFeedbackResult, chefFeedbackResult] = await Promise.all([
    db
      .from('client_reviews')
      .select(
        `
        id,
        rating,
        feedback_text,
        what_they_loved,
        what_could_improve,
        created_at,
        client:clients(full_name),
        event:events(occasion, event_date)
      `
      )
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(12),
    db
      .from('guest_feedback')
      .select(
        `
        id,
        overall_rating,
        highlight_text,
        suggestion_text,
        submitted_at,
        created_at,
        guest:event_guests(full_name),
        event:events(occasion, event_date)
      `
      )
      .eq('tenant_id', user.tenantId!)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(12),
    db
      .from('chef_feedback')
      .select(
        `
        id,
        rating,
        feedback_text,
        feedback_date,
        created_at,
        reviewer_name,
        client:clients(full_name),
        event:events(occasion, event_date)
      `
      )
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  if (clientReviewsResult.error) {
    console.error('[loyalty-feedback-emotion] client_reviews error:', clientReviewsResult.error)
    throw new Error('Failed to load client reviews')
  }

  if (guestFeedbackResult.error) {
    console.error('[loyalty-feedback-emotion] guest_feedback error:', guestFeedbackResult.error)
    throw new Error('Failed to load guest feedback')
  }

  if (chefFeedbackResult.error) {
    console.error('[loyalty-feedback-emotion] chef_feedback error:', chefFeedbackResult.error)
    throw new Error('Failed to load logged feedback')
  }

  const clientItems: LoyaltyFeedbackEmotionItem[] = (
    (clientReviewsResult.data ?? []) as any[]
  ).flatMap((review): LoyaltyFeedbackEmotionItem[] => {
    const fragments = [
      coerceText(review.feedback_text),
      coerceText(review.what_they_loved),
      coerceText(review.what_could_improve),
    ].filter(Boolean)
    const text = fragments.join(' ')

    if (!text) return []

    return [
      {
        id: `client-${review.id}`,
        source: 'client_review',
        reviewerName: review.client?.full_name ?? 'Client',
        text,
        rating: coerceRating(review.rating),
        eventLabel: eventLabel(review.event),
        createdAt: review.created_at,
      },
    ]
  })

  const guestItems: LoyaltyFeedbackEmotionItem[] = (
    (guestFeedbackResult.data ?? []) as any[]
  ).flatMap((feedback): LoyaltyFeedbackEmotionItem[] => {
    const fragments = [
      coerceText(feedback.highlight_text),
      coerceText(feedback.suggestion_text),
    ].filter(Boolean)
    const text = fragments.join(' ')

    if (!text) return []

    return [
      {
        id: `guest-${feedback.id}`,
        source: 'guest_feedback',
        reviewerName: feedback.guest?.full_name ?? 'Guest',
        text,
        rating: coerceRating(feedback.overall_rating),
        eventLabel: eventLabel(feedback.event),
        createdAt: feedback.submitted_at ?? feedback.created_at,
      },
    ]
  })

  const loggedItems: LoyaltyFeedbackEmotionItem[] = (
    (chefFeedbackResult.data ?? []) as any[]
  ).flatMap((feedback): LoyaltyFeedbackEmotionItem[] => {
    const text = coerceText(feedback.feedback_text)

    if (!text) return []

    return [
      {
        id: `logged-${feedback.id}`,
        source: 'logged_feedback',
        reviewerName: feedback.reviewer_name ?? feedback.client?.full_name ?? 'External Reviewer',
        text,
        rating: coerceRating(feedback.rating),
        eventLabel: eventLabel(feedback.event),
        createdAt: feedback.feedback_date ?? feedback.created_at,
      },
    ]
  })

  return [...clientItems, ...guestItems, ...loggedItems]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 12)
}
