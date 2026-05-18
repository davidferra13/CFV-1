'use server'

import { counterCheckout as counterCheckoutAction } from './checkout/counter-checkout'
import { quickSale as quickSaleAction } from './checkout/quick-sale'

export type {
  CheckoutItem,
  SplitTenderInput,
  CounterCheckoutInput,
  AppliedCheckoutPromotion,
  CounterCheckoutResult,
} from './checkout'

export async function counterCheckout(...args: Parameters<typeof counterCheckoutAction>) {
  return counterCheckoutAction(...args)
}

export async function quickSale(...args: Parameters<typeof quickSaleAction>) {
  return quickSaleAction(...args)
}
