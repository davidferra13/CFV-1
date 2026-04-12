import { logChefActivity } from '@/lib/activity/log-chef'
import type { ChefActivityAction } from '@/lib/activity/chef-types'
import { createServerClient } from '@/lib/db/server'

type DeveloperToolsFirstUseKind = 'api_key' | 'raw_webhook' | 'zapier_subscription'

const FIRST_USE_CONFIG: Record<
  DeveloperToolsFirstUseKind,
  {
    table: string
    action: ChefActivityAction
    entityType: string
    summary: string
  }
> = {
  api_key: {
    table: 'chef_api_keys',
    action: 'api_key_created',
    entityType: 'chef_api_key',
    summary: 'Created first developer API key',
  },
  raw_webhook: {
    table: 'webhook_endpoints',
    action: 'webhook_endpoint_created',
    entityType: 'webhook_endpoint',
    summary: 'Created first raw webhook endpoint',
  },
  zapier_subscription: {
    table: 'zapier_webhook_subscriptions',
    action: 'zapier_subscription_created',
    entityType: 'zapier_webhook_subscription',
    summary: 'Created first Zapier webhook subscription',
  },
}

export async function logDeveloperToolsFirstUseIfNeeded(input: {
  tenantId: string
  actorId: string
  kind: DeveloperToolsFirstUseKind
  entityId?: string
  context?: Record<string, unknown>
  db?: ReturnType<typeof createServerClient>
}): Promise<void> {
  const config = FIRST_USE_CONFIG[input.kind]
  const db: any = input.db ?? createServerClient({ admin: true })

  try {
    const { count, error } = await db
      .from(config.table as any)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', input.tenantId)

    if (error || count !== 1) {
      return
    }

    await logChefActivity({
      tenantId: input.tenantId,
      actorId: input.actorId,
      action: config.action,
      domain: 'settings',
      entityType: config.entityType,
      entityId: input.entityId,
      summary: config.summary,
      context: {
        developer_tools: true,
        first_use: true,
        source: input.kind,
        ...(input.context ?? {}),
      },
    })
  } catch (err) {
    console.error('[developer-tools-observability] Failed to log first use:', err)
  }
}
