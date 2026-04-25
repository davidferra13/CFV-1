import crypto from 'crypto'
import { createAdminClient } from '@/lib/db/admin'
import { createServerClient } from '@/lib/db/server'
import { getCurrentUser, requireChef, requireClient } from '@/lib/auth/get-user'
import { findChefByPublicSlug, getPublicChefPathSlug } from '@/lib/profile/public-chef'
import { buildPassiveProducts } from './core'
import {
  getPassiveStoreSyncState,
  markPassiveStoreSyncFailure,
  markPassiveStoreSyncSuccess,
} from './sync-state'
import type {
  PassiveChefSourceContext,
  PassiveProduct,
  PassiveProductDraft,
  PassivePurchase,
  PassiveStoreSourceBundle,
} from './types'

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

type PublicChefStoreContext = {
  id: string
  slug: string | null
  booking_slug: string | null
  display_name: string | null
  business_name: string | null
  profile_image_url: string | null
  booking_base_price_cents: number | null
  booking_pricing_type: 'flat_rate' | 'per_person' | null
  booking_deposit_type: 'percent' | 'fixed' | null
  booking_deposit_percent: number | null
  booking_deposit_fixed_cents: number | null
}

export type PassiveStorefrontData = {
  chefId: string
  chefSlug: string
  chefName: string
  products: PassiveProduct[]
}

export type PassiveStorePurchaseResult = {
  purchase: PassivePurchase
  orderUrl: string
  chefSlug: string
}

function toChefSourceContext(chef: PublicChefStoreContext): PassiveChefSourceContext {
  return {
    chefId: chef.id,
    chefName: chef.display_name?.trim() || chef.business_name?.trim() || 'Chef',
    profileImageUrl: chef.profile_image_url,
    bookingBasePriceCents: chef.booking_base_price_cents,
    bookingPricingType: chef.booking_pricing_type,
    bookingDepositType: chef.booking_deposit_type,
    bookingDepositPercent: chef.booking_deposit_percent,
    bookingDepositFixedCents: chef.booking_deposit_fixed_cents,
  }
}

function toPassiveProduct(row: any): PassiveProduct {
  return {
    product_id: row.product_id,
    chef_id: row.chef_id,
    source_type: row.source_type,
    source_id: row.source_id,
    product_type: row.product_type,
    title: row.title,
    description: row.description,
    price: Number(row.price ?? 0),
    fulfillment_type: row.fulfillment_type,
    status: row.status,
    product_key: row.product_key,
    preview_image_url: row.preview_image_url ?? null,
    metadata: row.metadata ?? {},
    generated_payload: row.generated_payload ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toTransientPassiveProduct(draft: PassiveProductDraft): PassiveProduct {
  const now = new Date().toISOString()

  return {
    product_id: `draft:${draft.product_key}`,
    chef_id: draft.chef_id,
    source_type: draft.source_type,
    source_id: draft.source_id,
    product_type: draft.product_type,
    title: draft.title,
    description: draft.description,
    price: draft.price,
    fulfillment_type: draft.fulfillment_type,
    status: draft.status ?? 'active',
    product_key: draft.product_key,
    preview_image_url: draft.preview_image_url ?? null,
    metadata: draft.metadata,
    generated_payload: draft.generated_payload,
    created_at: now,
    updated_at: now,
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '')
  }
  return String(error)
}

function isMissingPassiveStoreTable(error: unknown): boolean {
  const message = getErrorMessage(error)
  return (
    message.includes('relation "passive_products" does not exist') ||
    message.includes('relation "passive_product_purchases" does not exist')
  )
}

function toPassivePurchase(row: any): PassivePurchase {
  return {
    purchase_id: row.purchase_id,
    product_id: row.product_id,
    chef_id: row.chef_id,
    buyer_auth_user_id: row.buyer_auth_user_id ?? null,
    buyer_client_id: row.buyer_client_id ?? null,
    buyer_name: row.buyer_name,
    buyer_email: row.buyer_email,
    recipient_name: row.recipient_name ?? null,
    recipient_email: row.recipient_email ?? null,
    amount_cents: Number(row.amount_cents ?? 0),
    status: row.status,
    fulfillment_type: row.fulfillment_type,
    product_snapshot: row.product_snapshot ?? {},
    fulfillment_snapshot: row.fulfillment_snapshot ?? {},
    access_token: row.access_token,
    created_at: row.created_at,
  }
}

function generateGiftCertificateCode(): string {
  const bytes = crypto.randomBytes(8)
  let code = ''
  for (let index = 0; index < 8; index += 1) {
    code += CODE_CHARS[bytes[index] % CODE_CHARS.length]
  }
  return code
}

function defaultGiftCertificateExpiry(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 5)
  return date.toISOString()
}

function generateAccessToken(): string {
  return crypto.randomBytes(18).toString('base64url')
}

async function resolveChefStoreContextBySlug(
  db: any,
  slug: string
): Promise<PublicChefStoreContext | null> {
  const result = await findChefByPublicSlug<PublicChefStoreContext>(
    db,
    slug,
    [
      'id',
      'slug',
      'booking_slug',
      'display_name',
      'business_name',
      'profile_image_url',
      'booking_base_price_cents',
      'booking_pricing_type',
      'booking_deposit_type',
      'booking_deposit_percent',
      'booking_deposit_fixed_cents',
    ].join(', ')
  )

  return result.data ?? null
}

async function getChefStoreContextById(db: any, chefId: string): Promise<PublicChefStoreContext> {
  const { data, error } = await db
    .from('chefs')
    .select(
      [
        'id',
        'slug',
        'booking_slug',
        'display_name',
        'business_name',
        'profile_image_url',
        'booking_base_price_cents',
        'booking_pricing_type',
        'booking_deposit_type',
        'booking_deposit_percent',
        'booking_deposit_fixed_cents',
      ].join(', ')
    )
    .eq('id', chefId)
    .single()

  if (error || !data) {
    throw new Error('Chef not found')
  }

  return data as PublicChefStoreContext
}

async function fetchPassiveStoreSourceBundle(
  db: any,
  chef: PublicChefStoreContext
): Promise<PassiveStoreSourceBundle> {
  const [menusResult, recipesResult, eventsResult] = await Promise.all([
    db
      .from('menus')
      .select(
        `
        id,
        name,
        description,
        cuisine_type,
        service_style,
        target_guest_count,
        price_per_person_cents,
        times_used,
        is_showcase,
        dishes (
          id,
          name,
          course_name,
          course_number,
          description
        )
      `
      )
      .eq('tenant_id', chef.id)
      .neq('status', 'archived')
      .order('times_used', { ascending: false })
      .limit(8),
    db
      .from('recipes')
      .select(
        [
          'id',
          'name',
          'category',
          'description',
          'photo_url',
          'times_cooked',
          'cuisine',
          'meal_type',
          'occasion_tags',
          'total_cost_cents',
          'cost_per_serving_cents',
        ].join(', ')
      )
      .eq('tenant_id', chef.id)
      .eq('archived', false)
      .order('times_cooked', { ascending: false })
      .limit(32),
    db
      .from('events')
      .select(
        `
        id,
        event_date,
        occasion,
        service_style,
        guest_count,
        quoted_price_cents,
        deposit_amount_cents,
        menu:menus(name)
      `
      )
      .eq('tenant_id', chef.id)
      .eq('status', 'completed')
      .order('event_date', { ascending: false })
      .limit(12),
  ])

  return {
    chef: toChefSourceContext(chef),
    menus: (menusResult.data ?? []) as PassiveStoreSourceBundle['menus'],
    recipes: (recipesResult.data ?? []) as PassiveStoreSourceBundle['recipes'],
    events: (eventsResult.data ?? []) as PassiveStoreSourceBundle['events'],
  }
}

async function hideStalePassiveProducts(db: any, chefId: string, activeKeys: string[]) {
  const { data: existing } = await db
    .from('passive_products')
    .select('product_id, product_key, status')
    .eq('chef_id', chefId)

  const stale = (existing ?? []).filter(
    (row: any) => !activeKeys.includes(String(row.product_key)) && row.status !== 'hidden'
  )

  if (stale.length === 0) return

  await Promise.all(
    stale.map((row: any) =>
      db.from('passive_products').update({ status: 'hidden' }).eq('product_id', row.product_id)
    )
  )
}

async function listActivePassiveProducts(db: any, chefId: string): Promise<PassiveProduct[]> {
  const { data, error } = await db
    .from('passive_products')
    .select('*')
    .eq('chef_id', chefId)
    .eq('status', 'active')
    .order('price', { ascending: true })

  if (error) {
    console.error('[listActivePassiveProducts] select error:', error)
    throw error
  }

  return (data ?? []).map(toPassiveProduct)
}

async function loadActiveProductsWithFallback(db: any, chefId: string): Promise<PassiveProduct[]> {
  const products = await listActivePassiveProducts(db, chefId)
  const syncState = await getPassiveStoreSyncState(chefId)

  if (products.length > 0 && syncState?.dirty === false) {
    return products
  }

  await syncPassiveProductsForChef(chefId)
  return listActivePassiveProducts(db, chefId)
}

export async function syncPassiveProductsForChef(chefId: string): Promise<PassiveProduct[]> {
  try {
    const db: any = createServerClient({ admin: true })
    const chef = await getChefStoreContextById(db, chefId)
    const bundle = await fetchPassiveStoreSourceBundle(db, chef)
    const drafts = buildPassiveProducts(bundle)

    if (drafts.length === 0) {
      await hideStalePassiveProducts(db, chef.id, [])
      await markPassiveStoreSyncSuccess(chef.id)
      return []
    }

    const rows = drafts.map((draft: PassiveProductDraft) => ({
      chef_id: draft.chef_id,
      source_type: draft.source_type,
      source_id: draft.source_id,
      product_type: draft.product_type,
      title: draft.title,
      description: draft.description,
      price: draft.price,
      fulfillment_type: draft.fulfillment_type,
      status: draft.status ?? 'active',
      product_key: draft.product_key,
      preview_image_url: draft.preview_image_url,
      metadata: draft.metadata,
      generated_payload: draft.generated_payload,
    }))

    const { data, error } = await db
      .from('passive_products')
      .upsert(rows, { onConflict: 'chef_id,product_key' })
      .select('*')

    if (error) {
      console.error('[syncPassiveProductsForChef] upsert error:', error)
      if (isMissingPassiveStoreTable(error)) {
        return drafts.map(toTransientPassiveProduct)
      }
      throw new Error('Failed to sync passive products')
    }

    await hideStalePassiveProducts(
      db,
      chef.id,
      drafts.map((draft) => draft.product_key)
    )

    await markPassiveStoreSyncSuccess(chef.id)
    return (data ?? []).map(toPassiveProduct)
  } catch (error) {
    await markPassiveStoreSyncFailure(chefId, error).catch((failureError) => {
      console.error('[syncPassiveProductsForChef] failed to persist sync failure:', failureError)
    })
    throw error
  }
}

export async function syncPassiveProductsForAllChefs(limit?: number | null) {
  const db: any = createAdminClient()
  const { data: chefs, error } = await db
    .from('chefs')
    .select('id, slug, booking_slug')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to load chefs: ${error.message}`)
  }

  const eligibleChefs = (chefs ?? []).filter(
    (chef: { slug?: string | null; booking_slug?: string | null }) =>
      Boolean(chef.slug?.trim() || chef.booking_slug?.trim())
  )
  const targetChefs =
    typeof limit === 'number' && limit > 0 ? eligibleChefs.slice(0, limit) : eligibleChefs

  const results: Array<{ chefId: string; productCount: number }> = []
  for (const chef of targetChefs) {
    const products = await syncPassiveProductsForChef(chef.id)
    results.push({ chefId: chef.id, productCount: products.length })
  }

  return results
}

export async function getPassiveStorefrontBySlug(
  slug: string
): Promise<PassiveStorefrontData | null> {
  const db: any = createServerClient({ admin: true })
  const chef = await resolveChefStoreContextBySlug(db, slug)
  if (!chef) return null

  const canonicalSlug = getPublicChefPathSlug(chef) || slug
  let products: PassiveProduct[]

  try {
    products = await loadActiveProductsWithFallback(db, chef.id)
  } catch (error) {
    console.error('[getPassiveStorefrontBySlug] load error:', error)
    if (isMissingPassiveStoreTable(error)) {
      const syncedProducts = await syncPassiveProductsForChef(chef.id)
      return {
        chefId: chef.id,
        chefSlug: canonicalSlug,
        chefName: chef.display_name?.trim() || chef.business_name?.trim() || 'Chef',
        products: syncedProducts.filter((product) => product.status === 'active'),
      }
    }
    throw new Error('Failed to load storefront')
  }

  return {
    chefId: chef.id,
    chefSlug: canonicalSlug,
    chefName: chef.display_name?.trim() || chef.business_name?.trim() || 'Chef',
    products,
  }
}

export async function getPassiveProductForPublicCheckout(slug: string, productId: string) {
  const db: any = createServerClient({ admin: true })
  const chef = await resolveChefStoreContextBySlug(db, slug)
  if (!chef) return null

  let products: PassiveProduct[]

  try {
    products = await loadActiveProductsWithFallback(db, chef.id)
  } catch (error) {
    console.error('[getPassiveProductForPublicCheckout] load error:', error)
    if (isMissingPassiveStoreTable(error)) {
      const syncedProducts = await syncPassiveProductsForChef(chef.id)
      const product = syncedProducts.find(
        (candidate) => candidate.product_id === productId && candidate.status === 'active'
      )
      if (!product) return null
      return {
        chefId: chef.id,
        chefSlug: getPublicChefPathSlug(chef) || slug,
        chefName: chef.display_name?.trim() || chef.business_name?.trim() || 'Chef',
        product,
      }
    }
    return null
  }

  const product = products.find((candidate) => candidate.product_id === productId)
  if (!product) return null

  return {
    chefId: chef.id,
    chefSlug: getPublicChefPathSlug(chef) || slug,
    chefName: chef.display_name?.trim() || chef.business_name?.trim() || 'Chef',
    product,
  }
}

async function createGiftCertificateForPurchase(
  db: any,
  input: {
    chefId: string
    amountCents: number
    buyerName: string
    buyerEmail: string
    recipientName?: string | null
    recipientEmail?: string | null
    productTitle: string
  }
) {
  let code = ''

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = generateGiftCertificateCode()
    const { data: existing } = await db
      .from('gift_certificates')
      .select('id')
      .eq('code', candidate)
      .maybeSingle()

    if (!existing) {
      code = candidate
      break
    }
  }

  if (!code) throw new Error('Failed to generate a unique gift certificate code')

  const { data, error } = await db
    .from('gift_certificates')
    .insert({
      tenant_id: input.chefId,
      code,
      amount_cents: input.amountCents,
      balance_cents: input.amountCents,
      purchaser_name: input.buyerName,
      purchaser_email: input.buyerEmail,
      recipient_name: input.recipientName ?? null,
      recipient_email: input.recipientEmail ?? null,
      message: `Purchased from passive storefront: ${input.productTitle}`,
      expires_at: defaultGiftCertificateExpiry(),
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[createGiftCertificateForPurchase] insert error:', error)
    throw new Error('Failed to create the prepaid credit')
  }

  return data
}

export async function purchasePassiveProduct(input: {
  chefSlug: string
  productId: string
  buyerName: string
  buyerEmail: string
  recipientName?: string | null
  recipientEmail?: string | null
}): Promise<PassiveStorePurchaseResult> {
  const db: any = createServerClient({ admin: true })
  const chef = await resolveChefStoreContextBySlug(db, input.chefSlug)
  if (!chef) throw new Error('Chef not found')

  await syncPassiveProductsForChef(chef.id)

  const { data: productRow, error: productError } = await db
    .from('passive_products')
    .select('*')
    .eq('chef_id', chef.id)
    .eq('product_id', input.productId)
    .eq('status', 'active')
    .single()

  if (productError || !productRow) {
    throw new Error('Product not found')
  }

  const product = toPassiveProduct(productRow)
  const currentUser = await getCurrentUser().catch(() => null)
  const buyerClientId =
    currentUser?.role === 'client' && currentUser.tenantId === chef.id ? currentUser.entityId : null

  let fulfillmentSnapshot: Record<string, unknown>

  if (product.fulfillment_type === 'booking' || product.fulfillment_type === 'code') {
    const certificate = await createGiftCertificateForPurchase(db, {
      chefId: chef.id,
      amountCents: product.price,
      buyerName: input.buyerName.trim(),
      buyerEmail: input.buyerEmail.trim(),
      recipientName: input.recipientName ?? null,
      recipientEmail: input.recipientEmail ?? null,
      productTitle: product.title,
    })

    fulfillmentSnapshot = {
      kind: product.fulfillment_type === 'booking' ? 'stored_credit' : 'gift_card_code',
      gift_certificate_id: certificate.id,
      code: certificate.code,
      amount_cents: certificate.amount_cents,
      balance_cents: certificate.balance_cents,
      expires_at: certificate.expires_at,
    }
  } else {
    fulfillmentSnapshot = {
      kind: 'digital_access',
      ready: true,
      payload: product.generated_payload,
    }
  }

  const accessToken = generateAccessToken()
  const canonicalSlug = getPublicChefPathSlug(chef) || input.chefSlug
  const productSnapshot = {
    product_id: product.product_id,
    title: product.title,
    description: product.description,
    product_type: product.product_type,
    fulfillment_type: product.fulfillment_type,
    source_type: product.source_type,
    source_id: product.source_id,
    price: product.price,
    chef_name: chef.display_name?.trim() || chef.business_name?.trim() || 'Chef',
    chef_slug: canonicalSlug,
    generated_payload: product.generated_payload,
  }

  const { data: purchaseRow, error: purchaseError } = await db
    .from('passive_product_purchases')
    .insert({
      product_id: product.product_id,
      chef_id: chef.id,
      buyer_auth_user_id: currentUser?.authUserId ?? null,
      buyer_client_id: buyerClientId,
      buyer_name: input.buyerName.trim(),
      buyer_email: input.buyerEmail.trim(),
      recipient_name: input.recipientName?.trim() || null,
      recipient_email: input.recipientEmail?.trim() || null,
      amount_cents: product.price,
      status: 'fulfilled',
      fulfillment_type: product.fulfillment_type,
      product_snapshot: productSnapshot,
      fulfillment_snapshot: fulfillmentSnapshot,
      access_token: accessToken,
    })
    .select('*')
    .single()

  if (purchaseError || !purchaseRow) {
    console.error('[purchasePassiveProduct] insert error:', purchaseError)
    throw new Error('Failed to complete the purchase')
  }

  const purchase = toPassivePurchase(purchaseRow)

  return {
    purchase,
    chefSlug: canonicalSlug,
    orderUrl: `/chef/${canonicalSlug}/store/orders/${accessToken}`,
  }
}

export async function getPassivePurchaseByToken(token: string): Promise<PassivePurchase | null> {
  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('passive_product_purchases')
    .select('*')
    .eq('access_token', token)
    .maybeSingle()

  if (error) {
    console.error('[getPassivePurchaseByToken] select error:', error)
    return null
  }

  return data ? toPassivePurchase(data) : null
}

export async function getPassiveStorefrontOverviewForChef() {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const chef = await getChefStoreContextById(db, user.tenantId!)
  const products = await loadActiveProductsWithFallback(db, user.tenantId!)

  const { data: purchases, error } = await db
    .from('passive_product_purchases')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(24)

  if (error) {
    console.error('[getPassiveStorefrontOverviewForChef] purchase error:', error)
  }

  const purchaseRows: PassivePurchase[] = (purchases ?? []).map(toPassivePurchase)
  const revenueCents = purchaseRows.reduce(
    (sum: number, purchase: PassivePurchase) => sum + purchase.amount_cents,
    0
  )

  return {
    chefSlug: getPublicChefPathSlug(chef) || '',
    chefName: chef.display_name?.trim() || chef.business_name?.trim() || 'Chef',
    products,
    purchases: purchaseRows,
    metrics: {
      revenueCents,
      orderCount: purchaseRows.length,
      activeProductCount: products.filter((product) => product.status === 'active').length,
    },
  }
}

export async function getPassivePurchasesForCurrentClient() {
  const user = await requireClient()
  const db: any = createServerClient({ admin: true })

  const [authResult, clientResult] = await Promise.all([
    db
      .from('passive_product_purchases')
      .select('*')
      .eq('buyer_auth_user_id', user.authUserId)
      .order('created_at', { ascending: false })
      .limit(24),
    db
      .from('passive_product_purchases')
      .select('*')
      .eq('buyer_client_id', user.entityId)
      .order('created_at', { ascending: false })
      .limit(24),
  ])

  const merged = new Map<string, PassivePurchase>()
  for (const row of [...(authResult.data ?? []), ...(clientResult.data ?? [])]) {
    const purchase = toPassivePurchase(row)
    merged.set(purchase.purchase_id, purchase)
  }

  return Array.from(merged.values()).sort((a, b) => b.created_at.localeCompare(a.created_at))
}
