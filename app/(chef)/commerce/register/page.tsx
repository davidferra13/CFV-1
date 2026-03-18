// POS Register Page - product grid + cart + payment
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { listProducts } from '@/lib/commerce/product-actions'
import { getCurrentRegisterSession } from '@/lib/commerce/register-actions'

const PosRegister = dynamic(
  () => import('@/components/commerce/pos-register').then((m) => m.PosRegister),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-600 border-t-brand-500" />
      </div>
    ),
    ssr: false,
  }
)
import { getPaymentTerminalAdapter } from '@/lib/commerce/terminal'
import { getPosHardwareStack } from '@/lib/commerce/hardware'
import { getRecipes } from '@/lib/recipes/actions'
import { getSalesTaxRate } from '@/lib/tax/api-ninjas'
import { listPromotions } from '@/lib/commerce/promotion-actions'
import { listOpenDiningChecks } from '@/lib/commerce/table-service-actions'

export const metadata: Metadata = { title: 'POS Register - ChefFlow' }

function readPositiveInt(value: string | undefined, fallback: number) {
  if (value == null) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return parsed
}

function readBooleanFlag(value: string | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export default async function RegisterPage() {
  const user = await requireChef()
  await requirePro('commerce')

  const terminal = getPaymentTerminalAdapter()
  const hardware = getPosHardwareStack()
  const supabase: any = createServerClient()
  const closeVarianceReasonThresholdCents = readPositiveInt(
    process.env.POS_CLOSE_REASON_THRESHOLD_CENTS,
    500
  )
  const managerApprovalRequired = readBooleanFlag(process.env.POS_ENFORCE_MANAGER_APPROVAL)
  const roleMatrixRequired = readBooleanFlag(process.env.POS_ENFORCE_ROLE_MATRIX)

  const [productsData, registerSession, terminalHealth, recipes, promotions, openDiningChecks] =
    await Promise.all([
      listProducts({ activeOnly: true }),
      getCurrentRegisterSession(),
      terminal.healthCheck(),
      getRecipes({ sort: 'name' }).catch(() => []),
      listPromotions({ activeOnly: true, limit: 40 }).catch(() => []),
      listOpenDiningChecks({ limit: 60 }).catch(() => []),
    ])

  let recentTransactions: Array<{
    saleId: string
    saleNumber: string
    status: string
    totalCents: number
    createdAt: string
    paymentMethod: string | null
    paymentStatus: string | null
  }> = []

  if (registerSession?.id) {
    const { data: registerSales } = await (supabase
      .from('sales')
      .select('id, sale_number, status, total_cents, created_at')
      .eq('tenant_id', user.tenantId!)
      .eq('register_session_id', registerSession.id)
      .order('created_at', { ascending: false })
      .limit(20) as any)

    const saleIds = (registerSales ?? []).map((sale: any) => sale.id).filter(Boolean)
    const paymentBySaleId = new Map<string, any>()

    if (saleIds.length > 0) {
      const { data: payments } = await (supabase
        .from('commerce_payments')
        .select('sale_id, payment_method, status, created_at')
        .eq('tenant_id', user.tenantId!)
        .in('sale_id', saleIds)
        .order('created_at', { ascending: false }) as any)

      for (const payment of payments ?? []) {
        if (!payment?.sale_id || paymentBySaleId.has(payment.sale_id)) continue
        paymentBySaleId.set(payment.sale_id, payment)
      }
    }

    recentTransactions = (registerSales ?? []).map((sale: any) => {
      const payment = paymentBySaleId.get(sale.id) ?? null
      return {
        saleId: sale.id as string,
        saleNumber: String(sale.sale_number ?? ''),
        status: String(sale.status ?? ''),
        totalCents: Number(sale.total_cents ?? 0),
        createdAt: String(sale.created_at ?? ''),
        paymentMethod: payment?.payment_method ? String(payment.payment_method) : null,
        paymentStatus: payment?.status ? String(payment.status) : null,
      }
    })
  }

  // Fetch chef's zip for default tax calculation
  let defaultTaxZip: string | undefined
  let defaultTaxRate: number | undefined
  let taxServiceAvailable: boolean | undefined
  try {
    const { data: chef } = await supabase
      .from('chefs')
      .select('zip')
      .eq('id', user.tenantId!)
      .single()
    const chefZip = String((chef as any)?.zip ?? '').trim()
    if (chefZip) {
      defaultTaxZip = chefZip
      const rates = await getSalesTaxRate(chefZip)
      taxServiceAvailable = !!rates
      if (rates) {
        defaultTaxRate = rates.combined_rate
      }
    }
  } catch {
    // non-blocking - POS works without tax zip
  }

  // Cast products: product_projections.modifiers is Json|null, PosRegister expects any[]
  const products = productsData.products.map((p: any) => ({
    ...p,
    modifiers: Array.isArray(p.modifiers) ? p.modifiers : [],
  }))
  const recipeOptions = recipes.map((recipe: any) => ({
    id: recipe.id as string,
    name: recipe.name as string,
    category: (recipe.category as string | null) ?? null,
    totalCostCents:
      typeof recipe.total_cost_cents === 'number' ? (recipe.total_cost_cents as number) : null,
    hasAllPrices:
      typeof recipe.has_all_prices === 'boolean' ? (recipe.has_all_prices as boolean) : null,
  }))

  return (
    <PosRegister
      products={products}
      recipeOptions={recipeOptions}
      registerSession={registerSession}
      defaultTaxZip={defaultTaxZip}
      defaultTaxRate={defaultTaxRate}
      taxServiceAvailable={taxServiceAvailable}
      terminalHealth={terminalHealth}
      hardwareCapabilities={hardware.capabilities}
      recentTransactions={recentTransactions}
      closeVarianceReasonThresholdCents={closeVarianceReasonThresholdCents}
      managerApprovalRequired={managerApprovalRequired}
      roleMatrixRequired={roleMatrixRequired}
      activePromotions={promotions.map((promotion: any) => ({
        code: promotion.code,
        name: promotion.name,
        autoApply: promotion.autoApply,
      }))}
      openDiningChecks={openDiningChecks.map((check: any) => ({
        id: check.id,
        tableLabel: check.tableLabel,
        guestName: check.guestName,
        guestCount: check.guestCount,
        openedAt: check.openedAt,
      }))}
    />
  )
}
