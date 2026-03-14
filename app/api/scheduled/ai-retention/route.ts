// Scheduled AI retention cleanup
// GET/POST /api/scheduled/ai-retention
//
// Applies per-tenant ai_preferences.data_retention_days to Remy conversations,
// memories, and artifacts. Only tenants with an explicit numeric retention
// preference are cleaned up. Legacy NULL rows are left untouched.

import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { createServerClient } from '@/lib/supabase/server'
import { recordCronError, recordCronHeartbeat } from '@/lib/cron/heartbeat'

const MIN_RETENTION_DAYS = 1
const MAX_RETENTION_DAYS = 3650

function normalizeRetentionDays(value: unknown): number | null {
  const numeric =
    typeof value === 'number' ? value : Number.parseInt(typeof value === 'string' ? value : '', 10)

  if (!Number.isFinite(numeric)) return null
  return Math.max(MIN_RETENTION_DAYS, Math.min(MAX_RETENTION_DAYS, Math.trunc(numeric)))
}

type AiPreferenceRow = {
  tenant_id: string
  data_retention_days: number | string | null
}

async function handleAiRetention(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now()
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase: any = createServerClient({ admin: true })

  try {
    const { data: rawPreferences, error: preferenceError } = await supabase
      .from('ai_preferences')
      .select('tenant_id, data_retention_days')
      .not('data_retention_days', 'is', null)

    if (preferenceError) {
      throw new Error(`Failed to load AI preferences: ${preferenceError.message}`)
    }

    const preferences = ((rawPreferences ?? []) as AiPreferenceRow[])
      .map((row) => ({
        tenantId: row.tenant_id as string,
        retentionDays: normalizeRetentionDays(row.data_retention_days),
      }))
      .filter(
        (row): row is { tenantId: string; retentionDays: number } => row.retentionDays !== null
      )

    const tenantResults: Array<{
      tenantId: string
      retentionDays: number
      cutoff: string
      conversationsDeleted: number
      memoriesDeleted: number
      artifactsDeleted: number
    }> = []

    for (const preference of preferences) {
      const cutoff = new Date(
        Date.now() - preference.retentionDays * 24 * 60 * 60 * 1000
      ).toISOString()

      const [conversationResult, memoryResult, artifactResult] = await Promise.all([
        supabase
          .from('remy_conversations')
          .delete({ count: 'exact' })
          .eq('tenant_id', preference.tenantId)
          .lt('updated_at', cutoff),
        supabase
          .from('remy_memories')
          .delete({ count: 'exact' })
          .eq('tenant_id', preference.tenantId)
          .lt('updated_at', cutoff),
        supabase
          .from('remy_artifacts')
          .delete({ count: 'exact' })
          .eq('tenant_id', preference.tenantId)
          .lt('updated_at', cutoff),
      ])

      if (conversationResult.error) {
        throw new Error(
          `Failed to delete conversations for tenant ${preference.tenantId}: ${conversationResult.error.message}`
        )
      }
      if (memoryResult.error) {
        throw new Error(
          `Failed to delete memories for tenant ${preference.tenantId}: ${memoryResult.error.message}`
        )
      }
      if (artifactResult.error) {
        throw new Error(
          `Failed to delete artifacts for tenant ${preference.tenantId}: ${artifactResult.error.message}`
        )
      }

      tenantResults.push({
        tenantId: preference.tenantId,
        retentionDays: preference.retentionDays,
        cutoff,
        conversationsDeleted: conversationResult.count ?? 0,
        memoriesDeleted: memoryResult.count ?? 0,
        artifactsDeleted: artifactResult.count ?? 0,
      })
    }

    const result = {
      tenantsEvaluated: preferences.length,
      conversationsDeleted: tenantResults.reduce((sum, row) => sum + row.conversationsDeleted, 0),
      memoriesDeleted: tenantResults.reduce((sum, row) => sum + row.memoriesDeleted, 0),
      artifactsDeleted: tenantResults.reduce((sum, row) => sum + row.artifactsDeleted, 0),
      tenants: tenantResults,
    }

    await recordCronHeartbeat('ai-retention', result, Date.now() - startedAt)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown AI retention cleanup error'
    console.error('[ai-retention] cleanup failed:', error)
    await recordCronError('ai-retention', message, Date.now() - startedAt)
    return NextResponse.json({ error: 'AI retention cleanup failed' }, { status: 500 })
  }
}

export { handleAiRetention as GET, handleAiRetention as POST }
