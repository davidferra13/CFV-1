export type PassiveSourceType = 'menu' | 'recipe' | 'event' | 'generic'
export type PassiveProductType = 'digital' | 'service' | 'gift_card'
export type PassiveFulfillmentType = 'download' | 'booking' | 'code'
export type PassiveProductStatus = 'active' | 'hidden'
export type PassivePurchaseStatus = 'paid' | 'fulfilled' | 'cancelled'

export type PassiveProduct = {
  product_id: string
  chef_id: string
  source_type: PassiveSourceType
  source_id: string
  product_type: PassiveProductType
  title: string
  description: string
  price: number
  fulfillment_type: PassiveFulfillmentType
  status: PassiveProductStatus
  product_key: string
  preview_image_url: string | null
  metadata: Record<string, unknown>
  generated_payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type PassiveProductDraft = Omit<
  PassiveProduct,
  'product_id' | 'created_at' | 'updated_at' | 'status'
> & {
  status?: PassiveProductStatus
}

export type PassivePurchase = {
  purchase_id: string
  product_id: string
  chef_id: string
  buyer_auth_user_id: string | null
  buyer_client_id: string | null
  buyer_name: string
  buyer_email: string
  recipient_name: string | null
  recipient_email: string | null
  amount_cents: number
  status: PassivePurchaseStatus
  fulfillment_type: PassiveFulfillmentType
  product_snapshot: Record<string, unknown>
  fulfillment_snapshot: Record<string, unknown>
  access_token: string
  created_at: string
}

export type PassiveMenuSource = {
  id: string
  name: string | null
  description: string | null
  cuisine_type: string | null
  service_style: string | null
  target_guest_count: number | null
  price_per_person_cents: number | null
  times_used: number | null
  is_showcase: boolean | null
  dishes: Array<{
    id: string
    name: string | null
    course_name: string | null
    course_number: number | null
    description: string | null
  }>
}

export type PassiveRecipeSource = {
  id: string
  name: string | null
  category: string | null
  description: string | null
  photo_url: string | null
  times_cooked: number | null
  cuisine: string | null
  meal_type: string | null
  occasion_tags: string[] | null
  total_cost_cents: number | null
  cost_per_serving_cents: number | null
}

export type PassiveEventSource = {
  id: string
  event_date: string | null
  occasion: string | null
  service_style: string | null
  guest_count: number | null
  quoted_price_cents: number | null
  deposit_amount_cents: number | null
  menu: {
    name: string | null
  } | null
}

export type PassiveChefSourceContext = {
  chefId: string
  chefName: string
  profileImageUrl: string | null
  bookingBasePriceCents: number | null
  bookingPricingType: 'flat_rate' | 'per_person' | null
  bookingDepositType: 'percent' | 'fixed' | null
  bookingDepositPercent: number | null
  bookingDepositFixedCents: number | null
}

export type PassiveStoreSourceBundle = {
  chef: PassiveChefSourceContext
  menus: PassiveMenuSource[]
  recipes: PassiveRecipeSource[]
  events: PassiveEventSource[]
}
