import type Stripe from 'stripe'
import { createServerClient } from '@/lib/db/server'

const SUPPORT_BILLING_TABLE = 'chefflow_support_billing_events'
const SUPPORT_CHECKOUT_TYPE = 'chefflow_support'

type BillingEventRow = {
  id?: string
  chef_id: string
  record_key: string
  stripe_event_id?: string | null
  event_kind: 'payment' | 'refund_snapshot'
  support_frequency: 'one_time' | 'monthly'
  stripe_payment_intent_id?: string | null
  stripe_charge_id?: string | null
  stripe_invoice_id?: string | null
  stripe_checkout_session_id?: string | null
  stripe_balance_transaction_id?: string | null
  gross_amount_cents: number
  refunded_amount_cents: number
  stripe_fee_cents?: number | null
  occurred_at: string
}

type SupportChefRow = {
  id: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_status?: string | null
  monthly_support_amount_cents?: number | string | null
  last_support_amount_cents?: number | string | null
  last_supported_at?: string | null
}
