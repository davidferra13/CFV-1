import { isCommTriageEnabled } from '@/lib/features'
import type { loadBusinessSectionData } from './business-section-loader'
import { dateToDateString } from '@/lib/utils/format'

type BusinessSectionData = Awaited<ReturnType<typeof loadBusinessSectionData>>

interface BuildBusinessSectionMetricsInput {
  data: BusinessSectionData
  now: Date
}

export function buildBusinessSectionMetrics({ data, now }: BuildBusinessSectionMetricsInput) {
  const {
    allEvents,
    automationExecutions,
    automationRules,
    campaigns,
    cannabisEvents,
    cannabisRsvpDashboard,
    charityEvents,
    chefSurveys,
    communicationInboxStats,
    communityTemplates,
    documentSnapshots,
    dormantClients,
    employees,
    equipmentDueForMaintenance,
    equipmentRentals,
    externalReviewSources,
    goalsDashboard,
    insurancePolicies,
    inquiryBudgetMix,
    inquiryStats,
    integrationOverview,
    kitchenRentals,
    menus,
    monthInvoices,
    outstandingPayments,
    partners,
    paymentLedgerEntries,
    payrollRecords,
    pushDinners,
    quoteStats,
    recentSales,
    receipts,
    reconciliationReports,
    remyApprovalPolicies,
    reservations,
    safetyIncidents,
    socialConnections,
    socialPlannerData,
    staffMembers,
    stationOpsLog,
    testimonials,
    todos,
    travelLegs,
    unifiedInboxStats,
    wixSubmissions,
    revenueGoal,
    yoyData,
    recipes,
    gmailSyncHistory,
  } = data

  const activeInquiryCount =
    inquiryStats.new +
    inquiryStats.awaiting_client +
    inquiryStats.awaiting_chef +
    inquiryStats.quoted
  const totalInquiryCount = Object.values(inquiryStats).reduce((sum, value) => sum + value, 0)
  const inquiryBudgetRows = [
    { key: 'exact', label: 'Exact', count: inquiryBudgetMix.exact, color: 'bg-emerald-500' },
    { key: 'range', label: 'Range', count: inquiryBudgetMix.range, color: 'bg-brand-500' },
    { key: 'not_sure', label: 'Not sure', count: inquiryBudgetMix.notSure, color: 'bg-amber-500' },
    { key: 'unset', label: 'Unset', count: inquiryBudgetMix.unset, color: 'bg-stone-500' },
  ]
  const inquiryBudgetNeedsAttention =
    inquiryBudgetMix.total >= 5 && inquiryBudgetMix.knownPercent < 70
  const inquiryBudgetMainGap =
    inquiryBudgetMix.notSure >= inquiryBudgetMix.unset ? 'not sure' : 'unset'
  const shouldShowOnboardingAccelerator =
    data.eventCounts.ytd === 0 && (data.clients.length <= 10 || totalInquiryCount <= 10)
  const todaySales = (recentSales.sales ?? []).filter((sale: any) => {
    if (!sale?.created_at) return false
    return new Date(sale.created_at).toDateString() === now.toDateString()
  })
  const todaySalesRevenueCents = todaySales.reduce(
    (sum: number, sale: any) => sum + Number(sale?.total_cents ?? 0),
    0
  )
  const monthVendorSpendCents = (monthInvoices ?? []).reduce(
    (sum: number, invoice: any) => sum + Number(invoice?.total_cents ?? 0),
    0
  )
  const activeStaffCount = (staffMembers ?? []).filter(
    (member: any) => member?.status === 'active'
  ).length
  const activeEmployeeCount = (employees ?? []).filter(
    (employee: any) => employee?.status !== 'terminated'
  ).length
  const payrollYtdGrossCents = (payrollRecords ?? []).reduce(
    (sum: number, row: any) => sum + Number(row?.grossPayCents ?? 0),
    0
  )
  const activeCampaignCount = (campaigns ?? []).filter((campaign: any) =>
    ['draft', 'scheduled', 'sending'].includes(String(campaign?.status ?? ''))
  ).length
  const sentCampaignCount = (campaigns ?? []).filter(
    (campaign: any) => String(campaign?.status ?? '') === 'sent'
  ).length
  const upcomingPushDinnerCount = (pushDinners ?? []).filter((campaign: any) => {
    if (!campaign?.proposed_date) return false
    const day = new Date(`${campaign.proposed_date}T00:00:00`)
    return day >= new Date(now.toDateString()) && String(campaign?.status ?? '') !== 'cancelled'
  }).length
  const openContractsAndCollectionsCount =
    Number(quoteStats.sent ?? 0) + Number(outstandingPayments.events.length ?? 0)
  const commTriageEnabled = isCommTriageEnabled()
  const inboxTotalCount = commTriageEnabled
    ? communicationInboxStats.total
    : unifiedInboxStats.total
  const inboxNeedsAttentionCount = commTriageEnabled
    ? communicationInboxStats.needs_attention
    : unifiedInboxStats.unread
  const inboxUnlinkedCount = commTriageEnabled
    ? communicationInboxStats.unlinked
    : unifiedInboxStats.bySource.wix
  const activeExternalReviewSourceCount = (externalReviewSources ?? []).filter(
    (source: any) => source?.active
  ).length
  const monthlyGoalProgress = Math.max(
    0,
    Math.min(100, Number(revenueGoal.monthly.progressPercent ?? 0))
  )
  const monthlyGoalGapCents = Math.max(0, Number(revenueGoal.monthly.gapCents ?? 0))
  const yoyRevenueDelta = Number(yoyData.revenueMetric.changePercent ?? 0)
  const openMaintenanceCount = (equipmentDueForMaintenance ?? []).length
  const totalEquipmentRentals = (equipmentRentals ?? []).length
  const totalKitchenRentals = (kitchenRentals ?? []).length
  const kitchenRentalSpendCents = (kitchenRentals ?? []).reduce(
    (sum: number, rental: any) => sum + Number(rental?.cost_cents ?? 0),
    0
  )
  const draftMenuCount = (menus ?? []).filter(
    (menu: any) => String(menu?.status ?? '') === 'draft'
  ).length
  const approvedMenuCount = (menus ?? []).filter(
    (menu: any) => String(menu?.status ?? '') === 'approved'
  ).length
  const recentRecipeCount = (recipes ?? []).filter((recipe: any) => {
    const createdAt = recipe?.created_at
    if (!createdAt) return false
    const ageDays = (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return ageDays <= 30
  }).length
  const pendingConnectionRequests = (data.networkPendingRequests ?? []).filter(
    (request: any) => request?.direction === 'received'
  ).length
  const openSafetyIncidents = (safetyIncidents ?? []).filter(
    (incident: any) => String(incident?.resolution_status ?? 'open') !== 'resolved'
  ).length
  const criticalSafetyIncidents = (safetyIncidents ?? []).filter((incident: any) =>
    ['food_safety', 'guest_injury', 'equipment_failure'].includes(
      String(incident?.incident_type ?? '')
    )
  ).length
  const plannedTravelLegs = (travelLegs ?? []).filter(
    (leg: any) => String(leg?.status ?? 'planned') === 'planned'
  ).length
  const inProgressTravelLegs = (travelLegs ?? []).filter(
    (leg: any) => String(leg?.status ?? '') === 'in_progress'
  ).length
  const consolidatedTravelLegs = (travelLegs ?? []).filter(
    (leg: any) => String(leg?.leg_type ?? '') === 'consolidated_shopping'
  ).length
  const activeGoalCount = (goalsDashboard.activeGoals ?? []).length
  const avgGoalProgressPercent =
    activeGoalCount > 0
      ? Math.round(
          (goalsDashboard.activeGoals as any[]).reduce(
            (sum: number, goal: any) => sum + Number(goal?.progress?.progressPercent ?? 0),
            0
          ) / activeGoalCount
        )
      : 0
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const upcomingEvents = (allEvents ?? []).filter((event: any) => {
    const status = String(event?.status ?? '')
    if (['completed', 'cancelled'].includes(status)) return false
    return dateToDateString((event?.event_date ?? '') as Date | string) >= todayIso
  })
  const documentSnapshotEventIds = new Set(
    (documentSnapshots ?? []).map((snapshot: any) =>
      String(snapshot?.eventId ?? snapshot?.event_id ?? '')
    )
  )
  const upcomingEventsMissingSnapshots = upcomingEvents.filter(
    (event: any) => !documentSnapshotEventIds.has(String(event?.id ?? ''))
  ).length
  const staleDocumentSnapshots = (documentSnapshots ?? []).filter((snapshot: any) => {
    const generatedAt = snapshot?.generatedAt ?? snapshot?.generated_at
    if (!generatedAt) return false
    const ageDays = (now.getTime() - new Date(generatedAt).getTime()) / (1000 * 60 * 60 * 24)
    return ageDays > 30
  }).length
  const expiringInsurancePolicyCount = (insurancePolicies ?? []).filter((policy: any) => {
    if (!policy?.expiry_date) return false
    const expiry = new Date(`${dateToDateString(policy.expiry_date as Date | string)}T23:59:59`)
    const days = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return days >= 0 && days <= 45
  }).length
  const highValueDormantClients = (dormantClients ?? []).filter(
    (client: any) => Number(client?.lifetimeValueCents ?? 0) >= 100000
  ).length
  const pendingSurveyCount = (chefSurveys ?? []).filter(
    (survey: any) => !survey?.submitted_at
  ).length
  const recentTestimonialCount = (testimonials ?? []).filter((testimonial: any) => {
    const createdAt = testimonial?.created_at
    if (!createdAt) return false
    const ageDays = (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return ageDays <= 30
  }).length
  const pendingTestimonialApprovalCount = (testimonials ?? []).filter(
    (testimonial: any) => !testimonial?.is_approved
  ).length
  const activePartnerCount = (partners ?? []).filter(
    (partner: any) => String(partner?.status ?? 'active') === 'active'
  ).length
  const inactivePartnerCount = (partners ?? []).filter(
    (partner: any) => String(partner?.status ?? '') === 'inactive'
  ).length
  const partnerReferralEventCount = (partners ?? []).reduce(
    (sum: number, partner: any) => sum + Number(partner?.event_count ?? 0),
    0
  )
  const stationActiveCount = (data.stations ?? []).filter(
    (station: any) => String(station?.status ?? 'active') === 'active'
  ).length
  const unresolvedStationTasks = (Array.isArray(todos) ? todos : []).filter(
    (task: any) =>
      task?.station_id && ['pending', 'in_progress'].includes(String(task?.status ?? 'pending'))
  ).length
  const stationOpsAttentionCount = ((stationOpsLog?.entries ?? []) as any[]).filter((entry: any) =>
    ['order_request', 'eighty_six', 'waste'].includes(String(entry?.action_type ?? ''))
  ).length
  const paymentEntriesInbound = (paymentLedgerEntries ?? []).filter((entry: any) =>
    ['payment', 'deposit', 'installment', 'final_payment'].includes(String(entry?.entry_type ?? ''))
  )
  const paymentEntriesFailedQueue = (allEvents ?? []).filter((event: any) => {
    const status = String(event?.status ?? '')
    return (
      status === 'accepted' &&
      dateToDateString((event?.event_date ?? '') as Date | string) < todayIso
    )
  }).length
  const overdueInstallmentCount = (data.overdueInstallments ?? []).length
  const paymentEntriesInboundTotal = paymentEntriesInbound.reduce(
    (sum: number, entry: any) => sum + Number(entry?.amount_cents ?? 0),
    0
  )
  const latestDailyReportDate = (data.dailyReportHistory ?? [])[0]?.reportDate ?? null
  const reportFreshnessDays =
    latestDailyReportDate != null
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() - new Date(`${latestDailyReportDate}T00:00:00`).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null
  const reconciliationOpenFlags = ((reconciliationReports?.reports ?? []) as any[]).reduce(
    (sum: number, report: any) => {
      const flags = Array.isArray(report?.flags)
        ? report.flags
        : typeof report?.flags === 'string'
          ? (() => {
              try {
                return JSON.parse(report.flags)
              } catch {
                return []
              }
            })()
          : []
      const openCount = (flags as any[]).filter((flag: any) => flag?.status === 'open').length
      return sum + openCount
    },
    0
  )
  const overdueTaskCount = (Array.isArray(todos) ? todos : []).filter((task: any) => {
    if (['done', 'completed'].includes(String(task?.status ?? ''))) return false
    const dueDate = task?.dueDate ?? task?.due_date
    if (!dueDate) return false
    return String(dueDate) < todayIso
  }).length
  const automationFailureCount = (automationExecutions ?? []).filter(
    (execution: any) => String(execution?.status ?? '') === 'failed'
  ).length
  const activeAutomationRuleCount = (automationRules ?? []).filter((rule: any) =>
    Boolean(rule?.is_active)
  ).length
  const cannabisUpcomingEventCount = (cannabisEvents ?? []).filter((event: any) => {
    const status = String(event?.status ?? '')
    if (['completed', 'cancelled'].includes(status)) return false
    return dateToDateString((event?.event_date ?? '') as Date | string) >= todayIso
  }).length
  const cannabisMissingResponses = Number(cannabisRsvpDashboard?.summary?.missingResponses ?? 0)
  const charityUpcomingEventCount = (charityEvents ?? []).filter((event: any) => {
    const eventDate = dateToDateString((event?.event_date ?? '') as Date | string)
    return eventDate >= todayIso
  }).length
  const communityTemplateDownloads = (communityTemplates ?? []).reduce(
    (sum: number, template: any) => sum + Number(template?.download_count ?? 0),
    0
  )
  const guestUpcomingReservations = (reservations ?? []).filter((reservation: any) => {
    const date = String(reservation?.reservation_date ?? '')
    const status = String(reservation?.status ?? 'confirmed')
    return date >= todayIso && status !== 'cancelled'
  }).length
  const unapprovedReceiptCount = (receipts ?? []).filter(
    (receipt: any) => String(receipt?.uploadStatus ?? receipt?.upload_status ?? '') !== 'approved'
  ).length
  const orphanReceiptCount = (receipts ?? []).filter((receipt: any) => !receipt?.eventId).length
  const socialConnectedAccountCount = (socialConnections ?? []).filter((connection: any) =>
    Boolean(connection?.isConnected)
  ).length
  const socialPendingApprovalCount = (socialPlannerData?.posts ?? []).filter((post: any) =>
    ['idea', 'draft', 'approved'].includes(String(post?.status ?? 'idea'))
  ).length
  const socialUpcomingPosts30d = Number(socialPlannerData?.summary?.next30Days ?? 0)
  const wixPendingSubmissionCount = (wixSubmissions ?? []).filter((submission: any) =>
    ['pending', 'processing'].includes(String(submission?.status ?? ''))
  ).length
  const wixFailedSubmissionCount = (wixSubmissions ?? []).filter(
    (submission: any) => String(submission?.status ?? '') === 'failed'
  ).length
  const wixStaleSubmissionCount = (wixSubmissions ?? []).filter((submission: any) => {
    const createdAt = submission?.created_at
    if (!createdAt) return false
    const ageDays = (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return ageDays > 3 && ['pending', 'failed'].includes(String(submission?.status ?? ''))
  }).length
  const staleIntegrationCount = (integrationOverview?.accounts ?? []).filter((account: any) => {
    if (String(account?.status ?? '') !== 'connected') return false
    if (!account?.lastSyncAt) return true
    const ageDays = (now.getTime() - new Date(account.lastSyncAt).getTime()) / (1000 * 60 * 60 * 24)
    return ageDays > 7
  }).length
  const gmailSyncErrorCount = (gmailSyncHistory ?? []).filter((row: any) =>
    Boolean(row?.error)
  ).length
  const remyPolicyOverrideCount = (remyApprovalPolicies ?? []).filter(
    (policy: any) => policy?.enabled !== false
  ).length

  return {
    activeInquiryCount,
    totalInquiryCount,
    inquiryBudgetRows,
    inquiryBudgetNeedsAttention,
    inquiryBudgetMainGap,
    shouldShowOnboardingAccelerator,
    todaySales,
    todaySalesRevenueCents,
    monthVendorSpendCents,
    activeStaffCount,
    activeEmployeeCount,
    payrollYtdGrossCents,
    activeCampaignCount,
    sentCampaignCount,
    upcomingPushDinnerCount,
    openContractsAndCollectionsCount,
    commTriageEnabled,
    inboxTotalCount,
    inboxNeedsAttentionCount,
    inboxUnlinkedCount,
    activeExternalReviewSourceCount,
    monthlyGoalProgress,
    monthlyGoalGapCents,
    yoyRevenueDelta,
    openMaintenanceCount,
    totalEquipmentRentals,
    totalKitchenRentals,
    kitchenRentalSpendCents,
    draftMenuCount,
    approvedMenuCount,
    recentRecipeCount,
    pendingConnectionRequests,
    openSafetyIncidents,
    criticalSafetyIncidents,
    plannedTravelLegs,
    inProgressTravelLegs,
    consolidatedTravelLegs,
    activeGoalCount,
    avgGoalProgressPercent,
    todayIso,
    upcomingEvents,
    upcomingEventsMissingSnapshots,
    staleDocumentSnapshots,
    expiringInsurancePolicyCount,
    highValueDormantClients,
    pendingSurveyCount,
    recentTestimonialCount,
    pendingTestimonialApprovalCount,
    activePartnerCount,
    inactivePartnerCount,
    partnerReferralEventCount,
    stationActiveCount,
    unresolvedStationTasks,
    stationOpsAttentionCount,
    paymentEntriesInbound,
    paymentEntriesFailedQueue,
    overdueInstallmentCount,
    paymentEntriesInboundTotal,
    latestDailyReportDate,
    reportFreshnessDays,
    reconciliationOpenFlags,
    overdueTaskCount,
    automationFailureCount,
    activeAutomationRuleCount,
    cannabisUpcomingEventCount,
    cannabisMissingResponses,
    charityUpcomingEventCount,
    communityTemplateDownloads,
    guestUpcomingReservations,
    unapprovedReceiptCount,
    orphanReceiptCount,
    socialConnectedAccountCount,
    socialPendingApprovalCount,
    socialUpcomingPosts30d,
    wixPendingSubmissionCount,
    wixFailedSubmissionCount,
    wixStaleSubmissionCount,
    staleIntegrationCount,
    gmailSyncErrorCount,
    remyPolicyOverrideCount,
  }
}
