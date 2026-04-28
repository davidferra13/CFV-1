export type LoyaltyFeedbackEmotionSource = 'client_review' | 'guest_feedback' | 'logged_feedback'

export type LoyaltyFeedbackEmotionItem = {
  id: string
  source: LoyaltyFeedbackEmotionSource
  reviewerName: string
  text: string
  rating: number | null
  eventLabel: string | null
  createdAt: string
}
