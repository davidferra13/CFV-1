import type { GodModeResolvedItem, GodModeResolverContext } from './god-mode-types'

export interface ResolverEntry {
  name: string
  resolve: (ctx: GodModeResolverContext) => Promise<GodModeResolvedItem[]>
}

const RESOLVER_TIMEOUT_MS = 8_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

/**
 * Run resolvers in parallel, isolate failures per domain.
 * Failed resolvers log and return empty, never kill the pipeline.
 */
export async function dispatchResolvers(
  resolvers: ResolverEntry[],
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const results = await Promise.allSettled(
    resolvers.map(async (entry) => {
      try {
        return await withTimeout(entry.resolve(ctx), RESOLVER_TIMEOUT_MS, entry.name)
      } catch (err) {
        console.error(`[god-mode-dispatcher] ${entry.name} failed:`, err)
        return []
      }
    })
  )

  const items: GodModeResolvedItem[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      items.push(...result.value)
    }
  }

  return items
}

function hotResolvers(): ResolverEntry[] {
  return [
    {
      name: 'inquiries',
      resolve: async (ctx) => {
        const { resolveInquiries } = await import('./resolvers/chef/inquiry-resolver')
        return resolveInquiries(ctx)
      },
    },
    {
      name: 'messages',
      resolve: async (ctx) => {
        const { resolveMessages } = await import('./resolvers/chef/message-resolver')
        return resolveMessages(ctx)
      },
    },
    {
      name: 'payments',
      resolve: async (ctx) => {
        const { resolvePayments } = await import('./resolvers/chef/payment-resolver')
        return resolvePayments(ctx)
      },
    },
  ]
}

function warmResolvers(): ResolverEntry[] {
  return [
    {
      name: 'handoffs',
      resolve: async (ctx) => {
        const { resolveHandoffs } = await import('./resolvers/chef/handoff-resolver')
        return resolveHandoffs(ctx)
      },
    },
    {
      name: 'waiting',
      resolve: async (ctx) => {
        const { resolveWaitingItems } = await import('./resolvers/chef/waiting-resolver')
        return resolveWaitingItems(ctx)
      },
    },
    {
      name: 'resume',
      resolve: async (ctx) => {
        const { resolveResumeTrails } = await import('./resolvers/chef/resume-resolver')
        return resolveResumeTrails(ctx)
      },
    },
    {
      name: 'events',
      resolve: async (ctx) => {
        const { resolveEvents } = await import('./resolvers/chef/event-resolver')
        return resolveEvents(ctx)
      },
    },
    {
      name: 'quotes',
      resolve: async (ctx) => {
        const { resolveQuotes } = await import('./resolvers/chef/quote-resolver')
        return resolveQuotes(ctx)
      },
    },
    // --- Wave 2: Pipeline/Revenue resolvers ---
    {
      name: 'contracts',
      resolve: async (ctx) => {
        const { resolveContracts } = await import('./resolvers/chef/contract-resolver')
        return resolveContracts(ctx)
      },
    },
    {
      name: 'menu-approvals',
      resolve: async (ctx) => {
        const { resolveMenuApprovals } = await import('./resolvers/chef/menu-approval-resolver')
        return resolveMenuApprovals(ctx)
      },
    },
    {
      name: 'vendor-invoices',
      resolve: async (ctx) => {
        const { resolveVendorInvoices } = await import('./resolvers/chef/vendor-invoice-resolver')
        return resolveVendorInvoices(ctx)
      },
    },
    {
      name: 'recurring-invoices',
      resolve: async (ctx) => {
        const { resolveRecurringInvoices } =
          await import('./resolvers/chef/recurring-invoice-resolver')
        return resolveRecurringInvoices(ctx)
      },
    },
    {
      name: 'revenue-goals',
      resolve: async (ctx) => {
        const { resolveRevenueGoals } = await import('./resolvers/chef/revenue-goal-resolver')
        return resolveRevenueGoals(ctx)
      },
    },
    // --- Wave 2: Communication resolvers ---
    {
      name: 'proposal-activity',
      resolve: async (ctx) => {
        const { resolveProposalActivity } =
          await import('./resolvers/chef/proposal-activity-resolver')
        return resolveProposalActivity(ctx)
      },
    },
    {
      name: 'followups',
      resolve: async (ctx) => {
        const { resolveFollowUps } = await import('./resolvers/chef/followup-resolver')
        return resolveFollowUps(ctx)
      },
    },
    {
      name: 'dormant-clients',
      resolve: async (ctx) => {
        const { resolveDormantClients } = await import('./resolvers/chef/dormant-client-resolver')
        return resolveDormantClients(ctx)
      },
    },
    {
      name: 'client-birthdays',
      resolve: async (ctx) => {
        const { resolveClientBirthdays } = await import('./resolvers/chef/client-birthday-resolver')
        return resolveClientBirthdays(ctx)
      },
    },
    {
      name: 'review-requests',
      resolve: async (ctx) => {
        const { resolveReviewRequests } = await import('./resolvers/chef/review-request-resolver')
        return resolveReviewRequests(ctx)
      },
    },
    // --- Wave 2: Operations/Events resolvers ---
    {
      name: 'prep-status',
      resolve: async (ctx) => {
        const { resolvePrepStatus } = await import('./resolvers/chef/prep-resolver')
        return resolvePrepStatus(ctx)
      },
    },
    {
      name: 'shopping-lists',
      resolve: async (ctx) => {
        const { resolveShoppingLists } = await import('./resolvers/chef/shopping-list-resolver')
        return resolveShoppingLists(ctx)
      },
    },
    {
      name: 'packing-status',
      resolve: async (ctx) => {
        const { resolvePackingStatus } = await import('./resolvers/chef/packing-resolver')
        return resolvePackingStatus(ctx)
      },
    },
    {
      name: 'receipt-capture',
      resolve: async (ctx) => {
        const { resolveReceiptCapture } = await import('./resolvers/chef/receipt-resolver')
        return resolveReceiptCapture(ctx)
      },
    },
    {
      name: 'hours-logging',
      resolve: async (ctx) => {
        const { resolveHoursNotLogged } = await import('./resolvers/chef/hours-resolver')
        return resolveHoursNotLogged(ctx)
      },
    },
    {
      name: 'staff-issues',
      resolve: async (ctx) => {
        const { resolveStaffIssues } = await import('./resolvers/chef/staff-resolver')
        return resolveStaffIssues(ctx)
      },
    },
    // --- Wave 2: Pricing Intelligence (PIE) resolvers ---
    {
      name: 'pie-attention',
      resolve: async (ctx) => {
        const { resolvePieAttention } = await import('@/lib/pricing/pie-attention-resolver')
        return resolvePieAttention(ctx)
      },
    },
    // --- Wave 2: Intelligence/System resolvers ---
    {
      name: 'intelligence-signals',
      resolve: async (ctx) => {
        const { resolveIntelligenceSignals } =
          await import('./resolvers/chef/intelligence-resolver')
        return resolveIntelligenceSignals(ctx)
      },
    },
    {
      name: 'automation-activity',
      resolve: async (ctx) => {
        const { resolveAutomationActivity } = await import('./resolvers/chef/automation-resolver')
        return resolveAutomationActivity(ctx)
      },
    },
    {
      name: 'certifications',
      resolve: async (ctx) => {
        const { resolveCertifications } = await import('./resolvers/chef/certification-resolver')
        return resolveCertifications(ctx)
      },
    },
    {
      name: 'insurance',
      resolve: async (ctx) => {
        const { resolveInsurancePolicies } = await import('./resolvers/chef/insurance-resolver')
        return resolveInsurancePolicies(ctx)
      },
    },
    // --- CIL (Continuous Intelligence Layer) ---
    {
      name: 'cil-signals',
      resolve: async (ctx) => {
        const { resolveCILSignals } = await import('./resolvers/chef/cil-signal-resolver')
        return resolveCILSignals(ctx)
      },
    },
    // --- Communication/Cadence ---
    {
      name: 'scheduled-messages',
      resolve: async (ctx) => {
        const { resolveScheduledMessages } =
          await import('./resolvers/chef/scheduled-message-resolver')
        return resolveScheduledMessages(ctx)
      },
    },
    {
      name: 'communication-feed',
      resolve: async (ctx) => {
        const { resolveCommunicationFeed } =
          await import('./resolvers/chef/communication-feed-resolver')
        return resolveCommunicationFeed(ctx)
      },
    },
    // --- Wave 2: Config/Onboarding resolvers ---
    {
      name: 'onboarding',
      resolve: async (ctx) => {
        const { resolveOnboardingGaps } = await import('./resolvers/chef/onboarding-resolver')
        return resolveOnboardingGaps(ctx)
      },
    },
    // --- Weather risk ---
    {
      name: 'weather-alerts',
      resolve: async (ctx) => {
        const { resolveWeatherAlerts } = await import('./resolvers/chef/weather-resolver')
        return resolveWeatherAlerts(ctx)
      },
    },
    // --- Wave 2: Network/Social resolvers ---
    {
      name: 'network-activity',
      resolve: async (ctx) => {
        const { resolveNetworkActivity } = await import('./resolvers/chef/network-resolver')
        return resolveNetworkActivity(ctx)
      },
    },
    // --- Lifecycle/Journey resolvers ---
    {
      name: 'lifecycle-stages',
      resolve: async (ctx) => {
        const { resolveLifecycleStages } = await import('./resolvers/chef/lifecycle-stage-resolver')
        return resolveLifecycleStages(ctx)
      },
    },
    // --- Cadence/Communication resolvers ---
    {
      name: 'cadence-due',
      resolve: async (ctx) => {
        const { resolveCadenceDueItems } = await import('./resolvers/chef/cadence-due-resolver')
        return resolveCadenceDueItems(ctx)
      },
    },
    // --- Completion resolvers ---
    {
      name: 'completion',
      resolve: async (ctx) => {
        const { resolveCompletionItems } = await import('./resolvers/chef/completion-resolver')
        return resolveCompletionItems(ctx)
      },
    },
    // --- Intelligence analyzer resolvers ---
    {
      name: 'client-risk',
      resolve: async (ctx) => {
        const { resolveClientRisks } = await import('./resolvers/chef/client-risk-resolver')
        return resolveClientRisks(ctx)
      },
    },
    {
      name: 'churn-signals',
      resolve: async (ctx) => {
        const { resolveChurnSignals } = await import('./resolvers/chef/churn-resolver')
        return resolveChurnSignals(ctx)
      },
    },
    {
      name: 'price-anomalies',
      resolve: async (ctx) => {
        const { resolvePriceAnomalies } = await import('./resolvers/chef/price-anomaly-resolver')
        return resolvePriceAnomalies(ctx)
      },
    },
    // --- Wave 3: Cross-domain intelligence resolvers ---
    {
      name: 'dish-fatigue',
      resolve: async (ctx) => {
        const { resolveDishFatigue } = await import('./resolvers/chef/dish-fatigue-resolver')
        return resolveDishFatigue(ctx)
      },
    },
    {
      name: 'weather-cooking',
      resolve: async (ctx) => {
        const { resolveWeatherCookingAdvisories } =
          await import('./resolvers/chef/weather-cooking-resolver')
        return resolveWeatherCookingAdvisories(ctx)
      },
    },
    {
      name: 'quality-drift',
      resolve: async (ctx) => {
        const { resolveQualityDrift } = await import('./resolvers/chef/quality-drift-resolver')
        return resolveQualityDrift(ctx)
      },
    },
    {
      name: 'equipment-conflicts',
      resolve: async (ctx) => {
        const { resolveEquipmentConflicts } =
          await import('./resolvers/chef/equipment-conflict-resolver')
        return resolveEquipmentConflicts(ctx)
      },
    },
    {
      name: 'revenue-opportunities',
      resolve: async (ctx) => {
        const { resolveRevenueOpportunities } =
          await import('./resolvers/chef/revenue-opportunity-resolver')
        return resolveRevenueOpportunities(ctx)
      },
    },
  ]
}

/**
 * Hot resolvers only: inquiries, messages, payments.
 * Used by RailStrip (every page load, must be fast).
 */
export async function dispatchHotResolvers(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  return dispatchResolvers(hotResolvers(), ctx)
}

/**
 * All resolvers: hot + warm.
 * Used by TieredRail (dashboard only).
 */
export async function dispatchAllResolvers(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  return dispatchResolvers([...hotResolvers(), ...warmResolvers()], ctx)
}

/**
 * Named resolver subset for contextual surfaces.
 * Keeps the resolver name on each returned item so downstream rails can group
 * and summarize by the profile's resolverFilter without guessing from IDs.
 */
export async function dispatchFilteredResolvers(
  ctx: GodModeResolverContext,
  nameFilter: readonly string[]
): Promise<GodModeResolvedItem[]> {
  const allowed = new Set(nameFilter)
  if (allowed.size === 0) return dispatchHotResolvers(ctx)

  const resolvers = [...hotResolvers(), ...warmResolvers()].filter((entry) =>
    allowed.has(entry.name)
  )

  const results = await Promise.allSettled(
    resolvers.map(async (entry) => {
      try {
        const items = await withTimeout(entry.resolve(ctx), RESOLVER_TIMEOUT_MS, entry.name)
        return items.map((item) => ({
          ...item,
          data: {
            ...item.data,
            resolverName: entry.name,
          },
        }))
      } catch (err) {
        console.error(`[god-mode-dispatcher] ${entry.name} failed:`, err)
        return []
      }
    })
  )

  const items: GodModeResolvedItem[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') items.push(...result.value)
  }

  return items
}
