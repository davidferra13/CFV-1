// Inngest Client — Background Job Engine for ChefFlow
// Handles delayed/scheduled tasks like post-event follow-up emails.
// Free tier: 25K runs/month.
//
// If INNGEST_EVENT_KEY is not set, the client still initializes but
// inngest.send() will no-op gracefully (Inngest SDK handles this).

import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'chefflow',
  /**
   * The event key authenticates sends from this app to the Inngest cloud.
   * In dev without a key, Inngest Dev Server handles routing locally.
   */
  eventKey: process.env.INNGEST_EVENT_KEY,
})

// ─── Event Type Definitions ─────────────────────────────────────────────────
// Declare the custom events this app sends so job functions get type safety.

export type InngestEvents = {
  'chefflow/event.completed': {
    data: {
      eventId: string
      tenantId: string
      clientId: string
      occasion: string
      eventDate: string
      completedAt: string
    }
  }
  'chefflow/commerce.day-closeout': {
    data: {
      tenantId: string
      reportDate: string // YYYY-MM-DD
    }
  }
  'chefflow/commerce.reconcile-payments': {
    data: {
      tenantId: string
      reportDate: string // YYYY-MM-DD
    }
  }
  'chefflow/commerce.map-settlement': {
    data: {
      tenantId: string
      stripePayoutId: string
      payoutAmountCents: number
      payoutStatus: string
      arrivalDate?: string // YYYY-MM-DD
    }
  }
}
