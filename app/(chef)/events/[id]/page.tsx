// Chef Event Detail Page
// Shows comprehensive event information and allows state transitions

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRegionalSettings } from '@/lib/chef/actions'
import {
  getEventById,
  getEventClosureStatus,
  updateEventTimeAndCard,
  startEventActivity,
  stopEventActivity,
} from '@/lib/events/actions'
import { getAARByEventId } from '@/lib/aar/actions'
import { getDocumentReadiness, getBusinessDocInfo } from '@/lib/documents/actions'
import { hasAllergyData } from '@/lib/documents/generate-allergy-card'
import { getEventExpenses, getEventProfitSummary, getBudgetGuardrail } from '@/lib/expenses/actions'
import { getUnrecordedComponentsForEvent } from '@/lib/recipes/actions'
import { isAIConfigured } from '@/lib/ai/parse'
import { getEventDOPProgress } from '@/lib/scheduling/actions'
import { getEventLoyaltyImpactByTenant, getLoyaltyTransactions } from '@/lib/loyalty/actions'
import { getMessageThread, getResponseTemplates } from '@/lib/messages/actions'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { ChefEventCountdown } from '@/components/events/chef-event-countdown'
import { OpsPulseCard } from '@/components/events/ops-pulse-card'
import { DietaryComplexityBadge } from '@/components/events/dietary-complexity-badge'
import { EventRiskBadge } from '@/components/events/event-risk-badge'
import { ServiceSimulationRollupCard } from '@/components/events/service-simulation-rollup-card'
import { calculateDietaryComplexity } from '@/lib/formulas/dietary-complexity'
import { calculateEventRisk } from '@/lib/formulas/event-risk-score'
import { EventTransitions } from '@/components/events/event-transitions'
import { EventClosureActions } from '@/components/events/event-closure-actions'
import { DocumentSection } from '@/components/documents/document-section'
import { RecipeCapturePrompt } from '@/components/recipes/recipe-capture-prompt'
import { DOPProgressBar } from '@/components/scheduling/dop-view'
import { getEventModifications } from '@/lib/menus/modifications'
import { getUnusedIngredients } from '@/lib/expenses/unused'
import { getSubstitutions } from '@/lib/shopping/substitutions'
import { MenuModifications } from '@/components/events/menu-modifications'
import { UnusedIngredients } from '@/components/events/unused-ingredients'
import { ShoppingSubstitutions } from '@/components/events/shopping-substitutions'
import { TimeTracking } from '@/components/events/time-tracking'
import { MessageThread } from '@/components/messages/message-thread'
import { MessageLogForm } from '@/components/messages/message-log-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EventExportButton } from '@/components/exports/event-export-button'
import { EventActionsOverflow } from '@/components/events/event-actions-overflow'
import { QuickProposalButton } from '@/components/events/quick-proposal-button'
import { ChefGuestPanel } from '@/components/sharing/chef-guest-panel'
import { EventStatusRealtimeSync } from '@/components/events/event-status-realtime-sync'
import { getEventShares, getEventGuests, getEventRSVPSummary } from '@/lib/sharing/actions'
import { getEventPhotosForChef } from '@/lib/events/photo-actions'
import { EventPhotoGallery } from '@/components/events/event-photo-gallery'
import { getCancellationRefundRecommendation } from '@/lib/cancellation/refund-actions'
import { RecordPaymentPanel, ProcessRefundPanel } from '@/components/events/payment-actions-panel'
import { getEventMapUrl, geocode, getDirections } from '@/lib/maps/mapbox'
import { getChefPreferences } from '@/lib/chef/actions'
import { CostStaleBanner } from '@/components/pricing/cost-stale-banner'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import { createServerClient } from '@/lib/db/server'
import { getEventContingencyNotes, listEmergencyContacts } from '@/lib/contingency/actions'
import { getEventTempLog } from '@/lib/compliance/actions'
import { listStaffMembers, getEventStaffRoster } from '@/lib/staff/actions'
import { getMenuApprovalStatus } from '@/lib/events/menu-approval-actions'
import { ContingencyPanel } from '@/components/events/contingency-panel'
import { TempLogPanel } from '@/components/events/temp-log-panel'
import { EventStaffPanel } from '@/components/events/event-staff-panel'
import { MenuApprovalStatus } from '@/components/events/menu-approval-status'
import { MenuLibraryPicker } from '@/components/events/menu-library-picker'
import { getMenuLibraryForEvent } from '@/lib/menus/showcase-actions'
import { EventPrepSchedule } from '@/components/events/event-prep-schedule'
import { PrepBlockNudgeBanner } from '@/components/events/prep-block-nudge'
import { getEventPrepBlocks } from '@/lib/scheduling/prep-block-actions'
import { getParAlerts } from '@/lib/inventory/count-actions'
import { ReadinessGatePanel } from '@/components/events/readiness-gate-panel'
import { evaluateReadinessForDocumentGeneration, getEventReadiness } from '@/lib/events/readiness'
import { getEventReadinessAssistant } from '@/lib/events/event-readiness-assistant-actions'
import { getTakeAChefConversionData } from '@/lib/inquiries/take-a-chef-capture-actions'
import { getTakeAChefEventFinance } from '@/lib/integrations/take-a-chef-finance-actions'
import { getMarketplaceConversionData } from '@/lib/marketplace/conversion-actions'
import { MarketplaceConvertBanner } from '@/components/events/marketplace-convert-banner'
import { EventCollaboratorsPanel } from '@/components/events/event-collaborators-panel'
import { getEventCollaborators } from '@/lib/collaboration/actions'
import { getEventContacts } from '@/lib/events/contacts'
import { getEventSettlement } from '@/lib/collaboration/settlement-actions'
import { ContractSection } from '@/components/contracts/contract-section'
import { QuickReceiptCapture } from '@/components/events/quick-receipt-capture'
import { AvailableLeftovers } from '@/components/events/available-leftovers'
import { getAvailableCarryForwardItems } from '@/lib/events/carry-forward'
import { getPackingConfirmationCount } from '@/lib/packing/actions'
import { getPaymentPlan } from '@/lib/finance/payment-plan-actions'
import { PaymentPlanPanel } from '@/components/finance/payment-plan-panel'
import { getMileageLogs } from '@/lib/finance/mileage-actions'
import { MileageLogPanel } from '@/components/finance/mileage-log-panel'
import { getEventTips } from '@/lib/finance/tip-actions'
import { getEventPricingIntelligence } from '@/lib/finance/event-pricing-intelligence-actions'
import { TipLogPanel } from '@/components/finance/tip-log-panel'
import { QuickDebriefPrompt } from '@/components/events/quick-debrief-prompt'
import { BudgetTracker } from '@/components/events/budget-tracker'
import { WeatherPanel } from '@/components/events/weather-panel'
import { GeocodeAddressButton } from '@/components/events/geocode-address-button'
import { ClientPortalQR } from '@/components/events/client-portal-qr'
import {
  EventDetailMobileNav,
  EventDetailSection,
} from '@/components/events/event-detail-mobile-nav'
import { AllergenRiskPanel } from '@/components/ai/allergen-risk-panel'
import { ServiceTimelinePanel } from '@/components/ai/service-timeline-panel'
import { PrepTimelinePanel } from '@/components/ai/prep-timeline-panel'
import { StaffBriefingAIPanel } from '@/components/ai/staff-briefing-ai-panel'
import { ContingencyAIPanel } from '@/components/ai/contingency-ai-panel'
import { CarryForwardMatchPanel } from '@/components/ai/carry-forward-match-panel'
import { GroceryConsolidationPanel } from '@/components/ai/grocery-consolidation-panel'
import { MenuNutritionalPanel } from '@/components/ai/menu-nutritional-panel'
import { TempSafetyPanel } from '@/components/ai/temp-safety-panel'
import { ContractGeneratorPanel } from '@/components/ai/contract-generator-panel'
import { GuestCodePanel } from '@/components/events/guest-code-panel'
import { getEventGuestLeadCount } from '@/lib/guest-leads/actions'
import { HostMessageTemplate } from '@/components/sharing/host-message-template'
import { GuestMessagesPanel } from '@/components/events/guest-messages-panel'
import { PhotoConsentSummary } from '@/components/events/photo-consent-summary'
import { RSVPTrackerPanel } from '@/components/events/rsvp-tracker-panel'
import { getEventMessagesForChef } from '@/lib/guest-messages/actions'
import { getEntityActivityTimeline } from '@/lib/activity/entity-timeline'
import { getQrCodeUrl } from '@/lib/qr/qr-code'
import { shortenUrl } from '@/lib/links/url-shortener'
import { EventHubLinkPanel } from '@/components/hub/event-hub-link-panel'
import {
  getOrCreateChefCircleTokenForEvent,
  getOrCreateChefHubProfileToken,
} from '@/lib/hub/chef-circle-actions'
import { getEventTicketTypes, getEventTickets, getEventTicketSummary } from '@/lib/tickets/actions'
import { getClientMemory } from '@/lib/clients/client-memory-actions'
import { ContextInspector } from '@/components/inspector/context-inspector'
import { EventDetailOverviewTab } from './_components/event-detail-overview-tab'
import { EventDetailChatTab } from './_components/event-detail-chat-tab'
import { EventDetailMoneyTab } from './_components/event-detail-money-tab'
import { EventDetailTicketsTab } from './_components/event-detail-tickets-tab'
import { forecastMenuCost, type CostForecast } from '@/lib/openclaw/cost-forecast-actions'
import { EventDetailOpsTab } from './_components/event-detail-ops-tab'
import { EventDetailPrepTab } from './_components/event-detail-prep-tab'
import { EventDetailWrapTab } from './_components/event-detail-wrap-tab'
import { getEventPrepTimeline } from '@/lib/prep-timeline/actions'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { PreEventNerveCenter } from '@/components/events/pre-event-nerve-center'
import { EventIntelligencePanel } from '@/components/intelligence/event-intelligence-panel'
import { getLifecycleProgress } from '@/lib/lifecycle/actions'
import { getChefArchetype } from '@/lib/archetypes/actions'
import { LifecycleProgressPanel } from '@/components/lifecycle/lifecycle-progress-panel'
import { CompletionCard, CompletionCardSkeleton } from '@/components/completion/completion-card'
import { getCompletionForEntity } from '@/lib/completion/actions'
import { getGuestCountHistory } from '@/lib/guests/count-changes'
import { loadEventServiceSimulationPanelState } from '@/lib/service-simulation/state'
import { EventOperatingSpineCard } from '@/components/events/event-operating-spine-card'
import { buildChefEventOperatingSpine } from '@/lib/events/operating-spine'
import { getCourseProgress } from '@/lib/service-execution/actions'
import { DinnerCircleCommandCenter } from '@/components/events/dinner-circle-command-center'
import {
  PopUpOperatingPanel,
  type PopUpOperatingSnapshot,
} from '@/components/events/pop-up-operating-panel'
import {
  normalizePopUpConfig,
  type PopUpConfig,
  type PopUpMenuItemPlan,
  type PopUpProductLibraryItem,
} from '@/components/events/pop-up-model'
import {
  buildDinnerCircleSnapshot,
  getDinnerCircleConfig,
  normalizeDinnerCircleConfig,
} from '@/lib/dinner-circles/event-circle'
import { getApprovalGates } from '@/lib/dinner-circles/corporate-actions'
import { EventDefaultFlowPanel } from '@/components/events/event-default-flow-panel'
import { getEventDefaultFlowSnapshotForTenant } from '@/lib/events/default-event-flow-data'
import { EventCloneButton } from '@/components/events/event-clone-button'
import { getEventConstraintRadar } from '@/lib/events/constraint-radar-actions'
import { getOrEvaluateEventReadiness } from '@/lib/events/event-readiness-engine'
import {
  EventReadinessEnginePanel,
  EventReadinessBadge,
} from '@/components/events/event-readiness-engine-panel'

async function EventCompletionSection({ eventId }: { eventId: string }) {
  const result = await getCompletionForEntity('event', eventId)
  if (!result) return null
  return <CompletionCard result={result} />
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

function isEventToday(eventDate: Date | string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const evDate = new Date(dateToDateString(eventDate) + 'T00:00:00')
  return evDate >= today && evDate < tomorrow
}

function isEventWithinDays(eventDate: Date | string, days: number): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() + days)
  const evDate = new Date(dateToDateString(eventDate) + 'T00:00:00')
  return evDate >= today && evDate <= cutoff
}

async function getEventFinancialSummary(eventId: string) {
  const db: any = createServerClient()

  // Use the event_financial_summary view
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

async function getEventTransitions(eventId: string) {
  const db: any = createServerClient()

  const { data: transitions } = await db
    .from('event_state_transitions')
    .select('*')
    .eq('event_id', eventId)
    .order('transitioned_at', { ascending: true })

  return transitions || []
}

async function getEventPublicTicketShare(
  eventId: string
): Promise<{ token: string | null; enabled: boolean }> {
  const db: any = createServerClient()
  const { data } = await db
    .from('event_share_settings')
    .select('share_token, tickets_enabled')
    .eq('event_id', eventId)
    .maybeSingle()

  return {
    token: data?.share_token ?? null,
    enabled: data?.tickets_enabled === true,
  }
}

async function getEventMenusForCheck(eventId: string): Promise<string[] | null> {
  const db: any = createServerClient()

  const { data: menus } = await db.from('menus').select('id, name').eq('event_id', eventId)

  if (!menus || menus.length === 0) return null
  return menus.map((m: any) => m.id)
}

async function getRawCircleConfigForEvent(eventId: string): Promise<Record<string, unknown>> {
  const db: any = createServerClient({ admin: true })
  const { data } = await db
    .from('event_share_settings')
    .select('circle_config')
    .eq('event_id', eventId)
    .maybeSingle()

  return data?.circle_config && typeof data.circle_config === 'object'
    ? (data.circle_config as Record<string, unknown>)
    : {}
}

async function getPopUpProductLibrary(tenantId: string): Promise<PopUpProductLibraryItem[]> {
  const db: any = createServerClient()
  const { data } = await db
    .from('dish_index_summary')
    .select(
      'id, name, course, linked_recipe_id, recipe_name, season_affinity, tags, prep_complexity, times_served, avg_rating, per_portion_cost_cents'
    )
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('times_served', { ascending: false })
    .limit(30)

  const rows = (data ?? []) as any[]
  const ids = rows.map((row) => row.id).filter(Boolean)
  const equipmentById = new Map<string, string[]>()

  if (ids.length > 0) {
    const { data: dishRows } = await db
      .from('dish_index')
      .select('id, special_equipment')
      .eq('tenant_id', tenantId)
      .in('id', ids)

    for (const row of (dishRows ?? []) as any[]) {
      equipmentById.set(row.id, Array.isArray(row.special_equipment) ? row.special_equipment : [])
    }
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    course: row.course ?? null,
    recipeId: row.linked_recipe_id ?? null,
    recipeName: row.recipe_name ?? null,
    seasonTags: [...(row.season_affinity ?? []), ...(row.tags ?? [])].filter(Boolean),
    specialEquipment: equipmentById.get(row.id) ?? [],
    prepComplexity: row.prep_complexity ?? null,
    timesServed: Number(row.times_served ?? 0),
    avgRating: Number(row.avg_rating ?? 0),
    unitCostCents:
      row.per_portion_cost_cents === null || row.per_portion_cost_cents === undefined
        ? null
        : Number(row.per_portion_cost_cents),
  }))
}

function extractPopUpSource(ticket: any): string {
  const notes = String(ticket.notes ?? '')
  const match = notes.match(/Pop-Up source:\s*([^|]+)/i)
  if (match?.[1]) return match[1].trim()
  if (ticket.source === 'chefflow') return 'online'
  return ticket.source ?? 'online'
}

function buildPopUpOperatingSnapshot(input: {
  event: any
  config: PopUpConfig
  ticketTypes: any[]
  tickets: any[]
  productLibrary: PopUpProductLibraryItem[]
}): PopUpOperatingSnapshot {
  const ticketTypesById = new Map(
    input.ticketTypes.map((ticketType) => [ticketType.id, ticketType])
  )
  const productById = new Map(input.productLibrary.map((product) => [product.id, product]))
  const ticketSoldByType = new Map<string, number>()
  const ticketsByType = new Map<string, any[]>()
  const paidTickets = input.tickets.filter((ticket) => ticket.payment_status === 'paid')

  for (const ticket of paidTickets) {
    if (!ticket.ticket_type_id) continue
    ticketSoldByType.set(
      ticket.ticket_type_id,
      (ticketSoldByType.get(ticket.ticket_type_id) ?? 0) + Number(ticket.quantity ?? 0)
    )
    const list = ticketsByType.get(ticket.ticket_type_id) ?? []
    list.push(ticket)
    ticketsByType.set(ticket.ticket_type_id, list)
  }

  const plannedItems = input.config.menuItems
  const plannedTicketIds = new Set(plannedItems.map((item) => item.ticketTypeId).filter(Boolean))
  const ticketOnlyItems: PopUpMenuItemPlan[] = input.ticketTypes
    .filter((ticketType) => ticketType.is_active && !plannedTicketIds.has(ticketType.id))
    .map((ticketType) => ({
      ticketTypeId: ticketType.id,
      dishIndexId: null,
      recipeId: null,
      name: ticketType.name,
      plannedUnits: ticketType.capacity ?? Math.max(ticketType.sold_count ?? 0, 24),
      priceCents: ticketType.price_cents,
      unitCostCents: null,
      batchSize: null,
      equipmentNeeded: [],
      productionStatus: 'not_started' as const,
    }))

  const bufferPercent =
    input.config.dropType === 'cafe_collab'
      ? 10
      : input.config.dropType === 'private_dessert_event'
        ? 5
        : 15
  const now = new Date()
  const closeDate = input.config.preorderClosesAt ? new Date(input.config.preorderClosesAt) : null
  const daysUntilClose =
    closeDate && Number.isFinite(closeDate.getTime())
      ? Math.max(0, Math.ceil((closeDate.getTime() - now.getTime()) / 86400000))
      : 0

  const menuItems = [...plannedItems, ...ticketOnlyItems].map((item) => {
    const ticketType = item.ticketTypeId ? ticketTypesById.get(item.ticketTypeId) : null
    const itemTickets = item.ticketTypeId ? (ticketsByType.get(item.ticketTypeId) ?? []) : []
    const soldUnits = ticketType?.sold_count ?? ticketSoldByType.get(item.ticketTypeId ?? '') ?? 0
    const plannedUnits = item.plannedUnits ?? ticketType?.capacity ?? 24
    const remainingUnits =
      ticketType?.capacity === null || ticketType?.capacity === undefined
        ? Math.max(0, plannedUnits - soldUnits)
        : Math.max(0, Number(ticketType.capacity) - soldUnits)
    const firstTicketTime = itemTickets.length
      ? Math.min(...itemTickets.map((ticket) => new Date(ticket.created_at).getTime()))
      : now.getTime()
    const sellingDays = Math.max(1, Math.ceil((now.getTime() - firstTicketTime) / 86400000))
    const averageUnitsPerDay = soldUnits / sellingDays
    const velocityUnits = soldUnits + Math.max(0, Math.round(daysUntilClose * averageUnitsPerDay))
    const product = item.dishIndexId ? productById.get(item.dishIndexId) : null
    const baseUnits =
      product && product.timesServed > 0 ? input.event.guest_count || 24 : plannedUnits || 24
    const suggestedUnits = Math.max(
      1,
      Math.ceil(Math.max(baseUnits, velocityUnits) * (1 + bufferPercent / 100))
    )
    const priceCents = item.priceCents ?? ticketType?.price_cents ?? 0
    const unitCostCents = item.unitCostCents ?? product?.unitCostCents ?? null
    const marginPercent =
      unitCostCents === null || priceCents <= 0
        ? null
        : Math.round(((priceCents - unitCostCents) / priceCents) * 100)

    return {
      name: item.name,
      ticketTypeId: item.ticketTypeId ?? null,
      dishIndexId: item.dishIndexId ?? null,
      recipeId: item.recipeId ?? product?.recipeId ?? null,
      plannedUnits,
      producedUnits:
        input.config.closeout?.itemResults.find((result) => result.name === item.name)
          ?.producedUnits ?? 0,
      soldUnits,
      remainingUnits,
      suggestedUnits,
      priceCents,
      unitCostCents,
      marginPercent,
      sellThroughPercent: plannedUnits > 0 ? Math.round((soldUnits / plannedUnits) * 100) : 0,
      productionStatus: item.productionStatus ?? 'not_started',
      forecastReason:
        product && product.timesServed > 0
          ? `Based on ${product.timesServed} prior serves, ${soldUnits} sold, ${bufferPercent}% buffer.`
          : `Uses planned units, ${soldUnits} sold, preorder velocity, and ${bufferPercent}% buffer.`,
      batchSize: item.batchSize ?? null,
      equipmentNeeded: item.equipmentNeeded ?? product?.specialEquipment ?? [],
    }
  })

  const orderRows = paidTickets.map((ticket) => ({
    id: ticket.id,
    ticketTypeId: ticket.ticket_type_id ?? null,
    itemName: ticket.ticket_type?.name ?? ticket.event_ticket_types?.name ?? 'Unassigned',
    buyerName: ticket.buyer_name ?? 'Guest',
    quantity: Number(ticket.quantity ?? 0),
    totalCents: Number(ticket.total_cents ?? 0),
    source: extractPopUpSource(ticket),
    createdAt: ticket.created_at,
  }))
  const bySource = orderRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.source] = (acc[row.source] ?? 0) + row.quantity
    return acc
  }, {})
  const totalPlannedUnits = menuItems.reduce((sum, item) => sum + item.plannedUnits, 0)
  const totalSoldUnits = menuItems.reduce((sum, item) => sum + item.soldUnits, 0)
  const totalRemainingUnits = menuItems.reduce((sum, item) => sum + item.remainingUnits, 0)
  const estimatedIngredientCostCents = menuItems.reduce(
    (sum, item) => sum + (item.unitCostCents ?? 0) * item.plannedUnits,
    0
  )
  const estimatedRevenueCents = menuItems.reduce(
    (sum, item) => sum + item.priceCents * item.plannedUnits,
    0
  )
  const availableEquipment = new Set(
    (input.config.locationProfile?.equipmentAvailable ?? []).map((item) => item.toLowerCase())
  )
  const locationWarnings = menuItems.flatMap((item) =>
    item.equipmentNeeded
      .filter((equipment) => !availableEquipment.has(equipment.toLowerCase()))
      .map((equipment) => `${item.name} needs ${equipment}, not listed at location.`)
  )
  const coldHoldUnits = menuItems
    .filter((item) =>
      item.equipmentNeeded.some((equipment) => /cold|freezer|fridge|refriger/i.test(equipment))
    )
    .reduce((sum, item) => sum + item.plannedUnits, 0)
  if (
    input.config.locationProfile?.coldStorage?.toLowerCase().includes('limited') &&
    coldHoldUnits > 36
  ) {
    locationWarnings.push(`${coldHoldUnits} planned cold-hold units exceed limited storage.`)
  }

  const batchWarnings = menuItems.flatMap((item) => {
    const warnings: string[] = []
    if (item.unitCostCents === null) warnings.push(`${item.name} is missing unit cost.`)
    if (!item.recipeId) warnings.push(`${item.name} is missing a linked recipe.`)
    if (!item.batchSize) warnings.push(`${item.name} needs a batch size.`)
    return warnings
  })
  const closeoutItems = input.config.closeout?.itemResults ?? []
  const closeoutSold = closeoutItems.reduce((sum, item) => sum + item.soldUnits, 0)
  const closeoutProduced = closeoutItems.reduce((sum, item) => sum + item.producedUnits, 0)
  const wasteUnits = closeoutItems.reduce((sum, item) => sum + item.wastedUnits, 0)
  const topItem =
    closeoutItems.length > 0
      ? ([...closeoutItems].sort((a, b) => b.soldUnits - a.soldUnits)[0]?.name ?? null)
      : null

  return {
    event: {
      id: input.event.id,
      title: input.event.occasion || input.event.title || 'Untitled Event',
      date: input.event.event_date ?? null,
      status: input.event.status,
      location:
        input.event.location || input.event.location_name || input.event.location_address || null,
    },
    stage: input.config.stage,
    nextActions: [
      menuItems.length === 0
        ? {
            id: 'menu',
            label: 'Add products to the menu',
            href: '#popup-menu',
            severity: 'critical' as const,
          }
        : null,
      menuItems.some((item) => !item.ticketTypeId)
        ? {
            id: 'tickets',
            label: 'Sync menu items to ticket inventory',
            href: '#popup-menu',
            severity: 'warning' as const,
          }
        : null,
      locationWarnings.length > 0
        ? {
            id: 'location',
            label: 'Resolve location constraints',
            href: '#popup-location',
            severity: 'warning' as const,
          }
        : null,
      input.config.stage === 'closed'
        ? {
            id: 'closeout',
            label: 'Capture closeout results',
            href: '#popup-closeout',
            severity: 'info' as const,
          }
        : null,
    ].filter(Boolean) as PopUpOperatingSnapshot['nextActions'],
    menuItems,
    orderRows,
    orders: {
      totalOrders: paidTickets.length,
      totalUnits: orderRows.reduce((sum, row) => sum + row.quantity, 0),
      revenueCents: orderRows.reduce((sum, row) => sum + row.totalCents, 0),
      bySource,
      pickupWindows: (input.config.pickupWindows ?? []).map((label) => ({
        label,
        orderCount: 0,
        unitCount: 0,
      })),
    },
    production: {
      totalPlannedUnits,
      totalSoldUnits,
      totalRemainingUnits,
      estimatedIngredientCostCents,
      estimatedMarginCents: estimatedRevenueCents - estimatedIngredientCostCents,
      batchWarnings,
      locationWarnings,
    },
    closeout:
      closeoutItems.length > 0
        ? {
            sellThroughPercent:
              closeoutProduced > 0 ? Math.round((closeoutSold / closeoutProduced) * 100) : 0,
            wasteUnits,
            wasteCostCents: closeoutItems.reduce((sum, item) => sum + item.estimatedCostCents, 0),
            topItem,
            underperformers: closeoutItems
              .filter((item) => item.producedUnits > 0 && item.soldUnits / item.producedUnits < 0.6)
              .map((item) => item.name),
          }
        : undefined,
  }
}

/**
 * Get driving distance/time from chef's home to event venue.
 * Geocodes chef home address on the fly, then calls Mapbox Directions API.
 * Returns null if either location is missing or geocoding fails.
 */
async function getChefToVenueTravel(
  eventLat: number,
  eventLng: number
): Promise<{ distanceMiles: number; durationMinutes: number } | null> {
  try {
    const prefs = await getChefPreferences()
    const homeAddr = [prefs.home_address, prefs.home_city, prefs.home_state, prefs.home_zip]
      .filter(Boolean)
      .join(', ')
    if (!homeAddr) return null

    const homeCoords = await geocode(homeAddr)
    if (!homeCoords) return null

    const directions = await getDirections(homeCoords.lng, homeCoords.lat, eventLng, eventLat)
    if (!directions) return null

    return {
      distanceMiles: directions.distanceMiles,
      durationMinutes: directions.durationMinutes,
    }
  } catch {
    return null
  }
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { tab?: string }
}) {
  const activeTab = (searchParams?.tab ?? 'overview') as
    | 'overview'
    | 'popup'
    | 'chat'
    | 'money'
    | 'prep'
    | 'tickets'
    | 'ops'
    | 'wrap'
  const user = await requireChef()

  const event = await getEventById(params.id)

  if (!event) {
    notFound()
  }

  // Get financial summary, transitions, and closure data in parallel
  const isCompletedOrBeyond = ['completed', 'in_progress'].includes(event.status)
  const canTrackTime = !['draft', 'cancelled'].includes(event.status)

  const [
    { totalPaid, totalRefunded, outstandingBalance, financialAvailable },
    transitions,
    closureStatus,
    aar,
    docReadiness,
    businessDocs,
    eventMenus,
    eventExpenseData,
    profitSummary,
    budgetGuardrail,
    unrecordedComponents,
    aiConfigured,
    dopProgress,
    messages,
    templates,
    eventLoyaltyTxs,
    eventLoyaltyImpact,
    menuMods,
    unusedItems,
    substitutionItems,
    eventReadiness,
    documentReadinessGate,
    timelineEntries,
    lifecycleProgress,
    menuCostSummary,
    chefArchetype,
    ledgerEntries,
    guestCountChanges,
    serviceSimulationState,
    courseProgress,
    pricingIntelligence,
    regionalSettings,
    constraintRadarData,
    inquiryReferralSource,
    eventReadinessEngine,
  ] = await Promise.all([
    getEventFinancialSummary(params.id).catch(() => ({
      totalPaid: 0,
      totalRefunded: 0,
      outstandingBalance: 0,
      financialAvailable: false,
    })),
    getEventTransitions(params.id).catch(() => []),
    isCompletedOrBeyond
      ? getEventClosureStatus(params.id).catch(() => null)
      : Promise.resolve(null),
    isCompletedOrBeyond ? getAARByEventId(params.id) : Promise.resolve(null),
    getDocumentReadiness(params.id).catch(() => ({
      prepSheet: false,
      packingList: false,
      fohMenu: false,
    })),
    getBusinessDocInfo(params.id).catch(() => null),
    getEventMenusForCheck(params.id).catch(() => [] as string[]),
    getEventExpenses(params.id).catch(() => ({ expenses: [], totalCents: 0 })),
    getEventProfitSummary(params.id).catch(() => null),
    getBudgetGuardrail(params.id).catch(() => null),
    isCompletedOrBeyond ? getUnrecordedComponentsForEvent(params.id) : Promise.resolve([]),
    isAIConfigured().catch(() => false),
    getEventDOPProgress(params.id).catch(() => null),
    getMessageThread('event', params.id, {
      includeInquiryMessages: !!event.inquiry_id,
      inquiryId: event.inquiry_id ?? undefined,
    }).catch(() => []),
    getResponseTemplates().catch(() => []),
    event.status === 'completed' && event.client_id
      ? getLoyaltyTransactions(event.client_id)
          .then((txs) => txs.filter((tx) => tx.event_id === params.id))
          .catch(() => [])
      : Promise.resolve([]),
    event.client_id
      ? getEventLoyaltyImpactByTenant({
          tenantId: (event as any).tenant_id,
          clientId: event.client_id,
          guestCount: event.guest_count || 0,
          eventTotalCents:
            (event as any).total_price_cents ?? (event as any).quoted_price_cents ?? 0,
        }).catch(() => null)
      : Promise.resolve(null),
    isCompletedOrBeyond ? getEventModifications(params.id) : Promise.resolve([]),
    isCompletedOrBeyond ? getUnusedIngredients(params.id) : Promise.resolve([]),
    getSubstitutions(params.id).catch(() => []),
    getEventReadiness(params.id).catch(() => null),
    evaluateReadinessForDocumentGeneration(params.id).catch(() => null),
    getEntityActivityTimeline('event', params.id).catch(() => []),
    getLifecycleProgress(event.inquiry_id ?? undefined, params.id).catch(() => null),
    getEventMenuCostSummary(params.id).catch(() => null),
    getChefArchetype().catch(() => null),
    import('@/lib/events/offline-payment-actions')
      .then((m) => m.getEventLedgerEntries(params.id))
      .catch(() => []),
    getGuestCountHistory(params.id).catch(() => []),
    loadEventServiceSimulationPanelState(params.id).catch(() => null),
    event.status === 'in_progress'
      ? getCourseProgress(params.id).catch(() => [])
      : Promise.resolve([]),
    getEventPricingIntelligence(params.id).catch(() => null),
    getRegionalSettings().catch(() => ({
      currencyCode: 'USD' as const,
      locale: 'en-US' as const,
      measurementSystem: 'imperial' as const,
    })),
    getEventConstraintRadar(params.id).catch((error: unknown) => {
      console.warn('[EventDetailPage] constraint radar failed', error)
      return null
    }),
    // Fetch inquiry referral_source for referral context badge
    event.inquiry_id
      ? (async () => {
          try {
            const sb = createServerClient()
            const { data } = await sb
              .from('inquiries')
              .select('referral_source')
              .eq('id', event.inquiry_id!)
              .eq('tenant_id', event.tenant_id)
              .maybeSingle()
            const referralSource = (data?.referral_source as string | null | undefined)?.trim()
            return referralSource || null
          } catch {
            return null
          }
        })()
      : Promise.resolve(null),
    getOrEvaluateEventReadiness(params.id).catch(() => null),
  ])
  const readinessAssistant = await getEventReadinessAssistant(params.id, pricingIntelligence).catch(
    () => null
  )

  const eventLoyaltyPoints = (eventLoyaltyTxs as { points: number }[]).reduce(
    (sum, tx) => sum + tx.points,
    0
  )
  const isEventOwner = (event as any).tenant_id === user.entityId
  const referralSourceLabel = inquiryReferralSource?.replace(/_/g, ' ') ?? null

  const COLLAB_ROLE_LABELS: Record<string, string> = {
    primary: 'Primary Chef',
    co_host: 'Co-Host',
    sous_chef: 'Sous Chef',
    observer: 'Observer',
  }

  // ALL remaining fetches in a single Promise.all â€” eliminates sequential waterfalls
  const [
    refundRecommendationData,
    tacConversion,
    marketplaceConversion,
    guestShares,
    guestList,
    rsvpSummary,
    eventPhotos,
    carryForwardItems,
    paymentPlanInstallments,
    mileageEntries,
    eventTips,
    guestLeadCount,
    guestWallMessages,
    travelInfo,
    contingencyNotes,
    emergencyContacts,
    tempLogs,
    staffMembers,
    staffAssignments,
    menuApprovalData,
    prepBlocks,
    eventCollaborators,
    eventContacts,
    settlement,
    packingConfirmedCount,
    hubGroupToken,
    chefHubProfileToken,
    menuLibraryData,
    chefDisplayName,
    takeAChefFinance,
    eventHasAllergyData,
    eventChatConversationId,
    parAlerts,
    clientMemories,
  ] = await Promise.all([
    // Refund recommendation â€” only for cancelled events with payments
    event.status === 'cancelled' && totalPaid > 0
      ? getCancellationRefundRecommendation(params.id).catch(() => null)
      : Promise.resolve(null),
    // Take a Chef conversion (legacy) â€” only for completed events
    event.status === 'completed'
      ? getTakeAChefConversionData(params.id).catch(() => null)
      : Promise.resolve(null),
    // Generalized marketplace conversion â€” any platform, completed events
    event.status === 'completed'
      ? getMarketplaceConversionData(params.id).catch(() => null)
      : Promise.resolve(null),
    // Guest & sharing data
    getEventShares(params.id).catch(() => []),
    getEventGuests(params.id).catch(() => []),
    getEventRSVPSummary(params.id).catch(() => ({
      attending: 0,
      maybe: 0,
      declined: 0,
      pending: 0,
    })),
    isCompletedOrBeyond ? getEventPhotosForChef(params.id) : Promise.resolve([]),
    event.status !== 'cancelled'
      ? getAvailableCarryForwardItems(params.id).catch(() => [])
      : Promise.resolve([]),
    getPaymentPlan(params.id).catch(() => []),
    getMileageLogs().catch(() => []),
    getEventTips(params.id).catch(() => []),
    getEventGuestLeadCount(params.id).catch(() => 0),
    getEventMessagesForChef(params.id).catch(() => []),
    (event as any).location_lat && (event as any).location_lng
      ? getChefToVenueTravel((event as any).location_lat, (event as any).location_lng)
      : Promise.resolve(null),
    // Operational panel data
    event.status !== 'cancelled'
      ? getEventContingencyNotes(params.id).catch(() => [])
      : Promise.resolve([]),
    event.status !== 'cancelled' ? listEmergencyContacts().catch(() => []) : Promise.resolve([]),
    ['in_progress', 'completed'].includes(event.status)
      ? getEventTempLog(params.id).catch(() => [])
      : Promise.resolve([]),
    !['draft', 'cancelled'].includes(event.status)
      ? listStaffMembers().catch(() => [])
      : Promise.resolve([]),
    !['draft', 'cancelled'].includes(event.status)
      ? getEventStaffRoster(params.id).catch(() => [])
      : Promise.resolve([]),
    eventMenus && event.status !== 'cancelled'
      ? getMenuApprovalStatus(params.id).catch(() => null)
      : Promise.resolve(null),
    event.status !== 'cancelled'
      ? getEventPrepBlocks(params.id).catch(() => [])
      : Promise.resolve([]),
    getEventCollaborators(params.id).catch(() => []),
    getEventContacts(params.id).catch(() => []),
    getEventSettlement(params.id).catch(() => null),
    ['confirmed', 'in_progress'].includes(event.status)
      ? getPackingConfirmationCount(params.id).catch(() => 0)
      : Promise.resolve(0),
    getOrCreateChefCircleTokenForEvent(params.id).catch(() => null),
    getOrCreateChefHubProfileToken().catch(() => null),
    event.status !== 'cancelled'
      ? getMenuLibraryForEvent(params.id).catch(() => ({ menus: [], preferences: null }))
      : Promise.resolve({ menus: [], preferences: null }),
    // Chef display name for templates
    (async () => {
      try {
        const sb = createServerClient()
        const { data } = await sb
          .from('chefs')
          .select('display_name, business_name')
          .eq('id', user.entityId!)
          .single()
        return (data?.display_name || data?.business_name || 'your chef') as string
      } catch {
        return 'your chef'
      }
    })(),
    getTakeAChefEventFinance(params.id).catch(() => null),
    hasAllergyData(params.id).catch(() => false),
    // Check for linked real-time chat conversation
    (async () => {
      try {
        const sb = createServerClient()
        const { data } = await sb
          .from('conversations')
          .select('id')
          .eq('event_id', params.id)
          .eq('tenant_id', user.tenantId!)
          .limit(1)
          .maybeSingle()
        return (data?.id as string) || null
      } catch {
        return null
      }
    })(),
    // Par level alerts - only for upcoming confirmed/in_progress events
    ['confirmed', 'in_progress'].includes(event.status) && isEventWithinDays(event.event_date, 7)
      ? getParAlerts().catch(() => [])
      : Promise.resolve([]),
    // Client memory snapshot
    event.client_id ? getClientMemory(event.client_id).catch(() => []) : Promise.resolve([]),
  ])
  const eventMenuData = (menuLibraryData?.menus ?? []).filter((m: any) =>
    eventMenus?.includes(m.id)
  )

  // Ticket sales data
  const [ticketTypes, ticketList, ticketSummary] = await Promise.all([
    getEventTicketTypes(params.id).catch(() => []),
    getEventTickets(params.id).catch(() => []),
    getEventTicketSummary(params.id).catch(() => null),
  ])
  const [
    dinnerCircleConfig,
    approvalGates,
    rawCircleConfig,
    ticketShareResult,
    popUpProductLibrary,
  ] = await Promise.all([
    getDinnerCircleConfig(params.id).catch(() => null),
    getApprovalGates(params.id).catch(() => []),
    getRawCircleConfigForEvent(params.id).catch(() => ({})),
    getEventPublicTicketShare(params.id).catch(() => ({ token: null, enabled: false })),
    getPopUpProductLibrary(user.tenantId!).catch(() => []),
  ])
  const publicTicketShareToken = ticketShareResult?.token ?? null
  const ticketsEnabled = ticketShareResult?.enabled ?? false
  const defaultFlowSnapshot = await getEventDefaultFlowSnapshotForTenant(
    params.id,
    user.tenantId!,
    {
      pricing: pricingIntelligence,
    }
  ).catch(() => null)

  // Prep timeline
  const { timeline: prepTimeline } = await getEventPrepTimeline(params.id).catch(() => ({
    timeline: null,
  }))

  // Completion score for Ops Pulse
  const completionResult = await getCompletionForEntity('event', params.id).catch(() => null)
  const completionScore = completionResult?.score ?? null

  // Cost forecast for future events with menus
  let costForecast: CostForecast | null = null
  if (eventMenus && eventMenus.length > 0 && event.event_date) {
    const eventDay = new Date(event.event_date)
    if (eventDay > new Date()) {
      costForecast = await forecastMenuCost(eventMenus[0], event.event_date).catch(() => null)
    }
  }

  // Compute dietary complexity from guest data
  const guestProfiles = (guestList as any[]).map((g: any) => ({
    dietaryRestrictions: g.dietary_restrictions ?? [],
    allergies: g.allergies ?? [],
  }))
  const dietaryComplexity = calculateDietaryComplexity({
    guests: guestProfiles,
    totalGuestCount: event.guest_count || 1,
  })

  // Compute event risk score
  const allGuestRestrictions = guestProfiles.flatMap((g) => g.dietaryRestrictions)
  const allGuestAllergies = guestProfiles.flatMap((g) => g.allergies)
  const eventTotalCents = (event as any).total_price_cents ?? (event as any).quoted_price_cents ?? 0
  const eventRisk = calculateEventRisk({
    eventDate: event.event_date,
    status: event.status as any,
    paymentStatus:
      totalPaid >= eventTotalCents && eventTotalCents > 0
        ? 'paid'
        : totalPaid > 0
          ? 'partial'
          : 'unpaid',
    guestCount: event.guest_count ?? 0,
    dietaryRestrictions: allGuestRestrictions,
    allergies: allGuestAllergies,
    hasMenu: !!eventMenus,
    hasSignedContract: false, // conservative default
    isRepeatClient: false, // conservative default
    serviceStyle: (event as any).service_style ?? undefined,
    quotedPriceCents: (event as any).quoted_price_cents ?? null,
    outstandingBalanceCents: outstandingBalance,
    travelDistanceMiles: travelInfo?.distanceMiles ?? null,
    guestCountConfirmed: (event as any).guest_count_confirmed ?? undefined,
    occasion: event.occasion ?? null,
  })

  // Compute share URL (shortenUrl depends on guestShares resolving)
  const activeShare = (guestShares as any[]).find((s) => s.is_active) || null
  const fullShareUrl = activeShare
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/share/${activeShare.token}`
    : null
  const publicTicketShareUrl = publicTicketShareToken
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/e/${publicTicketShareToken}`
    : null
  let shortShareUrl = fullShareUrl
  if (fullShareUrl) {
    try {
      const shortened = await shortenUrl(fullShareUrl)
      if (shortened) shortShareUrl = shortened
    } catch {
      // Non-blocking: use the full URL
    }
  }

  // For collaborating chefs (non-owners): find their row to show role context in the banner
  const myCollaboratorRow = !isEventOwner
    ? (eventCollaborators as any[]).find(
        (c: any) => c.chef_id === user.entityId && c.status === 'accepted'
      )
    : null
  const prepTimelineReady = Boolean(
    prepTimeline &&
    (((prepTimeline as any).days ?? []).some((day: any) => (day.items ?? []).length > 0) ||
      ((prepTimeline as any).untimedItems ?? []).length > 0)
  )
  const operatingSpine = buildChefEventOperatingSpine({
    event,
    eventMenus: eventMenus as any,
    guestList: guestList as any[],
    rsvpSummary: rsvpSummary as any,
    totalPaidCents: totalPaid,
    totalRefundedCents: totalRefunded,
    outstandingBalanceCents: outstandingBalance,
    financialAvailable,
    messagesCount: messages.length,
    hasActiveShare: Boolean(activeShare),
    prepTimelineReady,
    prepBlocksCount: (prepBlocks as any[]).length,
    parAlertCount: (parAlerts as any[]).length,
    packingConfirmedCount,
    hasAAR: Boolean(aar),
  })
  const dinnerCircleSnapshot = buildDinnerCircleSnapshot({
    event,
    config: dinnerCircleConfig ?? normalizeDinnerCircleConfig(null),
    ticketTypes: ticketTypes as any[],
    tickets: ticketList as any[],
    ticketSummary,
    collaborators: eventCollaborators as any[],
    eventMenus: eventMenus as any,
    eventPhotos: eventPhotos as any[],
    shareUrl: publicTicketShareUrl ?? fullShareUrl,
    hubGroupToken: hubGroupToken as string | null,
    prepTimelineReady,
    locationReady: Boolean(event.location_address || (event as any).location),
    totalPaidCents: totalPaid,
    outstandingBalanceCents: outstandingBalance,
    menuCostCents: menuCostSummary?.totalRecipeCostCents ?? null,
  })
  const popUpConfig = normalizePopUpConfig((rawCircleConfig as any).popUp ?? null)
  const popUpSnapshot = buildPopUpOperatingSnapshot({
    event,
    config: popUpConfig,
    ticketTypes: ticketTypes as any[],
    tickets: ticketList as any[],
    productLibrary: popUpProductLibrary,
  })

  return (
    <div className="space-y-6">
      {/* Realtime event status subscription - auto-refreshes when FSM state changes */}
      <EventStatusRealtimeSync eventId={params.id} />

      {/* Cost stale banner - shows when ingredient prices changed since last costing */}
      <CostStaleBanner
        eventId={params.id}
        costNeedsRefresh={(event as any).cost_needs_refresh === true}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">
              {event.occasion || 'Untitled Event'}
            </h1>
            <EventStatusBadge status={event.status} />
            {referralSourceLabel && <Badge variant="info">Referral: {referralSourceLabel}</Badge>}
            {eventReadinessEngine && !['completed', 'cancelled'].includes(event.status) && (
              <EventReadinessBadge readiness={eventReadinessEngine} />
            )}
            <DietaryComplexityBadge result={dietaryComplexity} />
            <EventRiskBadge result={eventRisk} />
          </div>
          <p className="text-stone-300 mt-1">
            {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
            {(event as any).serve_time ? (
              <> at {(event as any).serve_time}</>
            ) : (
              <span className="ml-1 text-amber-400 font-medium text-sm">(time TBD)</span>
            )}
            {(event as any).event_timezone && (
              <span className="ml-2 text-xs text-stone-300 font-normal">
                {(event as any).event_timezone.replace('America/', '').replace('_', ' ')}
              </span>
            )}
          </p>
          <ChefEventCountdown
            eventDate={dateToDateString(event.event_date)}
            serveTime={(event as any).serve_time}
            status={event.status}
          />
          {/* EC-G26 fix: show co-host names in event header */}
          {(() => {
            const acceptedCollabs = (eventCollaborators as any[]).filter(
              (c: any) => c.status === 'accepted' && c.chef
            )
            if (acceptedCollabs.length === 0) return null
            const names = acceptedCollabs
              .map((c: any) => c.chef?.display_name || c.chef?.business_name || 'Co-host')
              .join(', ')
            return <p className="text-stone-400 text-sm mt-0.5">Co-hosting with {names}</p>
          })()}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {event.status === 'draft' && (
            <Link href={`/events/${event.id}/edit`}>
              <Button variant="secondary">Edit Event</Button>
            </Link>
          )}
          {/* Event-day quick actions - promoted to primary buttons when event is today */}
          {isEventToday(event.event_date) && !['draft', 'cancelled'].includes(event.status) && (
            <>
              <Link href={`/events/${event.id}/pack`}>
                <Button variant="primary">Pack List</Button>
              </Link>
              {eventMenus && (
                <Link href={`/events/${event.id}/grocery-quote`}>
                  <Button variant="primary">Grocery List</Button>
                </Link>
              )}
            </>
          )}
          <Link href={`/events/${event.id}/schedule`}>
            <Button variant="secondary">Schedule</Button>
          </Link>
          <Link href={`/events/${event.id}/documents`}>
            <Button variant="secondary">Documents</Button>
          </Link>
          {event.client_id && !['cancelled'].includes(event.status) && (
            <QuickProposalButton eventId={event.id} />
          )}
          {event.status !== 'cancelled' && (
            <EventCloneButton
              sourceEventId={event.id}
              sourceEventName={event.occasion || 'Untitled Event'}
            />
          )}
          <EventActionsOverflow
            actions={[
              ...(!isEventToday(event.event_date) && !['draft', 'cancelled'].includes(event.status)
                ? [{ label: 'Packing List', href: `/events/${event.id}/pack` }]
                : []),
              ...(!isEventToday(event.event_date) &&
              eventMenus &&
              !['cancelled'].includes(event.status)
                ? [{ label: 'Grocery Quote', href: `/events/${event.id}/grocery-quote` }]
                : []),
              { label: 'Mise en Place', href: `/events/${event.id}/mise-en-place` },
              { label: 'Travel Plan', href: `/events/${event.id}/travel` },
              ...(event.status === 'completed'
                ? [{ label: 'Create Story', href: `/events/${event.id}/story` }]
                : []),
            ]}
          />
          <Link href="/events">
            <Button variant="ghost">Back to Events</Button>
          </Link>
        </div>
      </div>

      {/* Pre-Event Nerve Center: unified T-minus card for events within 48 hours */}
      {isEventWithinDays(event.event_date, 2) &&
        !['cancelled', 'completed'].includes(event.status) && (
          <WidgetErrorBoundary name="Pre-Event Nerve Center" compact>
            <Suspense fallback={null}>
              <PreEventNerveCenter
                eventId={params.id}
                eventDate={event.event_date}
                serveTime={(event as any).serve_time}
                status={event.status}
                occasion={event.occasion}
                guestCount={event.guest_count ?? 0}
                locationLat={(event as any).location_lat}
                locationLng={(event as any).location_lng}
                locationAddress={event.location_address}
                prepTimeline={
                  prepTimeline
                    ? {
                        days: ((prepTimeline as any).days ?? []).map((d: any) => ({
                          label: d.label,
                          items: (d.items ?? []).map((item: any) => ({
                            recipeName: item.recipeName,
                            componentName: item.componentName,
                          })),
                          totalPrepMinutes: d.totalPrepMinutes ?? 0,
                          isToday: d.isToday ?? false,
                          isPast: d.isPast ?? false,
                          isServiceDay: d.isServiceDay ?? false,
                        })),
                        untimedItems: ((prepTimeline as any).untimedItems ?? []).map(
                          (item: any) => ({
                            recipeName: item.recipeName,
                          })
                        ),
                        groceryDeadline: (prepTimeline as any).groceryDeadline
                          ? dateToDateString((prepTimeline as any).groceryDeadline)
                          : null,
                      }
                    : null
                }
                readinessBlockers={
                  eventReadiness
                    ? ((eventReadiness as any).blockers ?? []).map((b: any) => ({
                        label: b.label,
                        description: b.description,
                        ctaLabel: b.ctaLabel,
                        verifyRoute: b.verifyRoute,
                      }))
                    : []
                }
                readinessConfidence={(eventReadiness as any)?.confidence ?? null}
                travelInfo={travelInfo}
                packingStatus={
                  (event as any).car_packed
                    ? 'packed'
                    : packingConfirmedCount > 0
                      ? 'in_progress'
                      : 'not_started'
                }
                packingConfirmedCount={packingConfirmedCount}
                lastMessageAt={
                  messages.length > 0
                    ? ((messages[messages.length - 1] as any)?.created_at ?? null)
                    : null
                }
                unreadMessageCount={0}
                staffAssignedCount={(staffAssignments as any[]).length}
                clientName={event.client?.full_name ?? null}
              />
            </Suspense>
          </WidgetErrorBoundary>
        )}

      {event.status !== 'cancelled' && serviceSimulationState ? (
        <ServiceSimulationRollupCard
          eventId={params.id}
          panelState={serviceSimulationState}
          compact
          returnToHref={`/events/${params.id}?tab=ops#service-simulation`}
          description="Day-of snapshot from live event truth. Keep the full walkthrough in Ops, but keep this signal visible above the fold."
        />
      ) : null}

      {eventReadinessEngine && !['completed', 'cancelled'].includes(event.status) && (
        <EventReadinessEnginePanel eventId={params.id} readiness={eventReadinessEngine} />
      )}

      <EventOperatingSpineCard
        spine={operatingSpine}
        audience="chef"
        title="Event operating spine"
        description="One event view connects booking status, client readiness, menu, prep, stock, finance, communication, and follow-up."
      />

      <EventDefaultFlowPanel eventId={params.id} snapshot={defaultFlowSnapshot} />

      <DinnerCircleCommandCenter
        snapshot={dinnerCircleSnapshot}
        collaborators={eventCollaborators as any[]}
        ticketHolders={ticketList as any[]}
        approvalGates={approvalGates}
      />

      {/* Collaborator role banner â€” shown when viewing another chef's event */}
      {!isEventOwner && myCollaboratorRow && (
        <div className="rounded-lg border border-brand-700 bg-brand-950/50 px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-brand-200">
              You are collaborating on this event as{' '}
              <span className="font-semibold">
                {COLLAB_ROLE_LABELS[myCollaboratorRow.role] ?? myCollaboratorRow.role}
              </span>
            </p>
            <p className="text-xs text-brand-400 mt-0.5">
              This event is owned by another chef. Some sections may be limited to the owner.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      )}

      {/* Deposit Shortfall Banner â€” accepted/paid events with uncollected deposit */}
      {['accepted', 'paid'].includes(event.status) &&
        (event as any).deposit_amount_cents > 0 &&
        totalPaid < (event as any).deposit_amount_cents && (
          <div className="rounded-lg border border-amber-300 bg-amber-950 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">
              Awaiting {formatCurrency((event as any).deposit_amount_cents - totalPaid)} deposit
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {formatCurrency((event as any).deposit_amount_cents)} required â€¢{' '}
              {formatCurrency(totalPaid)} collected â€” record payment below to proceed to
              confirmation.
            </p>
          </div>
        )}

      {/* Take a Chef â†’ Direct Conversion Banner */}
      {/* Marketplace Convert Banner â€" works for all platforms (TAC, Yhangry, Cozymeal, etc.) */}
      {marketplaceConversion?.isMarketplace && marketplaceConversion.directBookingUrl && (
        <MarketplaceConvertBanner
          clientName={marketplaceConversion.clientName}
          directBookingUrl={marketplaceConversion.directBookingUrl}
          eventId={params.id}
          platformLabel={marketplaceConversion.platformLabel!}
        />
      )}

      {/* Quick Debrief â€” surfaces within 48h of completion when no AAR exists */}
      {event.status === 'completed' && (
        <QuickDebriefPrompt
          eventId={params.id}
          hasAAR={!!aar}
          completedAt={(event as any).service_completed_at ?? event.updated_at}
        />
      )}

      {/* Event Intelligence */}
      <WidgetErrorBoundary name="Event Intelligence" compact>
        <Suspense fallback={null}>
          <EventIntelligencePanel
            eventId={params.id}
            guestCount={event.guest_count ?? null}
            occasion={event.occasion ?? null}
            quotedPriceCents={(event as any).quoted_price_cents ?? null}
            status={event.status}
            eventDate={event.event_date ?? null}
          />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Lifecycle Progress */}
      {lifecycleProgress && lifecycleProgress.stages.length > 0 && (
        <WidgetErrorBoundary name="Lifecycle Progress" compact>
          <LifecycleProgressPanel
            eventId={params.id}
            inquiryId={event.inquiry_id ?? undefined}
            stages={lifecycleProgress.stages}
            overallPercent={lifecycleProgress.overallPercent}
            currentStage={lifecycleProgress.currentStage}
            nextActions={lifecycleProgress.nextActions}
          />
        </WidgetErrorBoundary>
      )}

      {/* Completion Contract */}
      <WidgetErrorBoundary name="Completion" compact>
        <Suspense fallback={<CompletionCardSkeleton />}>
          <EventCompletionSection eventId={params.id} />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Ops Pulse: inside-out operational summary */}
      {!['cancelled', 'completed'].includes(event.status) && (
        <WidgetErrorBoundary name="Ops Pulse" compact>
          <OpsPulseCard
            eventDate={dateToDateString(event.event_date)}
            serveTime={(event as any).serve_time}
            status={event.status}
            completionScore={completionScore ?? 0}
            prepDays={
              prepTimeline
                ? (prepTimeline as any).days?.map((d: any) => ({
                    label: d.label,
                    itemCount: d.items?.length ?? 0,
                    totalMinutes: d.totalPrepMinutes ?? 0,
                    isPast: d.isPast,
                    isToday: d.isToday,
                  }))
                : undefined
            }
            groceryDeadline={
              (prepTimeline as any)?.groceryDeadline
                ? dateToDateString((prepTimeline as any).groceryDeadline)
                : null
            }
            untimedCount={(prepTimeline as any)?.untimedItems?.length}
          />
        </WidgetErrorBoundary>
      )}

      {/* Schedule Summary & DOP Progress */}
      {dopProgress && !['cancelled'].includes(event.status) && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-semibold text-stone-300">Preparation Progress</h3>
                <Link
                  href={`/events/${event.id}/schedule`}
                  className="text-xs text-brand-500 hover:text-brand-400"
                >
                  View full schedule &rarr;
                </Link>
              </div>
              <DOPProgressBar completed={dopProgress.completed} total={dopProgress.total} />
            </div>
          </div>
        </Card>
      )}

      {/* Packing Progress â€” for confirmed/in_progress events */}
      {['confirmed', 'in_progress'].includes(event.status) && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-sm font-semibold text-stone-300">Packing</h3>
                <Link
                  href={`/events/${event.id}/pack`}
                  className="text-xs text-brand-500 hover:text-brand-400"
                >
                  Open packing view &rarr;
                </Link>
              </div>
              {(event as any).car_packed ? (
                <p className="text-sm text-emerald-700 font-medium">Car packed</p>
              ) : packingConfirmedCount > 0 ? (
                <p className="text-sm text-stone-300">
                  {packingConfirmedCount} item{packingConfirmedCount !== 1 ? 's' : ''} confirmed
                  packed
                </p>
              ) : (
                <p className="text-sm text-stone-300">Not started â€” open packing view to begin</p>
              )}
            </div>
            {(event as any).car_packed && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900 text-emerald-800">
                Packed
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Prep Block Nudge - confirmed events with no prep blocks scheduled */}
      {event.status === 'confirmed' && (prepBlocks as any[]).length === 0 && (
        <PrepBlockNudgeBanner eventId={event.id} />
      )}

      {/* Par Level Alert - items below par for upcoming events */}
      {(parAlerts as any[]).length > 0 && (
        <Card className="p-4 border-amber-700/50 bg-amber-950/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-400">
                {(parAlerts as any[]).length} item{(parAlerts as any[]).length !== 1 ? 's' : ''}{' '}
                below par level
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {(parAlerts as any[])
                  .slice(0, 3)
                  .map((a: any) => a.ingredientName)
                  .join(', ')}
                {(parAlerts as any[]).length > 3 ? ` +${(parAlerts as any[]).length - 3} more` : ''}
              </p>
            </div>
            <Link
              href="/inventory"
              className="shrink-0 text-xs text-amber-400 hover:underline font-medium"
            >
              Check inventory
            </Link>
          </div>
        </Card>
      )}

      {/* Prep Schedule */}
      {event.status !== 'cancelled' && (
        <EventPrepSchedule eventId={event.id} initialBlocks={prepBlocks as any} />
      )}

      {/* Context Inspector - consolidated client/event reference */}
      <ContextInspector
        clientId={event.client_id}
        eventId={event.id}
        sections={[
          'client',
          'dietary',
          'preferences',
          'pastMeals',
          'feedback',
          'venue',
          'milestones',
        ]}
        defaultCollapsed={true}
      />

      {/* ============================================ */}
      {/* MOBILE TAB NAV - hidden on md+               */}
      {/* ============================================ */}
      <EventDetailMobileNav />

      <EventDetailSection tab="popup" activeTab={activeTab}>
        <PopUpOperatingPanel
          initialConfig={popUpConfig}
          snapshot={popUpSnapshot}
          productLibrary={popUpProductLibrary}
        />
      </EventDetailSection>

      {/* ============================================ */}
      {/* ============================================ */}
      {/* TAB: OVERVIEW - Event details, client, comms */}
      {/* ============================================ */}
      <EventDetailOverviewTab
        activeTab={activeTab}
        event={event}
        dopProgress={dopProgress}
        packingConfirmedCount={packingConfirmedCount}
        travelInfo={travelInfo}
        eventLoyaltyImpact={eventLoyaltyImpact}
        eventLoyaltyPoints={eventLoyaltyPoints}
        activeShare={activeShare}
        shortShareUrl={shortShareUrl}
        fullShareUrl={fullShareUrl}
        eventMenus={eventMenus as any}
        hubGroupToken={hubGroupToken as string | null}
        hubProfileToken={chefHubProfileToken as string | null}
        guestList={guestList as any[]}
        rsvpSummary={rsvpSummary as any}
        chefDisplayName={chefDisplayName}
        guestLeadCount={guestLeadCount as number}
        guestWallMessages={guestWallMessages as any[]}
        messages={messages}
        templates={templates}
        chatConversationId={eventChatConversationId as string | null}
        collaborators={eventCollaborators as any[]}
        eventContacts={eventContacts as any[]}
        eventMenuData={eventMenuData}
        constraintRadarData={constraintRadarData}
        clientMemories={clientMemories as any[]}
      />

      {/* TAB: CHAT - Inline circle chat thread        */}
      {/* ============================================ */}
      <EventDetailChatTab
        activeTab={activeTab}
        eventId={event.id}
        hubGroupToken={hubGroupToken as string | null}
        hubProfileToken={chefHubProfileToken as string | null}
      />

      {/* TAB: MONEY - Financials, payments, expenses  */}
      {/* ============================================ */}
      <EventDetailMoneyTab
        activeTab={activeTab}
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
      />

      {/* TAB: PREP - Peak window prep timeline         */}
      {/* ============================================ */}
      <EventDetailPrepTab
        activeTab={activeTab}
        timeline={prepTimeline}
        eventId={event.id}
        hasMenu={!!eventMenus}
      />

      {/* TAB: TICKETS - Ticket sales and management   */}
      {/* ============================================ */}
      <EventDetailTicketsTab
        activeTab={activeTab}
        eventId={event.id}
        eventStatus={event.status}
        ticketTypes={ticketTypes as any[]}
        tickets={ticketList as any[]}
        summary={ticketSummary}
        shareToken={publicTicketShareToken}
        ticketsEnabled={ticketsEnabled}
      />

      {/* ============================================ */}
      {/* TAB: OPS - Staff, temps, docs, transitions   */}
      {/* ============================================ */}
      <EventDetailOpsTab
        activeTab={activeTab}
        event={event}
        canTrackTime={canTrackTime}
        updateEventTimeAndCard={updateEventTimeAndCard}
        startEventActivity={startEventActivity}
        stopEventActivity={stopEventActivity}
        staffMembers={staffMembers as any[]}
        staffAssignments={staffAssignments as any[]}
        isEventOwner={isEventOwner}
        eventCollaborators={eventCollaborators as any[]}
        tempLogs={tempLogs as any[]}
        substitutionItems={substitutionItems}
        isCompletedOrBeyond={isCompletedOrBeyond}
        menuMods={menuMods as any[]}
        carryForwardItems={carryForwardItems}
        unusedItems={unusedItems as any[]}
        contingencyNotes={contingencyNotes as any[]}
        emergencyContacts={emergencyContacts as any[]}
        docReadiness={docReadiness}
        businessDocs={businessDocs}
        eventReadiness={eventReadiness}
        documentReadinessGate={documentReadinessGate}
        closureStatus={closureStatus}
        aar={aar}
        eventPhotos={eventPhotos}
        eventMenus={eventMenus as any}
        unrecordedComponents={unrecordedComponents}
        aiConfigured={aiConfigured}
        hasAllergyData={eventHasAllergyData as boolean}
        eventTotalCents={eventTotalCents}
        serviceSimulationState={serviceSimulationState}
        courseProgress={courseProgress}
      />
      {/* TAB: WRAP-UP â€” Debrief, survey, history      */}
      {/* ============================================ */}
      <EventDetailWrapTab
        activeTab={activeTab}
        eventId={event.id}
        eventStatus={event.status}
        eventClientId={event.client_id}
        followUpSent={(event as any).follow_up_sent ?? false}
        followUpSentAt={(event as any).follow_up_sent_at ?? null}
        debriefCompletedAt={(event as any).debrief_completed_at ?? null}
        hasAAR={!!aar}
        hasClosureStatus={!!closureStatus}
        transitions={transitions as any[]}
        timelineEntries={timelineEntries}
      />
    </div>
  )
}
