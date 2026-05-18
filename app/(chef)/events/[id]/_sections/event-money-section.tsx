// Server component: fetches money-tab data for a single event
import { requireChef } from '@/lib/auth/get-user'
import { getRegionalSettings } from '@/lib/chef/actions'
import { getEventExpenses, getEventProfitSummary, getBudgetGuardrail } from '@/lib/expenses/actions'
import { getEventLoyaltyImpactByTenant, getLoyaltyTransactions } from '@/lib/loyalty/actions'
import { getMenuLibraryForEvent } from '@/lib/menus/showcase-actions'
import { getMenuApprovalStatus } from '@/lib/events/menu-approval-actions'
import { getPaymentPlan } from '@/lib/finance/payment-plan-actions'
import { getMileageLogs } from '@/lib/finance/mileage-actions'
import { getEventTips } from '@/lib/finance/tip-actions'
import { getEventPricingIntelligence } from '@/lib/finance/event-pricing-intelligence-actions'
import { getCancellationRefundRecommendation } from '@/lib/cancellation/refund-actions'
import { getEventCollaborators } from '@/lib/collaboration/actions'
import { getEventSettlement } from '@/lib/collaboration/settlement-actions'
import { getGuestCountHistory } from '@/lib/guests/count-changes'
import { getChefArchetype } from '@/lib/archetypes/actions'
import { getEventReadinessAssistant } from '@/lib/events/event-readiness-assistant-actions'
import { getTakeAChefEventFinance } from '@/lib/integrations/take-a-chef-finance-actions'
import { forecastMenuCost, type CostForecast } from '@/lib/openclaw/cost-forecast-actions'
import { saveMarginSnapshot } from '@/lib/pricing/margin-snapshot-actions'
import { refreshIngredientCostsForTenant } from '@/lib/pricing/cost-refresh-actions'
import { getEventProfitabilityCockpit } from '@/lib/finance/profitability-cockpit-actions'
import { createServerClient } from '@/lib/db/server'
import { EventDetailMoneyTab } from '../_components/event-detail-money-tab'

async function getEventMenusForCheck(eventId: string): Promise<string[] | null> {
  const db: any = createServerClient()
  const { data: menus } = await db.from('menus').select('id, name').eq('event_id', eventId)
  if (!menus || menus.length === 0) return null
  return menus.map((m: any) => m.id)
}

async function getEventFinancialSummary(eventId: string) {
  const db: any = createServerClient()
  const { data: summary } = await db
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()
  return {
    totalPaid: summary?.total_paid_cents ?? 0,
    totalRefunded: summary?.total_refunded_cents ?? 0,
    outstandingBalance: summary?.outstanding_balance_cents ?? 0,
    paymentStatus: summary?.payment_status ?? null,
    financialAvailable: Boolean(summary),
  }
}

async function getEventMenuCostSummary(eventId: string) {
  const db: any = createServerClient()
  const { data } = await db
    .from('menu_cost_summary')
    .select(
      'total_recipe_cost_cents, cost_per_guest_cents, food_cost_percentage, total_component_count, has_all_recipe_costs'
    )
    .eq('event_id', eventId)
    .single()
  if (!data) return null
  return {
    totalRecipeCostCents: data.total_recipe_cost_cents as number | null,
    costPerGuestCents: data.cost_per_guest_cents as number | null,
    foodCostPercentage: data.food_cost_percentage as number | null,
    totalComponentCount: data.total_component_count as number | null,
    hasAllRecipeCosts: data.has_all_recipe_costs as boolean | null,
  }
}

type Props = {
  eventId: string
  tenantId: string
  event: any
  activeTab: string
}

export async function EventMoneySection({ eventId, tenantId, event, activeTab }: Props) {
  const user = await requireChef()
  const isCompletedOrBeyond = ['completed', 'in_progress'].includes(event.status)

  const [
    { totalPaid, totalRefunded, outstandingBalance },
    eventMenus,
    eventExpenseData,
    profitSummary,
    budgetGuardrail,
    menuApprovalData,
    paymentPlanInstallments,
    mileageEntries,
    eventTips,
    pricingIntelligence,
    chefArchetype,
    menuCostSummary,
    settlement,
    ledgerEntries,
    guestCountChanges,
    regionalSettings,
    menuLibraryData,
    takeAChefFinance,
    profitabilityCockpit,
  ] = await Promise.all([
    getEventFinancialSummary(eventId).catch(() => ({
      totalPaid: 0,
      totalRefunded: 0,
      outstandingBalance: 0,
      paymentStatus: null,
      financialAvailable: false,
    })),
    getEventMenusForCheck(eventId).catch(() => [] as string[]),
    getEventExpenses(eventId).catch(() => ({ expenses: [], totalCents: 0 })),
    getEventProfitSummary(eventId).catch(() => null),
    getBudgetGuardrail(eventId).catch(() => null),
    getMenuApprovalStatus(eventId).catch(() => null),
    getPaymentPlan(eventId).catch(() => []),
    getMileageLogs().catch(() => []),
    getEventTips(eventId).catch(() => []),
    getEventPricingIntelligence(eventId).catch(() => null),
    getChefArchetype().catch(() => null),
    getEventMenuCostSummary(eventId).catch(() => null),
    getEventSettlement(eventId).catch(() => null),
    import('@/lib/events/offline-payment-actions')
      .then((m) => m.getEventLedgerEntries(eventId))
      .catch(() => []),
    getGuestCountHistory(eventId).catch(() => []),
    getRegionalSettings().catch(() => ({
      currencyCode: 'USD' as const,
      locale: 'en-US' as const,
      measurementSystem: 'imperial' as const,
    })),
    event.status !== 'cancelled'
      ? getMenuLibraryForEvent(eventId).catch(() => ({ menus: [], preferences: null }))
      : Promise.resolve({ menus: [], preferences: null }),
    getTakeAChefEventFinance(eventId).catch(() => null),
    getEventProfitabilityCockpit(eventId).catch(() => null),
  ])

  // Loyalty
  const eventLoyaltyTxs =
    event.status === 'completed' && event.client_id
      ? await getLoyaltyTransactions(event.client_id)
          .then((txs) => txs.filter((tx) => tx.event_id === eventId))
          .catch(() => [])
      : []
  const eventLoyaltyPoints = (eventLoyaltyTxs as { points: number }[]).reduce(
    (sum, tx) => sum + tx.points,
    0
  )

  // Refund recommendation
  const refundRecommendationData =
    event.status === 'cancelled' && totalPaid > 0
      ? await getCancellationRefundRecommendation(eventId).catch(() => null)
      : null

  // Readiness assistant
  const readinessAssistant = await getEventReadinessAssistant(eventId, pricingIntelligence).catch(
    () => null
  )

  // Cost forecast
  let costForecast: CostForecast | null = null
  if (eventMenus && eventMenus.length > 0 && event.event_date) {
    const eventDay = new Date(event.event_date)
    if (eventDay > new Date()) {
      costForecast = await forecastMenuCost(eventMenus[0], event.event_date).catch(() => null)
    }
  }

  // Persist margin snapshot (fire-and-forget)
  if (pricingIntelligence) {
    saveMarginSnapshot(pricingIntelligence, 'page_view').catch(() => {})
  }

  // Lazy cost refresh (non-blocking)
  if (!menuCostSummary || !menuCostSummary.hasAllRecipeCosts) {
    if (event.menu_id) {
      const db: any = createServerClient()
      void db
        .from('components')
        .select('recipe_id, dishes!inner(menu_id)')
        .eq('dishes.menu_id', event.menu_id)
        .not('recipe_id', 'is', null)
        .then(({ data: comps }: any) => {
          if (!comps || comps.length === 0) return
          const recipeIds = [...new Set(comps.map((c: any) => c.recipe_id))]
          return db.from('recipe_ingredients').select('ingredient_id').in('recipe_id', recipeIds)
        })
        .then((res: any) => {
          if (!res?.data || res.data.length === 0) return
          const ingredientIds = [
            ...new Set(res.data.map((ri: any) => ri.ingredient_id)),
          ] as string[]
          if (ingredientIds.length === 0) return
          return refreshIngredientCostsForTenant(user.tenantId!, ingredientIds)
        })
        .catch(() => {})
    }
  }

  return (
    <EventDetailMoneyTab
      activeTab={activeTab as any}
      event={event}
      menuLibraryData={menuLibraryData}
      eventMenus={eventMenus as any}
      menuApprovalData={menuApprovalData}
      totalPaid={totalPaid}
      outstandingBalance={outstandingBalance}
      paymentPlanInstallments={paymentPlanInstallments}
      mileageEntries={mileageEntries}
      eventTips={eventTips}
      refundRecommendationData={refundRecommendationData}
      totalRefunded={totalRefunded}
      budgetGuardrail={budgetGuardrail}
      eventExpenseData={eventExpenseData}
      profitSummary={profitSummary}
      eventLoyaltyPoints={eventLoyaltyPoints}
      takeAChefFinance={takeAChefFinance}
      costForecast={costForecast}
      menuCostSummary={menuCostSummary}
      chefArchetype={chefArchetype}
      pricingIntelligence={pricingIntelligence}
      readinessAssistant={readinessAssistant}
      settlement={settlement}
      ledgerEntries={ledgerEntries as any[]}
      guestCountChanges={guestCountChanges}
      regionalSettings={regionalSettings}
      profitabilityCockpit={profitabilityCockpit}
    />
  )
}
