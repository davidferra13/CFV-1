// Inngest API Route - Webhook endpoint for background job execution
// Inngest's servers call this endpoint to invoke registered functions.
// Must be reachable without authentication (added to middleware bypass).

import { serve } from 'inngest/next'
import { inngest } from '@/lib/jobs/inngest-client'
import {
  postEventThankYou,
  postEventReviewRequest,
  postEventReferralAsk,
} from '@/lib/jobs/post-event-jobs'
import {
  commerceDayCloseout,
  commercePaymentReconciliation,
  commerceSettlementMapping,
} from '@/lib/jobs/commerce-jobs'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    postEventThankYou,
    postEventReviewRequest,
    postEventReferralAsk,
    commerceDayCloseout,
    commercePaymentReconciliation,
    commerceSettlementMapping,
  ],
})
