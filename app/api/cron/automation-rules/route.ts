// Automation Rules Cron
// Runs hourly. Iterates all tenants with enabled preset rules and executes them.
// Time-based rules: stale inquiry check, review request check, quote archive check,
// follow-up draft check, ingredient reorder check, calendar block check.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { executePresetRule } from '@/lib/automations/executor'
import type { PresetRuleType } from '@/lib/automations/types'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const start = Date.now()

  try {
    const result = await runMonitoredCronJob('automation-rules', async () => {
      const db = createAdminClient()

      // Fetch all enabled preset rules across all tenants
      const { data: enabledRules, error } = await db
        .from('preset_automation_rules' as any)
        .select('tenant_id, rule_type, config')
        .eq('enabled', true)

      if (error) {
        console.error('[automation-rules] Query failed:', error)
        throw new Error('Failed to query preset rules')
      }

      if (!enabledRules || enabledRules.length === 0) {
        return { processed: 0, triggered: 0, errors: 0, durationMs: Date.now() - start }
      }

      let totalProcessed = 0
      let totalTriggered = 0
      let totalErrors = 0

      for (const row of enabledRules) {
        const rule = row as any
        try {
          const result = await executePresetRule(
            rule.tenant_id,
            rule.rule_type as PresetRuleType,
            (rule.config || {}) as Record<string, number | string | boolean>
          )

          totalProcessed += result.processed
          totalTriggered += result.triggered
          totalErrors += result.errors

          // Update last_triggered_at if something fired
          if (result.triggered > 0) {
            // Fetch current count first, then update (compat layer has no raw SQL increment)
            const { data: current } = await db
              .from('preset_automation_rules' as any)
              .select('total_triggers')
              .eq('tenant_id', rule.tenant_id)
              .eq('rule_type', rule.rule_type)
              .single()

            const currentCount = (current as any)?.total_triggers ?? 0

            await db
              .from('preset_automation_rules' as any)
              .update({
                last_triggered_at: new Date().toISOString(),
                total_triggers: currentCount + result.triggered,
              })
              .eq('tenant_id', rule.tenant_id)
              .eq('rule_type', rule.rule_type)
          }
        } catch (err) {
          totalErrors++
          console.error(
            `[automation-rules] Rule ${rule.rule_type} for tenant ${rule.tenant_id} failed:`,
            err
          )
        }
      }

      return {
        rulesChecked: enabledRules.length,
        processed: totalProcessed,
        triggered: totalTriggered,
        errors: totalErrors,
        durationMs: Date.now() - start,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[automation-rules] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
