import type { GodModeResolvedItem, GodModeResolverContext } from './god-mode-types'

export interface ResolverEntry {
  name: string
  resolve: (ctx: GodModeResolverContext) => Promise<GodModeResolvedItem[]>
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
        return await entry.resolve(ctx)
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
 * Used by RailFull (dashboard only).
 */
export async function dispatchAllResolvers(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  return dispatchResolvers([...hotResolvers(), ...warmResolvers()], ctx)
}
